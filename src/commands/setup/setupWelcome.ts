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
    setShowSetupWelcome,
    showChannelSetup,
    showAdminChannelSetup,
    showPrefixSetup,
    showRoleSetup,
    testConfiguration
} from './setupHandlers';

/**
 * Shows the welcome screen and main menu for the setup wizard
 */
export const showSetupWelcome: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('📊 Discord Engagement Tracker Setup')
        .setDescription('Welcome to the setup wizard! This will help you configure the bot for your server.')
        .setColor('#007bff')
        .addFields(
            { name: 'Current Configuration', value: 'Select an option below to view or modify settings.' },
            { name: 'Tracked Channel', value: `<#${config.trackedChannelId || 'Not set'}>`, inline: true },
            { name: 'Admin Channel', value: config.adminChannelId ? `<#${config.adminChannelId}>` : 'Not set', inline: true },
            { name: 'Command Prefix', value: config.commandPrefix, inline: true }
        )
        .setFooter({ text: 'Discord Engagement Tracker • Setup Wizard' });
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_channel')
                .setLabel('Set Tracked Channel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('setup_admin_channel')
                .setLabel('Set Admin Channel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔔'),
            new ButtonBuilder()
                .setCustomId('setup_prefix')
                .setLabel('Set Command Prefix')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⌨️')
        );
        
    const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_roles')
                .setLabel('Configure Roles')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👥'),
            new ButtonBuilder()
                .setCustomId('setup_test')
                .setLabel('Test Configuration')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );
    
    await setupMessage.edit({
        embeds: [embed],
        components: [row1, row2]
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

// Register the setup welcome handler
setShowSetupWelcome(showSetupWelcome);
