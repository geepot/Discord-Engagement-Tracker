import { Message, TextChannel } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatMessageSummary, sendLongMessage } from '../utils/formatters';
import { createMessageWithDeleteButton } from '../utils/messageButtons';
import { CommandMessageManager } from '../utils/messageManager';

async function handleCheckEngagement(message: Message, messageId?: string): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }

    const channel = message.channel;
    
    // Create a message manager for this command
    const messageManager = new CommandMessageManager(channel);

    try {
        if (messageId) {
            // Check specific message
            const data = messageTracker.getMessage(messageId);
            if (!data) {
                await channel.send(
                    createMessageWithDeleteButton('Message not found or not being tracked.')
                );
                return;
            }

            const summary = await engagementStats.generateMessageSummary(messageId);
            const userDetails = await engagementStats.getUserDetailsForMessage(messageId);
            
            if (summary && userDetails) {
                const formattedSummary = formatMessageSummary(summary, userDetails);
                
                // Use the message manager to send and track the message
                await messageManager.sendMessage(formattedSummary);
                
                // Add delete button to the last message
                await messageManager.addDeleteButtonToLastMessage();
            } else {
                await channel.send(
                    createMessageWithDeleteButton('Could not generate summary for this message.')
                );
            }
        } else {
            // Check all tracked messages
            const trackedMessages = messageTracker.getAllMessages();
            
            if (trackedMessages.length === 0) {
                await channel.send(
                    createMessageWithDeleteButton('No messages are currently being tracked.')
                );
                return;
            }
            
            // Warn if there are many messages
            if (trackedMessages.length > 5) {
                await messageManager.sendMessage(
                    `⚠️ Generating summaries for ${trackedMessages.length} messages. This may take a moment...`
                );
            }

            let processedCount = 0;
            for (const data of trackedMessages) {
                try {
                    const summary = await engagementStats.generateMessageSummary(data.messageId);
                    const userDetails = await engagementStats.getUserDetailsForMessage(data.messageId);
                    
                    if (summary && userDetails) {
                        const formattedSummary = formatMessageSummary(summary, userDetails);
                        
                        // Use the message manager to send and track the message
                        await messageManager.sendMessage(formattedSummary);
                        
                        processedCount++;
                    }
                } catch (messageError) {
                    console.error(`Error processing message ${data.messageId}:`, messageError);
                    // Continue with other messages
                }
            }
            
            if (processedCount < trackedMessages.length) {
                await messageManager.sendMessage(
                    `⚠️ Only ${processedCount} of ${trackedMessages.length} messages could be processed.`
                );
            }
            
            // Add delete button to the last message
            await messageManager.addDeleteButtonToLastMessage();
        }
    } catch (error) {
        console.error('Error in handleCheckEngagement:', error);
        
        await channel.send(
            createMessageWithDeleteButton('An error occurred while processing the command.')
        );
    }
}

export default handleCheckEngagement;
