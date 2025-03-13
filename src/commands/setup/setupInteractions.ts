import { ButtonInteraction, Message } from 'discord.js';
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
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch((error) => {
        console.error(`Error fetching original message: ${error.message}`);
        return null;
    });
    
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        return { 
            originalMessage: null,
            errorMessage: 'An error occurred. Please try the setup command again.'
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
    
    await showChannelSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showAdminChannelSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showPrefixSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showRoleSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await testConfiguration({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showAdminRoleSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showModRoleSetup({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showSetupWelcome({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
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
    
    await showSetupWelcome({ 
        message: originalMessage, 
        setupMessage: interaction.message 
    });
}
