import { 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';
import config from '../../config';
import { SetupContext, SetupHandler } from './types';
import { 
    setShowRoleSetup,
    setShowAdminRoleSetup,
    setShowModRoleSetup,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the role setup screen
 */
export const showRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('👥 Role Setup')
        .setDescription('Configure which roles can use admin and moderator commands.\n\nSelect an option:')
        .setColor('#007bff')
        .addFields(
            { name: 'Admin Roles', value: 'Roles that can use admin commands like `set-prefix` and `schedule-report`' },
            { name: 'Mod Roles', value: 'Roles that can use moderator commands like `check-engagement` and activity rankings' }
        )
        .setFooter({ text: `Discord Engagement Tracker • Role Setup • SetupID:${setupMessage.id}` });
    
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_admin_roles')
                .setLabel('Set Admin Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setup_mod_roles')
                .setLabel('Set Mod Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setup_back')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await setupMessage.edit({
        embeds: [embed],
        components: [row]
    });
    
    // Store the original message ID in the setup message
    // We'll use this in the interaction handlers to find the original message
    setupMessage.reference = {
        messageId: message.id,
        channelId: message.channel.id,
        guildId: message.guild?.id,
        type: 0 // Required by TypeScript, but not used by Discord.js
    };
};

/**
 * These functions are no longer used as they've been replaced by the modal approach in setupInteractions.ts
 * Keeping empty implementations for backward compatibility
 */
export const showAdminRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    console.log('Admin role setup requested via legacy method');
    // No implementation needed as this is handled by the modal in setupInteractions.ts
};

export const showModRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    console.log('Mod role setup requested via legacy method');
    // No implementation needed as this is handled by the modal in setupInteractions.ts
};

// Register the role setup handlers
setShowRoleSetup(showRoleSetup);
setShowAdminRoleSetup(showAdminRoleSetup);
setShowModRoleSetup(showModRoleSetup);
