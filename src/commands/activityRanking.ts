import { Message, TextChannel, ButtonInteraction, ButtonBuilder, ButtonStyle } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatActivityRanking } from '../utils/formatters';
import { createMessageWithDeleteButton } from '../utils/messageButtons';
import { CommandMessageManager } from '../utils/messageManager';
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

    private async getChannelStats() {
        // Always use the tracked channel ID from config
        const trackedChannelId = config.trackedChannelId;
        if (!trackedChannelId) return null;
        
        const members = messageTracker.getChannelMembers(trackedChannelId);
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

    /**
     * Create pagination buttons for activity ranking
     */
    private createPaginationButtons(isActive: boolean, count: number, page: number, totalPages: number): ButtonBuilder[] {
        return [
            new ButtonBuilder()
                .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages)
        ];
    }

    public async handleActivityRanking(
        source: Message | ButtonInteraction, 
        isActive = true,
        initialCount?: number,
        initialPage?: number
    ): Promise<void> {
        // Determine if this is a message command or button interaction
        const isMessage = source instanceof Message;
        
        // Get the channel
        let channel: TextChannel;
        if (isMessage) {
            if (!(source.channel instanceof TextChannel)) {
                await source.reply('This command can only be used in text channels.');
                return;
            }
            channel = source.channel;
        } else {
            if (!(source.channel instanceof TextChannel)) {
                await source.reply({ content: 'This interaction can only be used in text channels.', ephemeral: true });
                return;
            }
            channel = source.channel;
        }

        try {
            // Check if there are messages being tracked
            if (!messageTracker.hasMessages()) {
                await channel.send(
                    createMessageWithDeleteButton('No messages are currently being tracked.')
                );
                return;
            }

            // Parse and validate count and page
            let count = initialCount || config.defaults.activityRankingCount;
            let page = initialPage || 1;
            
            if (isMessage) {
                const message = source as Message;
                const args = message.content.split(' ');
                
                if (args[1]) {
                    count = parseInt(args[1]);
                }
                
                if (args[2]) {
                    page = parseInt(args[2]);
                }
            }
            
            this.validateInput(count, page);

            // Get channel statistics
            const stats = await this.getChannelStats();
            if (!stats) {
                await channel.send(
                    createMessageWithDeleteButton('Could not fetch channel statistics.')
                );
                return;
            }

            // Calculate total users for pagination
            const allStats = await engagementStats.calculateUserStats();
            const totalUsers = Math.min(allStats.size, count); // Limit to requested count
            
            // Generate rankings for the requested page
            const rankedUsers = await engagementStats.getActivityRanking(count, isActive, page);
            if (rankedUsers.length === 0) {
                await channel.send(
                    createMessageWithDeleteButton('No user activity data available.')
                );
                return;
            }

            // Format the ranking text
            const formattedRanking = formatActivityRanking(
                rankedUsers, 
                count, 
                isActive, 
                page, 
                totalUsers
            );
            
            // Calculate total pages for pagination
            const totalPages = Math.ceil(totalUsers / config.defaults.pageSize);
            
            // Create pagination buttons
            const paginationButtons = this.createPaginationButtons(isActive, count, page, totalPages);
            
            // Send or update the message based on the source
            if (isMessage) {
                // Create a message manager for this command
                const messageManager = new CommandMessageManager(channel);
                
                // For message commands, send new messages
                const summaryText = await this.generateSummaryText(stats, isActive);
                
                // Send summary message without delete button
                await messageManager.sendMessage(summaryText);
                
                // Send ranking message with pagination buttons
                await messageManager.sendMessage(formattedRanking);
                
                // Add warning if there's a big difference between active and total members
                if (stats.activeMembers < stats.totalMembers * 0.5) {
                    await messageManager.sendMessage(
                        '⚠️ **Note:** Less than 50% of members have activity. ' +
                        'Rankings might not represent overall channel engagement.'
                    );
                }
                
                // Add delete button to the last message that will delete all messages
                await messageManager.addDeleteButtonToLastMessage(paginationButtons);
            } else {
                // For button interactions, update the existing message
                const buttonInteraction = source as ButtonInteraction;
                
                // Create pagination buttons with delete button
                const buttons = [...paginationButtons, 
                    new ButtonBuilder()
                        .setCustomId('delete_message')
                        .setLabel('Delete')
                        .setStyle(ButtonStyle.Danger)
                ];
                
                // Update the message with new content and buttons
                await buttonInteraction.editReply({
                    content: formattedRanking,
                    components: [
                        {
                            type: 1,
                            components: buttons.map(button => button.toJSON())
                        }
                    ]
                });
            }
        } catch (error) {
            console.error('Error generating activity ranking:', error);
            
            if (error instanceof Error && 
                (error.message.includes('Please provide') || error.message.includes('Maximum allowed'))) {
                
                if (isMessage) {
                    await channel.send(
                        createMessageWithDeleteButton(error.message)
                    );
                } else {
                    await (source as ButtonInteraction).editReply({
                        content: error.message,
                        components: []
                    });
                }
            } else {
                if (isMessage) {
                    await channel.send(
                        createMessageWithDeleteButton('An error occurred while generating activity ranking.')
                    );
                } else {
                    await (source as ButtonInteraction).editReply({
                        content: 'An error occurred while generating activity ranking.',
                        components: []
                    });
                }
            }
        }
    }
}

const handler = new ActivityRankingHandler();

export const handleMostActive = (
    source: Message | ButtonInteraction,
    count?: number,
    page?: number
) => handler.handleActivityRanking(source, true, count, page);

export const handleMostInactive = (
    source: Message | ButtonInteraction,
    count?: number,
    page?: number
) => handler.handleActivityRanking(source, false, count, page);
