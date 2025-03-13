import { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageCreateOptions, InteractionCollector, ButtonInteraction } from 'discord.js';

/**
 * Creates a confirmation message with Yes and No buttons
 * @param content The message content
 * @param yesCustomId The custom ID for the Yes button
 * @param noCustomId The custom ID for the No button
 * @returns MessageCreateOptions with content and Yes/No buttons
 */
export function createConfirmationMessage(
    content: string,
    yesCustomId: string = 'confirm_yes',
    noCustomId: string = 'confirm_no'
): MessageCreateOptions {
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(yesCustomId)
                .setLabel('Yes')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(noCustomId)
                .setLabel('No')
                .setStyle(ButtonStyle.Danger)
        );

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
export function createDeleteButton(relatedMessageIds: string[] = []): ActionRowBuilder<ButtonBuilder> {
    // Create the custom ID with related message IDs
    let customId = 'delete_message';
    if (relatedMessageIds.length > 0) {
        customId += ':' + relatedMessageIds.join(':');
    }
    
    return new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(customId)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
        );
}

/**
 * Creates message options with a delete button
 * @param content The message content
 * @param relatedMessageIds Array of message IDs that should also be deleted when this button is clicked
 * @returns MessageCreateOptions with content and delete button
 */
export function createMessageWithDeleteButton(
    content: string,
    relatedMessageIds: string[] = []
): MessageCreateOptions {
    return {
        content,
        components: [createDeleteButton(relatedMessageIds)]
    };
}

/**
 * Tracks sent messages and returns a function to create a final message with a delete button
 * that will delete all tracked messages
 */
export function createMessageTracker() {
    const sentMessageIds: string[] = [];
    
    /**
     * Adds a message ID to the tracker
     * @param messageId The message ID to track
     */
    function trackMessage(messageId: string) {
        sentMessageIds.push(messageId);
    }
    
    /**
     * Creates message options with a delete button that will delete all tracked messages
     * @param content The message content
     * @returns MessageCreateOptions with content and delete button
     */
    function createFinalMessageOptions(content: string): MessageCreateOptions {
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
