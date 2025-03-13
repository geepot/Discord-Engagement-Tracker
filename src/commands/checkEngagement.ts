import { Message, TextChannel, ButtonInteraction } from 'discord.js';
import messageTracker from '../services/messageTracker';
import engagementStats from '../services/engagementStats';
import { formatMessageSummary } from '../utils/formatters';
import { createMessageWithDeleteButton, createConfirmationMessage } from '../utils/messageButtons';
import { CommandMessageManager } from '../utils/messageManager';
import interactionHandler from '../services/interactionHandler';

/**
 * Process all tracked messages and generate summaries
 */
async function processAllTrackedMessages(channel: TextChannel, messageManager: CommandMessageManager): Promise<void> {
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
            // Check all tracked messages - but first ask for confirmation
            const trackedMessages = messageTracker.getAllMessages();
            
            if (trackedMessages.length === 0) {
                await channel.send(
                    createMessageWithDeleteButton('No messages are currently being tracked.')
                );
                return;
            }
            
            // Show confirmation message with Yes/No buttons
            const confirmationMessage = await channel.send(
                createConfirmationMessage(
                    `⚠️ You are about to generate summaries for all ${trackedMessages.length} tracked messages. Are you sure you want to do this? (Hint: Add a message ID to the command.)`,
                    'confirm_check_all_yes',
                    'confirm_check_all_no'
                )
            );
            
            // Register one-time handlers for the confirmation buttons
            const confirmYesHandler = async (interaction: ButtonInteraction) => {
                // Disable the buttons
                await interaction.update({
                    components: []
                });
                
                // User confirmed, process all messages
                await processAllTrackedMessages(channel, messageManager);
                
                // Remove the handler after use
                interactionHandler.registerButtonHandler('confirm_check_all_yes', null);
                interactionHandler.registerButtonHandler('confirm_check_all_no', null);
            };
            
            const confirmNoHandler = async (interaction: ButtonInteraction) => {
                // Disable the buttons
                await interaction.update({
                    components: []
                });
                
                // User cancelled
                await channel.send(
                    createMessageWithDeleteButton('Command cancelled.')
                );
                
                // Remove the handler after use
                interactionHandler.registerButtonHandler('confirm_check_all_yes', null);
                interactionHandler.registerButtonHandler('confirm_check_all_no', null);
            };
            
            // Register the handlers
            interactionHandler.registerButtonHandler('confirm_check_all_yes', confirmYesHandler);
            interactionHandler.registerButtonHandler('confirm_check_all_no', confirmNoHandler);
            
            // Set a timeout to clean up the handlers and update the message if no interaction
            setTimeout(async () => {
                // Check if the message still exists and has components (hasn't been interacted with)
                try {
                    const fetchedMessage = await channel.messages.fetch(confirmationMessage.id);
                    if (fetchedMessage.components.length > 0) {
                        // No interaction received, timeout
                        await fetchedMessage.edit({
                            content: '⚠️ Confirmation timed out. Command cancelled.',
                            components: []
                        });
                        
                        // Remove the handlers
                        interactionHandler.registerButtonHandler('confirm_check_all_yes', null);
                        interactionHandler.registerButtonHandler('confirm_check_all_no', null);
                    }
                } catch (error) {
                    console.error('Error checking confirmation message:', error);
                }
            }, 60000); // 1 minute timeout
        }
    } catch (error) {
        console.error('Error in handleCheckEngagement:', error);
        
        await channel.send(
            createMessageWithDeleteButton('An error occurred while processing the command.')
        );
    }
}

export default handleCheckEngagement;
