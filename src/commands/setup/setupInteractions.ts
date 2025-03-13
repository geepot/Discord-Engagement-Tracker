import { 
    ButtonInteraction, 
    Message, 
    TextChannel, 
    TextBasedChannel, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ModalActionRowComponentBuilder,
    ModalSubmitInteraction
} from 'discord.js';
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
    
    // Get the original message ID and initiator ID from the embed footer
    let originalMessageId = null;
    let initiatorId = null;
    
    // Check if we have embeds
    if (message.embeds && message.embeds.length > 0) {
        const footerText = message.embeds[0].footer?.text;
        if (footerText) {
            // Extract the setup message ID from the footer text
            const setupIdMatch = footerText.match(/SetupID:(\d+)/);
            if (setupIdMatch && setupIdMatch[1]) {
                originalMessageId = setupIdMatch[1];
                console.log(`Found setup message ID in footer: ${originalMessageId}`);
            }
            
            // Extract the initiator ID from the footer text
            const initiatorIdMatch = footerText.match(/InitiatorID:(\d+)/);
            if (initiatorIdMatch && initiatorIdMatch[1]) {
                initiatorId = initiatorIdMatch[1];
                console.log(`Found initiator ID in footer: ${initiatorId}`);
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
        // First check if we have the initiator ID from the footer
        if (initiatorId && interaction.user.id !== initiatorId) {
            return { 
                originalMessage: null,
                errorMessage: 'Only the person who initiated setup can use these buttons.'
            };
        }
        // Fallback to checking the original message author if no initiator ID was found
        else if (!initiatorId && interaction.user.id !== originalMessage.author.id) {
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
    const message = interaction.message;
    let initiatorId = null;
    
    // Extract initiator ID from the footer if available
    if (message.embeds && message.embeds.length > 0) {
        const footerText = message.embeds[0].footer?.text;
        if (footerText) {
            const initiatorIdMatch = footerText.match(/InitiatorID:(\d+)/);
            if (initiatorIdMatch && initiatorIdMatch[1]) {
                initiatorId = initiatorIdMatch[1];
            }
        }
    }
    
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.reply({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Create a modal for channel selection
        const modal = new ModalBuilder()
            .setCustomId('setup_channel_modal')
            .setTitle('Set Tracked Channel');
            
        // Add a text input for the channel ID
        const channelInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('Enter the channel ID or mention (#channel)')
            .setPlaceholder('Example: #general or 123456789012345678')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // Add the text input to an action row
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(channelInput);
            
        // Add the action row to the modal
        modal.addComponents(actionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for the modal submission
        const filter = (i: ModalSubmitInteraction) => 
            i.customId === 'setup_channel_modal' && i.user.id === interaction.user.id;
            
        try {
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 60000 // 1 minute timeout
            });
            
            // Get the channel ID from the modal
            let channelId = modalSubmission.fields.getTextInputValue('channel_id').trim();
            
            // Check if it's a channel mention
            const channelMatch = channelId.match(/<#(\d+)>/);
            if (channelMatch) {
                channelId = channelMatch[1];
            }
            
            // Validate the channel
            try {
                const channel = await interaction.guild?.channels.fetch(channelId);
                if (!channel || !(channel instanceof TextChannel)) {
                    await modalSubmission.reply({
                        content: '❌ Invalid channel or not a text channel.',
                        ephemeral: true
                    });
                    return;
                }
                
                // Update settings with new channel ID
                const { updateSetting } = await import('./utils');
                updateSetting('TRACKED_CHANNEL_ID', channelId);
                
                // Update the setup message with success and return to main menu
                await modalSubmission.reply({
                    content: `✅ Successfully set tracked channel to <#${channelId}>. This change will take effect immediately.`,
                    ephemeral: true
                });
                
                // Return to the main menu
                await showSetupWelcome({ 
                    message: originalMessage, 
                    setupMessage: interaction.message,
                    initiatorId: initiatorId || undefined
                });
            } catch (error) {
                console.error('Error fetching channel:', error);
                await modalSubmission.reply({
                    content: '❌ Error fetching channel. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Modal submission error or timeout:', error);
            // No need to send a message, as the modal just closes on timeout
        }
    } catch (error) {
        console.error('Error showing channel setup modal:', error);
        await interaction.reply({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup admin channel button
 */
async function handleSetupAdminChannelButton(interaction: ButtonInteraction): Promise<void> {
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.reply({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Create a modal for admin channel selection
        const modal = new ModalBuilder()
            .setCustomId('setup_admin_channel_modal')
            .setTitle('Set Admin Channel');
            
        // Add a text input for the channel ID
        const channelInput = new TextInputBuilder()
            .setCustomId('admin_channel_id')
            .setLabel('Enter the channel ID or mention (#channel)')
            .setPlaceholder('Example: #admin or 123456789012345678 or "none"')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
        // Add the text input to an action row
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(channelInput);
            
        // Add the action row to the modal
        modal.addComponents(actionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for the modal submission
        const filter = (i: ModalSubmitInteraction) => 
            i.customId === 'setup_admin_channel_modal' && i.user.id === interaction.user.id;
            
        try {
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 60000 // 1 minute timeout
            });
            
            // Get the channel ID from the modal
            let channelId = modalSubmission.fields.getTextInputValue('admin_channel_id').trim();
            
            // Check if user wants to clear the admin channel
            if (channelId.toLowerCase() === 'none') {
                // Clear the admin channel
                const { updateSetting } = await import('./utils');
                updateSetting('ADMIN_CHANNEL_ID', '');
                
                await modalSubmission.reply({
                    content: '✅ Admin channel has been cleared. This change will take effect immediately.',
                    ephemeral: true
                });
                
                // Return to the main menu
                await showSetupWelcome({ 
                    message: originalMessage, 
                    setupMessage: interaction.message 
                });
                return;
            }
            
            // Check if it's a channel mention
            const channelMatch = channelId.match(/<#(\d+)>/);
            if (channelMatch) {
                channelId = channelMatch[1];
            }
            
            // Validate the channel
            try {
                const channel = await interaction.guild?.channels.fetch(channelId);
                if (!channel || !(channel instanceof TextChannel)) {
                    await modalSubmission.reply({
                        content: '❌ Invalid channel or not a text channel.',
                        ephemeral: true
                    });
                    return;
                }
                
                // Update settings with new channel ID
                const { updateSetting } = await import('./utils');
                updateSetting('ADMIN_CHANNEL_ID', channelId);
                
                // Update the setup message with success and return to main menu
                await modalSubmission.reply({
                    content: `✅ Successfully set admin channel to <#${channelId}>. This change will take effect immediately.`,
                    ephemeral: true
                });
                
                // Return to the main menu
                await showSetupWelcome({ 
                    message: originalMessage, 
                    setupMessage: interaction.message 
                });
            } catch (error) {
                console.error('Error fetching channel:', error);
                await modalSubmission.reply({
                    content: '❌ Error fetching channel. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Modal submission error or timeout:', error);
            // No need to send a message, as the modal just closes on timeout
        }
    } catch (error) {
        console.error('Error showing admin channel setup modal:', error);
        await interaction.reply({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup prefix button
 */
async function handleSetupPrefixButton(interaction: ButtonInteraction): Promise<void> {
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.reply({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Create a modal for prefix setup
        const modal = new ModalBuilder()
            .setCustomId('setup_prefix_modal')
            .setTitle('Set Command Prefix');
            
        // Add a text input for the prefix
        const prefixInput = new TextInputBuilder()
            .setCustomId('command_prefix')
            .setLabel('Enter the command prefix')
            .setPlaceholder('Example: ! or / or .')
            .setStyle(TextInputStyle.Short)
            .setMaxLength(5)
            .setRequired(true);
            
        // Add the text input to an action row
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(prefixInput);
            
        // Add the action row to the modal
        modal.addComponents(actionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for the modal submission
        const filter = (i: ModalSubmitInteraction) => 
            i.customId === 'setup_prefix_modal' && i.user.id === interaction.user.id;
            
        try {
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 60000 // 1 minute timeout
            });
            
            // Get the prefix from the modal
            const prefix = modalSubmission.fields.getTextInputValue('command_prefix').trim();
            
            // Validate the prefix
            if (!prefix) {
                await modalSubmission.reply({
                    content: '❌ Prefix cannot be empty.',
                    ephemeral: true
                });
                return;
            }
            
            // Update settings with new prefix
            const { updateSetting } = await import('./utils');
            updateSetting('COMMAND_PREFIX', prefix);
            
            // Update the setup message with success and return to main menu
            await modalSubmission.reply({
                content: `✅ Successfully set command prefix to \`${prefix}\`. This change will take effect immediately.`,
                ephemeral: true
            });
            
            // Return to the main menu
            await showSetupWelcome({ 
                message: originalMessage, 
                setupMessage: interaction.message 
            });
        } catch (error) {
            console.error('Modal submission error or timeout:', error);
            // No need to send a message, as the modal just closes on timeout
        }
    } catch (error) {
        console.error('Error showing prefix setup modal:', error);
        await interaction.reply({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup roles button
 */
async function handleSetupRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate().catch(err => {
        console.error('Error deferring update:', err);
        // Continue execution even if deferUpdate fails
    });
    
    try {
        const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
        
        if (!originalMessage) {
            try {
                await interaction.followUp({
                    content: errorMessage || 'An error occurred. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        // Import the showRoleSetup function directly to avoid circular dependency issues
        const { showRoleSetup } = await import('./roleSetup');
        
        if (typeof showRoleSetup !== 'function') {
            console.error('showRoleSetup is not a function:', showRoleSetup);
            try {
                await interaction.followUp({
                    content: 'An error occurred with the setup wizard. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        await showRoleSetup({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in handleSetupRolesButton:', error);
        try {
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending followUp:', followUpError);
        }
    }
}

/**
 * Handle the setup test button
 */
async function handleSetupTestButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate().catch(err => {
        console.error('Error deferring update:', err);
        // Continue execution even if deferUpdate fails
    });
    
    try {
        const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
        
        if (!originalMessage) {
            try {
                await interaction.followUp({
                    content: errorMessage || 'An error occurred. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        // Import the testConfiguration function directly to avoid circular dependency issues
        const { testConfiguration } = await import('./testConfiguration');
        
        if (typeof testConfiguration !== 'function') {
            console.error('testConfiguration is not a function:', testConfiguration);
            try {
                await interaction.followUp({
                    content: 'An error occurred with the setup wizard. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        await testConfiguration({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in handleSetupTestButton:', error);
        try {
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending followUp:', followUpError);
        }
    }
}

/**
 * Handle the setup admin roles button
 */
async function handleSetupAdminRolesButton(interaction: ButtonInteraction): Promise<void> {
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.reply({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Import config to get current admin roles
        const { default: config } = await import('../../config');
        
        // Create a modal for admin roles setup
        const modal = new ModalBuilder()
            .setCustomId('setup_admin_roles_modal')
            .setTitle('Set Admin Roles');
            
        // Add a text input for the roles
        const rolesInput = new TextInputBuilder()
            .setCustomId('admin_roles')
            .setLabel('Enter role IDs or mentions, separated by spaces')
            .setPlaceholder('Example: @Admin @Owner or 123456789012345678')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(' '))
            .setRequired(true);
            
        // Add the text input to an action row
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(rolesInput);
            
        // Add the action row to the modal
        modal.addComponents(actionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for the modal submission
        const filter = (i: ModalSubmitInteraction) => 
            i.customId === 'setup_admin_roles_modal' && i.user.id === interaction.user.id;
            
        try {
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 60000 // 1 minute timeout
            });
            
            // Get the roles from the modal
            const rolesText = modalSubmission.fields.getTextInputValue('admin_roles').trim();
            
            // Extract role IDs from mentions
            const roleIds: string[] = [];
            const roleMentions = rolesText.match(/<@&(\d+)>/g);
            
            if (roleMentions) {
                for (const mention of roleMentions) {
                    const roleId = mention.match(/<@&(\d+)>/)?.[1];
                    if (roleId) {
                        roleIds.push(roleId);
                    }
                }
            }
            
            // Also check for raw IDs
            const rawIds = rolesText.match(/\b\d{17,20}\b/g);
            if (rawIds) {
                for (const id of rawIds) {
                    if (!roleIds.includes(id)) {
                        roleIds.push(id);
                    }
                }
            }
            
            if (roleIds.length === 0) {
                await modalSubmission.reply({
                    content: '❌ No valid role mentions or IDs found. Please mention roles using @role-name or provide role IDs.',
                    ephemeral: true
                });
                return;
            }
            
            // Update settings with new role IDs
            const { updateSetting } = await import('./utils');
            updateSetting('ADMIN_ROLE_IDS', roleIds.join(','));
            
            // Update the setup message with success and return to role setup
            await modalSubmission.reply({
                content: `✅ Successfully set admin roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`,
                ephemeral: true
            });
            
            // Return to the role setup menu
            await showRoleSetup({ 
                message: originalMessage, 
                setupMessage: interaction.message 
            });
        } catch (error) {
            console.error('Modal submission error or timeout:', error);
            // No need to send a message, as the modal just closes on timeout
        }
    } catch (error) {
        console.error('Error showing admin roles setup modal:', error);
        await interaction.reply({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the setup mod roles button
 */
async function handleSetupModRolesButton(interaction: ButtonInteraction): Promise<void> {
    const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
    
    if (!originalMessage) {
        await interaction.reply({
            content: errorMessage || 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Import config to get current mod roles
        const { default: config } = await import('../../config');
        
        // Create a modal for mod roles setup
        const modal = new ModalBuilder()
            .setCustomId('setup_mod_roles_modal')
            .setTitle('Set Moderator Roles');
            
        // Add a text input for the roles
        const rolesInput = new TextInputBuilder()
            .setCustomId('mod_roles')
            .setLabel('Enter role IDs or mentions, separated by spaces')
            .setPlaceholder('Example: @Mod @Helper or 123456789012345678')
            .setStyle(TextInputStyle.Paragraph)
            .setValue(config.permissions.modRoleIds.map(id => `<@&${id}>`).join(' '))
            .setRequired(true);
            
        // Add the text input to an action row
        const actionRow = new ActionRowBuilder<ModalActionRowComponentBuilder>()
            .addComponents(rolesInput);
            
        // Add the action row to the modal
        modal.addComponents(actionRow);
        
        // Show the modal
        await interaction.showModal(modal);
        
        // Wait for the modal submission
        const filter = (i: ModalSubmitInteraction) => 
            i.customId === 'setup_mod_roles_modal' && i.user.id === interaction.user.id;
            
        try {
            const modalSubmission = await interaction.awaitModalSubmit({
                filter,
                time: 60000 // 1 minute timeout
            });
            
            // Get the roles from the modal
            const rolesText = modalSubmission.fields.getTextInputValue('mod_roles').trim();
            
            // Extract role IDs from mentions
            const roleIds: string[] = [];
            const roleMentions = rolesText.match(/<@&(\d+)>/g);
            
            if (roleMentions) {
                for (const mention of roleMentions) {
                    const roleId = mention.match(/<@&(\d+)>/)?.[1];
                    if (roleId) {
                        roleIds.push(roleId);
                    }
                }
            }
            
            // Also check for raw IDs
            const rawIds = rolesText.match(/\b\d{17,20}\b/g);
            if (rawIds) {
                for (const id of rawIds) {
                    if (!roleIds.includes(id)) {
                        roleIds.push(id);
                    }
                }
            }
            
            if (roleIds.length === 0) {
                await modalSubmission.reply({
                    content: '❌ No valid role mentions or IDs found. Please mention roles using @role-name or provide role IDs.',
                    ephemeral: true
                });
                return;
            }
            
            // Update settings with new role IDs
            const { updateSetting } = await import('./utils');
            updateSetting('MOD_ROLE_IDS', roleIds.join(','));
            
            // Update the setup message with success and return to role setup
            await modalSubmission.reply({
                content: `✅ Successfully set moderator roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`,
                ephemeral: true
            });
            
            // Return to the role setup menu
            await showRoleSetup({ 
                message: originalMessage, 
                setupMessage: interaction.message 
            });
        } catch (error) {
            console.error('Modal submission error or timeout:', error);
            // No need to send a message, as the modal just closes on timeout
        }
    } catch (error) {
        console.error('Error showing mod roles setup modal:', error);
        await interaction.reply({
            content: 'An error occurred with the setup wizard. Please try the setup command again.',
            ephemeral: true
        });
    }
}

/**
 * Handle the back button (from role setup)
 */
async function handleSetupBackButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate().catch(err => {
        console.error('Error deferring update:', err);
        // Continue execution even if deferUpdate fails
    });
    
    try {
        const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
        
        if (!originalMessage) {
            try {
                await interaction.followUp({
                    content: errorMessage || 'An error occurred. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        // Import the showSetupWelcome function directly to avoid circular dependency issues
        const { showSetupWelcome } = await import('./setupWelcome');
        
        if (typeof showSetupWelcome !== 'function') {
            console.error('showSetupWelcome is not a function:', showSetupWelcome);
            try {
                await interaction.followUp({
                    content: 'An error occurred with the setup wizard. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        await showSetupWelcome({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in handleSetupBackButton:', error);
        try {
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending followUp:', followUpError);
        }
    }
}

/**
 * Handle the back to main menu button
 */
async function handleSetupBackToMainButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate().catch(err => {
        console.error('Error deferring update:', err);
        // Continue execution even if deferUpdate fails
    });
    
    try {
        const { originalMessage, errorMessage } = await getOriginalMessage(interaction);
        
        if (!originalMessage) {
            try {
                await interaction.followUp({
                    content: errorMessage || 'An error occurred. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        // Import the showSetupWelcome function directly to avoid circular dependency issues
        const { showSetupWelcome } = await import('./setupWelcome');
        
        if (typeof showSetupWelcome !== 'function') {
            console.error('showSetupWelcome is not a function:', showSetupWelcome);
            try {
                await interaction.followUp({
                    content: 'An error occurred with the setup wizard. Please try the setup command again.',
                    ephemeral: true
                });
            } catch (followUpError) {
                console.error('Error sending followUp:', followUpError);
            }
            return;
        }
        
        await showSetupWelcome({ 
            message: originalMessage, 
            setupMessage: interaction.message 
        });
    } catch (error) {
        console.error('Error in handleSetupBackToMainButton:', error);
        try {
            await interaction.followUp({
                content: 'An error occurred with the setup wizard. Please try the setup command again.',
                ephemeral: true
            });
        } catch (followUpError) {
            console.error('Error sending followUp:', followUpError);
        }
    }
}
