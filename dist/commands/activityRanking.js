"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleMostInactive = exports.handleMostActive = void 0;
const discord_js_1 = require("discord.js");
const messageTracker_1 = __importDefault(require("../services/messageTracker"));
const engagementStats_1 = __importDefault(require("../services/engagementStats"));
const formatters_1 = require("../utils/formatters");
const messageButtons_1 = require("../utils/messageButtons");
const messageManager_1 = require("../utils/messageManager");
const config_1 = __importDefault(require("../config"));
class ActivityRankingHandler {
    constructor() {
        this.maxAllowedCount = 100; // Safety limit for large servers
    }
    validateInput(count, page) {
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
    async getChannelStats() {
        // Always use the tracked channel ID from config
        const trackedChannelId = config_1.default.trackedChannelId;
        if (!trackedChannelId)
            return null;
        const members = messageTracker_1.default.getChannelMembers(trackedChannelId);
        if (!members)
            return null;
        return {
            totalMembers: members.size,
            activeMembers: (await engagementStats_1.default.calculateUserStats()).size
        };
    }
    async generateSummaryText(stats, isActive) {
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
    createPaginationButtons(isActive, count, page, totalPages) {
        return [
            new discord_js_1.ButtonBuilder()
                .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
                .setLabel('Previous')
                .setStyle(discord_js_1.ButtonStyle.Primary)
                .setDisabled(page <= 1),
            new discord_js_1.ButtonBuilder()
                .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
                .setLabel('Next')
                .setStyle(discord_js_1.ButtonStyle.Primary)
                .setDisabled(page >= totalPages)
        ];
    }
    async handleActivityRanking(source, isActive = true, initialCount, initialPage) {
        // Determine if this is a message command or button interaction
        const isMessage = source instanceof discord_js_1.Message;
        // Get the channel
        let channel;
        if (isMessage) {
            if (!(source.channel instanceof discord_js_1.TextChannel)) {
                await source.reply('This command can only be used in text channels.');
                return;
            }
            channel = source.channel;
        }
        else {
            if (!(source.channel instanceof discord_js_1.TextChannel)) {
                await source.reply({ content: 'This interaction can only be used in text channels.', ephemeral: true });
                return;
            }
            channel = source.channel;
        }
        try {
            // Check if there are messages being tracked
            if (!messageTracker_1.default.hasMessages()) {
                await channel.send((0, messageButtons_1.createMessageWithDeleteButton)('No messages are currently being tracked.'));
                return;
            }
            // Parse and validate count and page
            let count = initialCount || config_1.default.defaults.activityRankingCount;
            let page = initialPage || 1;
            if (isMessage) {
                const message = source;
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
                await channel.send((0, messageButtons_1.createMessageWithDeleteButton)('Could not fetch channel statistics.'));
                return;
            }
            // Calculate total users for pagination
            const allStats = await engagementStats_1.default.calculateUserStats();
            const totalUsers = Math.min(allStats.size, count); // Limit to requested count
            // Generate rankings for the requested page
            const rankedUsers = await engagementStats_1.default.getActivityRanking(count, isActive, page);
            if (rankedUsers.length === 0) {
                await channel.send((0, messageButtons_1.createMessageWithDeleteButton)('No user activity data available.'));
                return;
            }
            // Format the ranking text
            const formattedRanking = (0, formatters_1.formatActivityRanking)(rankedUsers, count, isActive, page, totalUsers);
            // Calculate total pages for pagination
            const totalPages = Math.ceil(totalUsers / config_1.default.defaults.pageSize);
            // Create pagination buttons
            const paginationButtons = this.createPaginationButtons(isActive, count, page, totalPages);
            // Handle message command vs button interaction
            if (isMessage) {
                // Create a message manager for this command
                const messageManager = new messageManager_1.CommandMessageManager(channel);
                // For message commands, send new messages
                const summaryText = await this.generateSummaryText(stats, isActive);
                // Send summary message without delete button
                const summaryMessage = await messageManager.sendMessage(summaryText);
                // Send ranking message with pagination buttons
                await messageManager.sendMessage(formattedRanking);
                // Add warning if there's a big difference between active and total members
                if (stats.activeMembers < stats.totalMembers * 0.5) {
                    await messageManager.sendMessage('⚠️ **Note:** Less than 50% of members have activity. ' +
                        'Rankings might not represent overall channel engagement.');
                }
                // Create new pagination buttons with the summary message ID included
                const updatedPaginationButtons = [
                    new discord_js_1.ButtonBuilder()
                        .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}:${summaryMessage.id}`)
                        .setLabel('Previous')
                        .setStyle(discord_js_1.ButtonStyle.Primary)
                        .setDisabled(page <= 1),
                    new discord_js_1.ButtonBuilder()
                        .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}:${summaryMessage.id}`)
                        .setLabel('Next')
                        .setStyle(discord_js_1.ButtonStyle.Primary)
                        .setDisabled(page >= totalPages)
                ];
                // Add delete button to the last message that will delete all messages
                await messageManager.addDeleteButtonToLastMessage(updatedPaginationButtons);
            }
            else {
                // For button interactions, update the existing message
                const buttonInteraction = source;
                // Extract the summary message ID from the custom ID
                const customIdParts = buttonInteraction.customId.split(':');
                const summaryMessageId = customIdParts.length > 5 ? customIdParts[5] : null;
                if (summaryMessageId) {
                    // Create new pagination buttons with the summary message ID included
                    const updatedPaginationButtons = [
                        new discord_js_1.ButtonBuilder()
                            .setCustomId(`activity_ranking:prev:${isActive}:${count}:${Math.max(1, page - 1)}:${summaryMessageId}`)
                            .setLabel('Previous')
                            .setStyle(discord_js_1.ButtonStyle.Primary)
                            .setDisabled(page <= 1),
                        new discord_js_1.ButtonBuilder()
                            .setCustomId(`activity_ranking:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}:${summaryMessageId}`)
                            .setLabel('Next')
                            .setStyle(discord_js_1.ButtonStyle.Primary)
                            .setDisabled(page >= totalPages)
                    ];
                    // Create a delete button that will delete both the current message and the summary message
                    const deleteButton = new discord_js_1.ButtonBuilder()
                        .setCustomId(`delete_message:${summaryMessageId}`)
                        .setLabel('Delete')
                        .setStyle(discord_js_1.ButtonStyle.Danger);
                    // Create an action row with the updated buttons
                    const actionRow = new discord_js_1.ActionRowBuilder()
                        .addComponents([...updatedPaginationButtons, deleteButton]);
                    // Update the message with new content and buttons
                    await buttonInteraction.editReply({
                        content: formattedRanking,
                        components: [actionRow]
                    });
                }
                else {
                    // If no summary message ID is found, just use the pagination buttons
                    const actionRow = new discord_js_1.ActionRowBuilder()
                        .addComponents([
                        ...paginationButtons,
                        new discord_js_1.ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(discord_js_1.ButtonStyle.Danger)
                    ]);
                    // Update the message with new content and buttons
                    await buttonInteraction.editReply({
                        content: formattedRanking,
                        components: [actionRow]
                    });
                }
            }
        }
        catch (error) {
            console.error('Error generating activity ranking:', error);
            if (error instanceof Error &&
                (error.message.includes('Please provide') || error.message.includes('Maximum allowed'))) {
                if (isMessage) {
                    await channel.send((0, messageButtons_1.createMessageWithDeleteButton)(error.message));
                }
                else {
                    await source.editReply({
                        content: error.message,
                        components: []
                    });
                }
            }
            else {
                if (isMessage) {
                    await channel.send((0, messageButtons_1.createMessageWithDeleteButton)('An error occurred while generating activity ranking.'));
                }
                else {
                    await source.editReply({
                        content: 'An error occurred while generating activity ranking.',
                        components: []
                    });
                }
            }
        }
    }
}
const handler = new ActivityRankingHandler();
const handleMostActive = (source, count, page) => handler.handleActivityRanking(source, true, count, page);
exports.handleMostActive = handleMostActive;
const handleMostInactive = (source, count, page) => handler.handleActivityRanking(source, false, count, page);
exports.handleMostInactive = handleMostInactive;
