import { ButtonInteraction } from 'discord.js';
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
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showChannelSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup admin channel button
 */
async function handleSetupAdminChannelButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showAdminChannelSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup prefix button
 */
async function handleSetupPrefixButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showPrefixSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup roles button
 */
async function handleSetupRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showRoleSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup test button
 */
async function handleSetupTestButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await testConfiguration({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup admin roles button
 */
async function handleSetupAdminRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showAdminRoleSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the setup mod roles button
 */
async function handleSetupModRolesButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showModRoleSetup({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the back button (from role setup)
 */
async function handleSetupBackButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showSetupWelcome({ 
        message: originalMessage, 
        setupMessage: message 
    });
}

/**
 * Handle the back to main menu button
 */
async function handleSetupBackToMainButton(interaction: ButtonInteraction): Promise<void> {
    await interaction.deferUpdate();
    
    const message = interaction.message;
    // Get the original message from the reference
    const originalMessageId = interaction.message.reference?.messageId;
    if (!originalMessageId) {
        console.error('No message reference found for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    const originalMessage = await interaction.channel?.messages.fetch(originalMessageId).catch(() => null);
    if (!originalMessage) {
        console.error('Could not find original message for setup interaction');
        await interaction.followUp({
            content: 'An error occurred. Please try the setup command again.',
            ephemeral: true
        });
        return;
    }
    
    // Ensure only the original command user can interact with buttons
    if (interaction.user.id !== originalMessage.author.id) {
        await interaction.followUp({
            content: 'Only the person who initiated setup can use these buttons.',
            ephemeral: true
        });
        return;
    }
    
    await showSetupWelcome({ 
        message: originalMessage, 
        setupMessage: message 
    });
}
