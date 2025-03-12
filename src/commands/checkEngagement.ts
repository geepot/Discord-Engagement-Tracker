import { Message, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatMessageSummary, sendLongMessage } from '../utils/formatters';

// Helper function to create a delete button
function createDeleteButton(relatedMessageIds: string[] = []): ActionRowBuilder<ButtonBuilder> {
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

async function handleCheckEngagement(message: Message, messageId?: string): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }

    const channel = message.channel;

    try {
        if (messageId) {
            // Check specific message
            const data = messageTracker.getMessage(messageId);
            if (!data) {
                await channel.send({
                    content: 'Message not found or not being tracked.',
                    components: [createDeleteButton()]
                });
                return;
            }

            const summary = await engagementStats.generateMessageSummary(messageId);
            const userDetails = await engagementStats.getUserDetailsForMessage(messageId);
            
            if (summary && userDetails) {
                const formattedSummary = formatMessageSummary(summary, userDetails);
                await sendLongMessage(channel, formattedSummary);
            } else {
                await channel.send({
                    content: 'Could not generate summary for this message.',
                    components: [createDeleteButton()]
                });
            }
        } else {
            // Check all tracked messages
            const trackedMessages = messageTracker.getAllMessages();
            
            if (trackedMessages.length === 0) {
                await channel.send({
                    content: 'No messages are currently being tracked.',
                    components: [createDeleteButton()]
                });
                return;
            }
            
            // Warn if there are many messages
            if (trackedMessages.length > 5) {
                await channel.send({
                    content: `⚠️ Generating summaries for ${trackedMessages.length} messages. This may take a moment...`,
                    components: [createDeleteButton()]
                });
            }

            let processedCount = 0;
            for (const data of trackedMessages) {
                try {
                    const summary = await engagementStats.generateMessageSummary(data.messageId);
                    const userDetails = await engagementStats.getUserDetailsForMessage(data.messageId);
                    
                    if (summary && userDetails) {
                        const formattedSummary = formatMessageSummary(summary, userDetails);
                        await sendLongMessage(channel, formattedSummary);
                        processedCount++;
                    }
                } catch (messageError) {
                    console.error(`Error processing message ${data.messageId}:`, messageError);
                    // Continue with other messages
                }
            }
            
            if (processedCount < trackedMessages.length) {
                await channel.send({
                    content: `⚠️ Only ${processedCount} of ${trackedMessages.length} messages could be processed.`,
                    components: [createDeleteButton()]
                });
            }
        }
    } catch (error) {
        console.error('Error in handleCheckEngagement:', error);
        
        await channel.send({
            content: 'An error occurred while processing the command.',
            components: [createDeleteButton()]
        });
    }
}

export default handleCheckEngagement;
