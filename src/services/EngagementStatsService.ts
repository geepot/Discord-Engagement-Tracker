import { AbstractBaseService } from './BaseService';
import ServiceRegistry from './ServiceRegistry';
import config from '../config';
import { 
    UserStats, 
    ActivityRankingResult, 
    MessageSummary, 
    UserMessageDetails
} from '../types';

/**
 * Service for calculating engagement statistics
 * Provides methods for generating message summaries and user activity rankings
 */
export class EngagementStatsService extends AbstractBaseService {
    /**
     * Initialize the service
     * This method is called when the service is registered with the container
     */
    public async initialize(): Promise<void> {
        console.log('EngagementStatsService initialized');
    }

    /**
     * Shutdown the service
     * This method is called when the application is shutting down
     */
    public async shutdown(): Promise<void> {
        console.log('EngagementStatsService shutdown');
    }

    /**
     * Generate summary for a specific message
     * @param messageId The message ID
     * @returns The message summary or null if not found
     */
    public async generateMessageSummary(messageId: string): Promise<MessageSummary | null> {
        const messageTracker = ServiceRegistry.getMessageTrackerService();
        const data = messageTracker.getMessage(messageId);
        if (!data) return null;

        const channelMembersList = messageTracker.getChannelMembers(data.channelId);
        if (!channelMembersList) return null;

        const unreadMembers = new Set(
            Array.from(channelMembersList.keys())
                .filter(memberId => !data.readBy.has(memberId))
        );

        return {
            messageId: data.messageId,
            totalMembers: data.totalMembers,
            readCount: data.readBy.size,
            unreadCount: unreadMembers.size,
            reactions: Array.from(data.reactions.entries()).map(([emoji, users]) => ({
                emoji,
                count: users.size
            }))
        };
    }

    /**
     * Calculate detailed user activity statistics
     * @returns Map of user IDs to user statistics
     */
    public async calculateUserStats(): Promise<Map<string, UserStats>> {
        try {
            const messageTracker = ServiceRegistry.getMessageTrackerService();
            const userStats = new Map<string, UserStats>();
            const messages = messageTracker.getAllMessages();
            const totalMessages = messages.length;

            // Initialize stats for all members
            for (const [channelId, memberList] of messageTracker.getState().channelMembers) {
                for (const [memberId, member] of memberList) {
                    if (!userStats.has(memberId)) {
                        userStats.set(memberId, {
                            username: member.user.username,
                            readCount: 0,
                            totalReactions: 0,
                            firstReadCount: 0,
                            lastActive: 0,
                            activityScore: 0
                        });
                    }
                }
            }

            // Process each message
            for (const messageData of messages) {
                const readBySize = messageData.readBy.size;
                const earlyReaderPercentage = config.engagement.metrics.earlyReaderPercentage / 100;
                const earlyReaderThreshold = Math.max(1, Math.floor(readBySize * earlyReaderPercentage));
                let readCount = 0;

                // Process read status and early reader bonus
                for (const userId of messageData.readBy) {
                    if (userStats.has(userId)) {
                        const userStat = userStats.get(userId)!;
                        userStat.readCount++;
                        userStat.lastActive = Math.max(userStat.lastActive, messageData.timestamp);

                        // Award early reader bonus
                        if (readCount < earlyReaderThreshold) {
                            userStat.firstReadCount++;
                        }
                        readCount++;
                    }
                }

                // Process reactions
                for (const [_, users] of messageData.reactions) {
                    for (const userId of users) {
                        if (userStats.has(userId)) {
                            const userStat = userStats.get(userId)!;
                            userStat.totalReactions++;
                            userStat.lastActive = Math.max(userStat.lastActive, messageData.timestamp);
                        }
                    }
                }
            }

            // Calculate final activity scores
            for (const [_, stats] of userStats) {
                stats.activityScore = this.calculateActivityScore(stats, totalMessages);
            }

            return userStats;
        } catch (error) {
            console.error('Error calculating user stats:', error);
            throw new Error('Failed to calculate user statistics');
        }
    }

    /**
     * Calculate activity score with weighted metrics
     * @param stats The user statistics
     * @param totalMessages The total number of messages
     * @returns The activity score
     */
    private calculateActivityScore(stats: UserStats, totalMessages: number): number {
        const metrics = config.engagement.metrics;
        const readScore = stats.readCount * metrics.readWeight;
        const earlyReaderScore = stats.firstReadCount * metrics.firstReadBonus;
        
        // Normalize scores based on total messages
        const normalizedScore = totalMessages > 0 ? 
            (readScore + earlyReaderScore) / totalMessages : 0;
        
        return Math.round(normalizedScore * 100) / 100; // Round to 2 decimal places
    }

    /**
     * Get sorted user activity rankings with detailed stats
     * @param count The number of users to include
     * @param mostActive Whether to sort by most active (true) or least active (false)
     * @param page The page number
     * @returns Array of activity ranking results
     */
    public async getActivityRanking(count = config.defaults.activityRankingCount, mostActive = true, page = 1): Promise<ActivityRankingResult[]> {
        try {
            const userStats = await this.calculateUserStats();
            if (!userStats || userStats.size === 0) {
                throw new Error('No user statistics available');
            }

            // Sort all users by activity score
            const sortedUsers = Array.from(userStats.entries())
                .map(([userId, stats]) => ({
                    userId,
                    username: stats.username,
                    readCount: stats.readCount,
                    totalReactions: stats.totalReactions,
                    firstReadCount: stats.firstReadCount,
                    lastActive: stats.lastActive,
                    activityScore: stats.activityScore
                }))
                .sort((a, b) => mostActive ? 
                    b.activityScore - a.activityScore : 
                    a.activityScore - b.activityScore);
            
            // Limit to requested count
            const limitedUsers = sortedUsers.slice(0, count);
            
            // Calculate the page size and total pages
            const pageSize = config.defaults.pageSize;
            const totalPages = Math.ceil(limitedUsers.length / pageSize);
            
            // Ensure the page number is valid
            const validPage = Math.max(1, Math.min(page, totalPages));
            
            // Calculate the start and end indices for the requested page
            const startIndex = (validPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, limitedUsers.length);
            
            // Return the users for the requested page
            return limitedUsers.slice(startIndex, endIndex);
        } catch (error) {
            console.error('Error generating activity ranking:', error);
            throw new Error('Failed to generate activity rankings');
        }
    }

    /**
     * Get user details for a specific message
     * @param messageId The message ID
     * @returns The user message details or null if not found
     */
    public async getUserDetailsForMessage(messageId: string): Promise<UserMessageDetails | null> {
        const messageTracker = ServiceRegistry.getMessageTrackerService();
        const data = messageTracker.getMessage(messageId);
        if (!data) return null;

        const channelMembersList = messageTracker.getChannelMembers(data.channelId);
        if (!channelMembersList) return null;

        const readUsers = [];
        const unreadUsers = [];

        for (const [memberId, member] of channelMembersList) {
            if (data.readBy.has(memberId)) {
                readUsers.push({
                    name: member.user.username,
                    reactions: Array.from(data.reactions.entries())
                        .filter(([_, users]) => users.has(memberId))
                        .map(([emoji]) => emoji)
                        .join(', ')
                });
            } else {
                unreadUsers.push({
                    name: member.user.username
                });
            }
        }

        return { readUsers, unreadUsers };
    }
}

export default EngagementStatsService;
