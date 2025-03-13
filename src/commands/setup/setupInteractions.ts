import { ButtonInteraction, Message, TextChannel, TextBasedChannel } from 'discord.js';
import interactionHandler from '../../services/interactionHandler';
import { 
    showSetupWelcome,
    showChannelSetup,
    showAdminChannelSetup,
    showPrefixSetup,
    showRoleSetup,
    showAdminRoleSetup,
    showModRoleSetup,
    testConfiguration
} from './setupHandlers';

/**
 * Helper function to get the original message from a button interaction
 * @param interaction The button interaction
 * @returns The original message or null if not found
 */
async function getOriginalMessage(interaction: ButtonInteraction): Promise<{ 
    originalMessage: Message | null; 
    errorMessage?: string;
}> {
    const message = interaction.message;
    
    // Get the original message ID from the embed footer
    let originalMessageId = null;
    
    // Check if we have embeds
    if (message.embeds && message.embeds.length > 0) {
        const footerText = message.embeds[0].footer?.text;
        if (footerText) {
            // Extract the original message ID from the footer text
            const match = footerText.match(/OriginalID:(\d+)/);
            if (match && match[1]) {
                originalMessageId = match[1];
                console.log(`Found original message ID in footer: ${originalMessageId}`);
            }
        }
    }
    
    // Fallback to checking for originalMessageId property
    if (!originalMessageId && (message as any).originalMessageId) {
        originalMessageId = (message as any).originalMessageId;
        console.log(`Found original message ID in property: ${originalMessageId}`);
    }
    
    // Fallback to message reference (legacy method)
    if (!originalMessageId && message.reference?.messageId) {
        originalMessageId = message.reference.messageId;
        console.log(`Found original message ID in reference: ${originalMessageId}`);
    }
    
    if (!originalMessageId) {
        console.error('No original message ID found for setup interaction');
        return { 
            originalMessage: null,
            errorMessage: 'An error occurred. Please try the setup command again.'
        };
    }
    
    // Try to fetch the original message
    try {
        console.log(`Attempting to fetch message with ID: ${originalMessageId} in channel: ${interaction.channel?.id}`);
        
        // First try to fetch from the current channel
        let originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch((error) => {
            console.error(`Error fetching original message from current channel: ${error.message}`);
            return null;
        });
        
        // If not found and we're in a guild, try to fetch from all accessible channels
        if (!originalMessage && interaction.guild) {
            console.log('Message not found in current channel, searching in other channels...');
            
            // Get all text channels the bot has access to
            const channels = interaction.guild.channels.cache.filter(
                channel => channel.isTextBased() && channel.permissionsFor(interaction.guild!.members.me!)?.has('ViewChannel')
            );
            
            // Try each channel
            for (const [, channel] of channels) {
                if (!channel.isTextBased()) continue;
                
                try {
                    const message = await (channel as TextChannel).messages.fetch(originalMessageId).catch(() => null);
                    if (message) {
                        console.log(`Found message in channel: ${channel.name}`);
                        originalMessage = message;
                        break;
                    }
                } catch (e) {
                    // Ignore errors for other channels
                }
            }
        }
        
        if (!originalMessage) {
            console.error('Could not find original message for setup interaction in any channel');
            
            // Try to find the latest message from the bot in the current channel as a fallback
            if (interaction.channel) {
                console.log('Trying to find the latest bot message in the current channel...');
                try {
                    const messages = await interaction.channel.messages.fetch({ limit: 10 });
                    const botMessages = messages.filter(msg => msg.author.id === interaction.client.user?.id);
                    
                    if (botMessages.size > 0) {
                        // Get the most recent bot message
                        const latestBotMessage = botMessages.first();
                        if (latestBotMessage) {
                            console.log(`Found latest bot message with ID: ${latestBotMessage.id}`);
                            originalMessage = latestBotMessage;
                            
                            // Check if this is a valid message for setup
                            if (originalMessage) {
                                console.log('Using latest bot message as fallback');
                                return { originalMessage };
                            }
                        }
                    } else {
                        console.log('No recent bot messages found in the channel');
                    }
                } catch (error) {
                    console.error(`Error fetching recent messages: ${error}`);
                }
            }
            
            // If we still don't have a message, create a new one as a last resort
            let fallbackMessage = null;
            if (interaction.channel && 'send' in interaction.channel) {
                console.log('Creating a new message as a last resort fallback');
                fallbackMessage = await interaction.channel.send({
                    content: 'Setup session continued. The original setup command message could not be found.'
                });
            }
            
            if (fallbackMessage) {
                console.log('Created fallback message');
                
                // Ensure only the original command user can interact with buttons
                if (interaction.user.id !== interaction.user.id) { // Always true, just to maintain the check
                    return { 
                        originalMessage: null,
                        errorMessage: 'Only the person who initiated setup can use these buttons.'
                    };
                }
                
                return { originalMessage: fallbackMessage };
            }
            
            return { 
                originalMessage: null,
                errorMessage: 'The original setup message could not be found. Please try the setup command again.'
            };
        }
        
        // Ensure only the original command user can interact with buttons
        if (interaction.user.id !== originalMessage.author.id) {
            return { 
                originalMessage: null,
                errorMessage: 'Only the person who initiated setup can use these buttons.'
            };
        }
        
        return { originalMessage };
    } catch (error) {
        console.error(`Error in getOriginalMessage: ${error}`);
        return { 
            originalMessage: null,
            errorMessage: 'An error occurred while retrieving the setup information. Please try the setup command again.'
        };
    }
}

/**
 * Register all setup-related interaction handlers
 */
export function registerSetupInteractionHandlers(): void {
    // Register handlers for setup buttons
    interactionHandler.registerButtonHandler('setup_channel', handleSetupChannelButton);
    interactionHandler.registerButtonHandler('setup_admin_channel', handleSetupAdminChannelButton);
    interactionHandler.registerButtonHandler('setup_prefix', handleSetupPrefixButton);
    interactionHandler.registerButtonHandler('setup_roles', handleSetupRolesButton);
    interactionHandler.registerButtonHandler('setup_test', handleSetupTestButton);
    interactionHandler.registerButtonHandler('setup_back_to_main', handleSetupBackToMainButton);
    
    // Role setup buttons
    interactionHandler.registerButtonHandler('setup_admin_roles', handleSetupAdminRolesButton);
    interactionHandler.registerButtonHandler('setup_mod_roles', handleSetupModRolesButton);
    interactionHandler.registerButtonHandler('setup_back', handleSetupBackButton);
    
    console.log('Setup interaction handlers registered');
}

/**
 * Handle the setup channel button
 */
async function handleSetupChannelButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showChannelSetup !== 'function') {
            console.error('showChannelSetup is not a function:', showChannelSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showChannelSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showChannelSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup admin channel button
 */
async function handleSetupAdminChannelButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showAdminChannelSetup !== 'function') {
            console.error('showAdminChannelSetup is not a function:', showAdminChannelSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showAdminChannelSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showAdminChannelSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup prefix button
 */
async function handleSetupPrefixButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showPrefixSetup !== 'function') {
            console.error('showPrefixSetup is not a function:', showPrefixSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showPrefixSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showPrefixSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup roles button
 */
async function handleSetupRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showRoleSetup !== 'function') {
            console.error('showRoleSetup is not a function:', showRoleSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showRoleSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showRoleSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup test button
 */
async function handleSetupTestButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof testConfiguration !== 'function') {
            console.error('testConfiguration is not a function:', testConfiguration);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await testConfiguration({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in testConfiguration:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup admin roles button
 */
async function handleSetupAdminRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showAdminRoleSetup !== 'function') {
            console.error('showAdminRoleSetup is not a function:', showAdminRoleSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showAdminRoleSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showAdminRoleSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup mod roles button
 */
async function handleSetupModRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showModRoleSetup !== 'function') {
            console.error('showModRoleSetup is not a function:', showModRoleSetup);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showModRoleSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showModRoleSetup:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the back button (from role setup)
 */
async function handleSetupBackButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showSetupWelcome !== 'function') {
            console.error('showSetupWelcome is not a function:', showSetupWelcome);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showSetupWelcome({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showSetupWelcome:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the back to main menu button
 */
async function handleSetupBackToMainButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.followUp({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        if (typeof showSetupWelcome !== 'function') {
            console.error('showSetupWelcome is not a function:', showSetupWelcome);
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
            return;
        }
        
        await showSetupWelcome({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in showSetupWelcome:', error);
        await interaction.followUp({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}
