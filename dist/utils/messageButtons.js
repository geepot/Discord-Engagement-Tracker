"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConfirmationMessage = createConfirmationMessage;
exports.createDeleteButton = createDeleteButton;
exports.createMessageWithDeleteButton = createMessageWithDeleteButton;
exports.createMessageTracker = createMessageTracker;
const discord_js_1 = require("discord.js");
/**
 * Creates a confirmation message with Yes and No buttons
 * @param content The message content
 * @param yesCustomId The custom ID for the Yes button
 * @param noCustomId The custom ID for the No button
 * @returns MessageCreateOptions with content and Yes/No buttons
 */
function createConfirmationMessage(content, yesCustomId = 'confirm_yes', noCustomId = 'confirm_no') {
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(yesCustomId)
        .setLabel('Yes')
        .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
        .setCustomId(noCustomId)
        .setLabel('No')
        .setStyle(discord_js_1.ButtonStyle.Danger));
    return {
        content,
        components: [row]
    };
}
/**
 * Creates a delete button with optional linked message IDs
 * @param relatedMessageIds Array of message IDs that should also be deleted when this button is clicked
 * @returns ActionRowBuilder with a delete button
 */
function createDeleteButton(relatedMessageIds = []) {
    // Create the custom ID with related message IDs
    let customId = 'delete_message';
    if (relatedMessageIds.length > 0) {
        customId += ':' + relatedMessageIds.join(':');
    }
    return new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(customId)
        .setLabel('Delete')
        .setStyle(discord_js_1.ButtonStyle.Danger));
}
/**
 * Creates message options with a delete button
 * @param content The message content
 * @param relatedMessageIds Array of message IDs that should also be deleted when this button is clicked
 * @returns MessageCreateOptions with content and delete button
 */
function createMessageWithDeleteButton(content, relatedMessageIds = []) {
    return {
        content,
        components: [createDeleteButton(relatedMessageIds)]
    };
}
/**
 * Tracks sent messages and returns a function to create a final message with a delete button
 * that will delete all tracked messages
 */
function createMessageTracker() {
    const sentMessageIds = [];
    /**
     * Adds a message ID to the tracker
     * @param messageId The message ID to track
     */
    function trackMessage(messageId) {
        sentMessageIds.push(messageId);
    }
    /**
     * Creates message options with a delete button that will delete all tracked messages
     * @param content The message content
     * @returns MessageCreateOptions with content and delete button
     */
    function createFinalMessageOptions(content) {
        return {
            content,
            components: [createDeleteButton(sentMessageIds)]
        };
    }
    return {
        trackMessage,
        createFinalMessageOptions,
        getTrackedMessageIds: () => [...sentMessageIds]
    };
}
