import { Message, TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatMessageSummary, sendLongMessage } from '../utils/formatters';

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
                // Create delete button
                const deleteButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await channel.send({
                    content: 'Message not found or not being tracked.',
                    components: [deleteButton]
                });
                return;
            }

            const summary = await engagementStats.generateMessageSummary(messageId);
            const userDetails = await engagementStats.getUserDetailsForMessage(messageId);
            
            if (summary && userDetails) {
                const formattedSummary = formatMessageSummary(summary, userDetails);
                await sendLongMessage(channel, formattedSummary);
            } else {
                // Create delete button
                const deleteButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await channel.send({
                    content: 'Could not generate summary for this message.',
                    components: [deleteButton]
                });
            }
        } else {
            // Check all tracked messages
            const trackedMessages = messageTracker.getAllMessages();
            
            if (trackedMessages.length === 0) {
                // Create delete button
                const deleteButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await channel.send({
                    content: 'No messages are currently being tracked.',
                    components: [deleteButton]
                });
                return;
            }
            
            // Warn if there are many messages
            if (trackedMessages.length > 5) {
                // Create delete button
                const deleteButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await channel.send({
                    content: `⚠️ Generating summaries for ${trackedMessages.length} messages. This may take a moment...`,
                    components: [deleteButton]
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
                // Create delete button
                const deleteButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('delete_message')
                            .setLabel('Delete')
                            .setStyle(ButtonStyle.Danger)
                    );
                
                await channel.send({
                    content: `⚠️ Only ${processedCount} of ${trackedMessages.length} messages could be processed.`,
                    components: [deleteButton]
                });
            }
        }
    } catch (error) {
        console.error('Error in handleCheckEngagement:', error);
        
        // Create delete button
        const deleteButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('delete_message')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
            );
        
        await channel.send({
            content: 'An error occurred while processing the command.',
            components: [deleteButton]
        });
    }
}

export default handleCheckEngagement;
