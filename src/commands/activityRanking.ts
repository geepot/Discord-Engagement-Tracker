import { Message, TextChannel } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatActivityRanking, sendLongMessage } from '../utils/formatters';
import config from '../config';
import database from '../services/database';

class ActivityRankingHandler {
    private readonly maxAllowedCount: number = 100; // Safety limit for large servers

    private validateInput(count: number, page: number): void {
        if (isNaN(count) || count < 1) {
            throw new Error('Please provide a valid count greater than 0.');
        }
        if (count > this.maxAllowedCount) {
            throw new Error(`Maximum allowed count is ${this.maxAllowedCount}.`);
        }
        if (isNaN(page) || page < 1) {
            throw new Error('Please provide a valid page number greater than 0.');
        }
    }

    private async getChannelStats(channelId: string) {
        const members = messageTracker.getChannelMembers(channelId);
        if (!members) return null;

        return {
            totalMembers: members.size,
            activeMembers: (await engagementStats.calculateUserStats()).size
        };
    }

    private async generateSummaryText(stats: { totalMembers: number; activeMembers: number }, isActive: boolean): Promise<string> {
        const type = isActive ? 'active' : 'inactive';
        let text = '**Channel Statistics**\n';
        text += `Total Members: ${stats.totalMembers}\n`;
        text += `Members with Activity: ${stats.activeMembers}\n`;
        text += `Showing ${type} users based on:\n`;
        text += '- Number of messages read\n';
        text += '- Total reactions given\n';
        text += '- Combined activity score\n\n';
        return text;
    }


    public async handleActivityRanking(message: Message, isActive = true): Promise<void> {
        // Ensure we're in a text channel
        if (!(message.channel instanceof TextChannel)) {
            await message.reply('This command can only be used in text channels.');
            return;
        }


        const channel = message.channel;

        try {
            // Check if there are messages being tracked
            if (!messageTracker.hasMessages()) {
                await channel.send('No messages are currently being tracked.');
                return;
            }

            // Parse and validate count and page
            const args = message.content.split(' ');
            let count = config.defaults.activityRankingCount;
            let page = 1;

            if (args[1]) {
                count = parseInt(args[1]);
            }
            
            if (args[2]) {
                page = parseInt(args[2]);
            }
            
            this.validateInput(count, page);

            // Get channel statistics
            const stats = await this.getChannelStats(channel.id);
            if (!stats) {
                await channel.send('Could not fetch channel statistics.');
                return;
            }

            // Calculate total users for pagination
            const allStats = await engagementStats.calculateUserStats();
            const totalUsers = allStats.size;
            
            // Generate rankings for the requested page
            const rankedUsers = await engagementStats.getActivityRanking(count, isActive, page);
            if (rankedUsers.length === 0) {
                await channel.send('No user activity data available.');
                return;
            }

            // Send summary and rankings
            const summaryText = await this.generateSummaryText(stats, isActive);
            await channel.send(summaryText);

            const formattedRanking = formatActivityRanking(
                rankedUsers, 
                count, 
                isActive, 
                page, 
                totalUsers
            );
            await sendLongMessage(channel, formattedRanking);

            // Add warning if there's a big difference between active and total members
            if (stats.activeMembers < stats.totalMembers * 0.5) {
                await channel.send(
                    '⚠️ **Note:** Less than 50% of members have activity. ' +
                    'Rankings might not represent overall channel engagement.'
                );
            }

        } catch (error) {
            if (error instanceof Error && 
                (error.message.includes('Please provide') || error.message.includes('Maximum allowed'))) {
                await channel.send(error.message);
            } else {
                console.error('Error generating activity ranking:', error);
                await channel.send('An error occurred while generating activity ranking.');
            }
        }
    }
}

const handler = new ActivityRankingHandler();

export const handleMostActive = (message: Message) => handler.handleActivityRanking(message, true);
export const handleMostInactive = (message: Message) => handler.handleActivityRanking(message, false);
