"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandMessageManager = void 0;
const discord_js_1 = require("discord.js");
/**
 * A utility class to manage messages sent by a command and handle their deletion
 */
class CommandMessageManager {
    /**
     * Create a new CommandMessageManager
     * @param channel The channel where messages will be sent
     */
    constructor(channel) {
        this.messageIds = [];
        this.channel = channel;
    }
    /**
     * Send a message and track its ID
     * @param content The message content
     * @param options Additional message options (components, embeds, etc.)
     * @returns The sent message
     */
    async sendMessage(content, options = {}) {
        const message = await this.channel.send({
            content,
            ...options,
            components: options.components || [] // Ensure components is defined
        });
        this.messageIds.push(message.id);
        return message;
    }
    /**
     * Add a delete button to the last message that will delete all tracked messages
     * @param additionalButtons Optional additional buttons to include (e.g., pagination)
     */
    async addDeleteButtonToLastMessage(additionalButtons = []) {
        if (this.messageIds.length === 0)
            return;
        const lastMessageId = this.messageIds[this.messageIds.length - 1];
        try {
            // Fetch the last message
            const lastMessage = await this.channel.messages.fetch(lastMessageId);
            // Create delete button that deletes all tracked messages
            const deleteButton = new discord_js_1.ButtonBuilder()
                .setCustomId(`delete_message:${this.messageIds.join(':')}`)
                .setLabel('Delete')
                .setStyle(discord_js_1.ButtonStyle.Danger);
            // Create action row with all buttons
            const actionRow = new discord_js_1.ActionRowBuilder()
                .addComponents([...additionalButtons, deleteButton]);
            // Update the last message to include the buttons
            await lastMessage.edit({
                components: [actionRow]
            });
        }
        catch (error) {
            console.error('Error adding delete button to last message:', error);
        }
    }
    /**
     * Get all tracked message IDs
     * @returns Array of message IDs
     */
    getMessageIds() {
        return [...this.messageIds];
    }
    /**
     * Clear the tracked message IDs
     */
    clear() {
        this.messageIds = [];
    }
}
exports.CommandMessageManager = CommandMessageManager;
