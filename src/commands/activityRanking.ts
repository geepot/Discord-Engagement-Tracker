import { 
    Message, 
    TextChannel, 
    ButtonInteraction, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder,
    SlashCommandBuilder,
    ChatInputCommandInteraction
} from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatActivityRanking } from '../utils/formatters';
import { createMessageWithDeleteButton } from '../utils/messageButtons';
import { CommandMessageManager } from '../utils/messageManager';
import config from '../config';
import database from '../services/database';
import { registerCommand } from '../utils/slashCommands';

// Define the slash commands
const mostActiveCommand = new SlashCommandBuilder()
    .setName('most-active')
    .setDescription('Show the most active users in the tracked channel')
    .addIntegerOption(option => 
        option
            .setName('count')
            .setDescription('Number of users to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
    )
    .addIntegerOption(option => 
        option
            .setName('page')
            .setDescription('Page number (default: 1)')
            .setRequired(false)
            .setMinValue(1)
    );

const mostInactiveCommand = new SlashCommandBuilder()
    .setName('most-inactive')
    .setDescription('Show the least active users in the tracked channel')
    .addIntegerOption(option => 
        option
            .setName('count')
            .setDescription('Number of users to show (default: 10)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
    )
    .addIntegerOption(option => 
        option
            .setName('page')
            .setDescription('Page number (default: 1)')
            .setRequired(false)
            .setMinValue(1)
    );

// Register the slash commands
registerCommand({
    data: mostActiveCommand,
    execute: async (interaction) => {
        const count = interaction.options.getInteger('count') || config.defaults.activityRankingCount;
        const page = interaction.options.getInteger('page') || 1;
        await handler.handleActivityRanking(interaction, true, count, page);
    }
});

registerCommand({
    data: mostInactiveCommand,
    execute: async (interaction) => {
        const count = interaction.options.getInteger('count') || config.defaults.activityRankingCount;
        const page = interaction.options.getInteger('page') || 1;
        await handler.handleActivityRanking(interaction, false, count, page);
    }
});

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
        source: Message | ButtonInteraction | ChatInputCommandInteraction, 
        isActive = true,
        initialCount?: number,
        initialPage?: number
    ): Promise<void> {
        // Determine the type of source
        const isMessage = source instanceof Message;
        const isButtonInteraction = source instanceof ButtonInteraction;
        const isSlashCommand = source instanceof ChatInputCommandInteraction;
        
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
                if (isSlashCommand) {
                    await (source as ChatInputCommandInteraction).reply({
                        content: 'No messages are currently being tracked.',
                        ephemeral: true
                    });
                } else if (isButtonInteraction) {
                    await (source as ButtonInteraction).update({
                        content: 'No messages are currently being tracked.',
                        components: []
                    });
                } else {
                    await channel.send(
                        createMessageWithDeleteButton('No messages are currently being tracked.')
                    );
                }
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
                if (isSlashCommand) {
                    await (source as ChatInputCommandInteraction).reply({
                        content: 'Could not fetch channel statistics.',
                        ephemeral: true
                    });
                } else if (isButtonInteraction) {
                    await (source as ButtonInteraction).update({
                        content: 'Could not fetch channel statistics.',
                        components: []
                    });
                } else {
                    await channel.send(
                        createMessageWithDeleteButton('Could not fetch channel statistics.')
                    );
                }
                return;
            }

            // Calculate total users for pagination
            const allStats = await engagementStats.calculateUserStats();
            const totalUsers = Math.min(allStats.size, count); // Limit to requested count
            
            // Generate rankings for the requested page
            const rankedUsers = await engagementStats.getActivityRanking(count, isActive, page);
            if (rankedUsers.length === 0) {
                if (isSlashCommand) {
                    await (source as ChatInputCommandInteraction).reply({
                        content: 'No user activity data available.',
                        ephemeral: true
                    });
                } else if (isButtonInteraction) {
                    await (source as ButtonInteraction).update({
                        content: 'No user activity data available.',
                        components: []
                    });
                } else {
                    await channel.send(
                        createMessageWithDeleteButton('No user activity data available.')
                    );
                }
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
            
            // Handle different source types
            if (isSlashCommand) {
                // For slash commands, defer the reply first
                const interaction = source as ChatInputCommandInteraction;
                await interaction.deferReply();
                
                // Generate summary text
                const summaryText = await this.generateSummaryText(stats, isActive);
                
                // Send summary message
                const summaryMessage = await channel.send(summaryText);
                
                // Create new pagination buttons with the summary message ID included
                const updatedPaginationButtons = [
                    new ButtonBuilder()
                        .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}:${summaryMessage.id}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}:${summaryMessage.id}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages)
                ];
                
                // Create a delete button that will delete both the current message and the summary message
                const deleteButton = new ButtonBuilder()
                    .setCustomId(`delete_message:${summaryMessage.id}`)
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger);
                
                // Create an action row with the updated buttons
                const actionRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents([...updatedPaginationButtons, deleteButton]);
                
                // Send the ranking message with pagination buttons
                await interaction.editReply({
                    content: formattedRanking,
                    components: [actionRow]
                });
                
                // Add warning if there's a big difference between active and total members
                if (stats.activeMembers < stats.totalMembers * 0.5) {
                    await channel.send(
                        '⚠️ **Note:** Less than 50% of members have activity. ' +
                        'Rankings might not represent overall channel engagement.'
                    );
                }
            } else if (isButtonInteraction) {
                // For button interactions, update the existing message
                const buttonInteraction = source as ButtonInteraction;
                
                // Extract the summary message ID from the custom ID
                const customIdParts = buttonInteraction.customId.split(':');
                const summaryMessageId = customIdParts.length > 5 ? customIdParts[5] : null;
                
                if (summaryMessageId) {
                    // Create new pagination buttons with the summary message ID included
                    const updatedPaginationButtons = [
                        new ButtonBuilder()
                            .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}:${summaryMessageId}`)
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page <= 1),
                        new ButtonBuilder()
                            .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}:${summaryMessageId}`)
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page >= totalPages)
                    ];
                    
                    // Create a delete button that will delete both the current message and the summary message
                    const deleteButton = new ButtonBuilder()
                        .setCustomId(`delete_message:${summaryMessageId}`)
                        .setLabel('Delete')
                        .setStyle(ButtonStyle.Danger);
                    
                    // Create an action row with the updated buttons
                    const actionRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents([...updatedPaginationButtons, deleteButton]);
                    
                    // Update the message with new content and buttons
                    await buttonInteraction.update({
                        content: formattedRanking,
                        components: [actionRow]
                    });
                } else {
                    // If no summary message ID is found, just use the pagination buttons
                    const actionRow = new ActionRowBuilder<ButtonBuilder>()
                        .addComponents([
                            ...paginationButtons,
                            new ButtonBuilder()
                                .setCustomId('delete_message')
                                .setLabel('Delete')
                                .setStyle(ButtonStyle.Danger)
                        ]);
                    
                    // Update the message with new content and buttons
                    await buttonInteraction.update({
                        content: formattedRanking,
                        components: [actionRow]
                    });
                }
            } else {
                // For message commands, send new messages
                // Create a message manager for this command
                const messageManager = new CommandMessageManager(channel);
                
                // Generate summary text
                const summaryText = await this.generateSummaryText(stats, isActive);
                
                // Send summary message without delete button
                const summaryMessage = await messageManager.sendMessage(summaryText);
                
                // Send ranking message with pagination buttons
                await messageManager.sendMessage(formattedRanking);
                
                // Add warning if there's a big difference between active and total members
                if (stats.activeMembers < stats.totalMembers * 0.5) {
                    await messageManager.sendMessage(
                        '⚠️ **Note:** Less than 50% of members have activity. ' +
                        'Rankings might not represent overall channel engagement.'
                    );
                }
                
                // Create new pagination buttons with the summary message ID included
                const updatedPaginationButtons = [
                    new ButtonBuilder()
                        .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}:${summaryMessage.id}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}:${summaryMessage.id}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page >= totalPages)
                ];
                
                // Add delete button to the last message that will delete all messages
                await messageManager.addDeleteButtonToLastMessage(updatedPaginationButtons);
            }
        } catch (error) {
            console.error('Error generating activity ranking:', error);
            
            const errorMessage = error instanceof Error && 
                (error.message.includes('Please provide') || error.message.includes('Maximum allowed'))
                ? error.message
                : 'An error occurred while generating activity ranking.';
            
            if (isSlashCommand) {
                const interaction = source as ChatInputCommandInteraction;
                if (interaction.deferred) {
                    await interaction.editReply({
                        content: errorMessage,
                        components: []
                    });
                } else {
                    await interaction.reply({
                        content: errorMessage,
                        ephemeral: true
                    });
                }
            } else if (isButtonInteraction) {
                await (source as ButtonInteraction).update({
                    content: errorMessage,
                    components: []
                });
            } else {
                await channel.send(
                    createMessageWithDeleteButton(errorMessage)
                );
            }
        }
    }
}

const handler = new ActivityRankingHandler();

// For backward compatibility with any code that might still use the old functions
export const handleMostActive = (
    source: Message | ButtonInteraction | ChatInputCommandInteraction,
    count?: number,
    page?: number
) => handler.handleActivityRanking(source, true, count, page);

export const handleMostInactive = (
    source: Message | ButtonInteraction | ChatInputCommandInteraction,
    count?: number,
    page?: number
) => handler.handleActivityRanking(source, false, count, page);
