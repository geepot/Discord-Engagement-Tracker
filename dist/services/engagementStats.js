"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const messageTracker_1 = __importDefault(require("./messageTracker"));
const config_1 = __importDefault(require("../config"));
class EngagementStats {
    constructor() {
        // Metrics are now loaded from config
    }
    // Generate summary for a specific message
    async generateMessageSummary(messageId) {
        const data = messageTracker_1.default.getMessage(messageId);
        if (!data)
            return null;
        const channelMembersList = messageTracker_1.default.getChannelMembers(data.channelId);
        if (!channelMembersList)
            return null;
        const unreadMembers = new Set(Array.from(channelMembersList.keys())
            .filter(memberId => !data.readBy.has(memberId)));
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
    // Calculate detailed user activity statistics
    async calculateUserStats() {
        try {
            const userStats = new Map();
            const messages = messageTracker_1.default.getAllMessages();
            const totalMessages = messages.length;
            // Initialize stats for all members
            for (const [channelId, memberList] of messageTracker_1.default.getState().channelMembers) {
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
                const earlyReaderPercentage = config_1.default.engagement.metrics.earlyReaderPercentage / 100;
                const earlyReaderThreshold = Math.max(1, Math.floor(readBySize * earlyReaderPercentage));
                let readCount = 0;
                // Process read status and early reader bonus
                for (const userId of messageData.readBy) {
                    if (userStats.has(userId)) {
                        const userStat = userStats.get(userId);
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
                            const userStat = userStats.get(userId);
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
        }
        catch (error) {
            console.error('Error calculating user stats:', error);
            throw new Error('Failed to calculate user statistics');
        }
    }
    // Calculate activity score with weighted metrics
    calculateActivityScore(stats, totalMessages) {
        const metrics = config_1.default.engagement.metrics;
        const readScore = stats.readCount * metrics.readWeight;
        const earlyReaderScore = stats.firstReadCount * metrics.firstReadBonus;
        // Normalize scores based on total messages
        const normalizedScore = totalMessages > 0 ?
            (readScore + earlyReaderScore) / totalMessages : 0;
        return Math.round(normalizedScore * 100) / 100; // Round to 2 decimal places
    }
    // Get sorted user activity rankings with detailed stats
    async getActivityRanking(count = config_1.default.defaults.activityRankingCount, mostActive = true, page = 1) {
        try {
            const userStats = await this.calculateUserStats();
            if (!userStats || userStats.size === 0) {
                throw new Error('No user statistics available');
            }
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
            // Limit to requested count first
            const limitedUsers = sortedUsers.slice(0, count);
            // Calculate valid page number based on limited users
            const totalPages = Math.ceil(limitedUsers.length / config_1.default.defaults.pageSize);
            const validPage = Math.max(1, Math.min(page, totalPages));
            // Apply pagination to limited users
            return limitedUsers.slice((validPage - 1) * config_1.default.defaults.pageSize, validPage * config_1.default.defaults.pageSize);
        }
        catch (error) {
            console.error('Error generating activity ranking:', error);
            throw new Error('Failed to generate activity rankings');
        }
    }
    // Get user details for a specific message
    async getUserDetailsForMessage(messageId) {
        const data = messageTracker_1.default.getMessage(messageId);
        if (!data)
            return null;
        const channelMembersList = messageTracker_1.default.getChannelMembers(data.channelId);
        if (!channelMembersList)
            return null;
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
            }
            else {
                unreadUsers.push({
                    name: member.user.username
                });
            }
        }
        return { readUsers, unreadUsers };
    }
}
// Export a singleton instance
exports.default = new EngagementStats();
