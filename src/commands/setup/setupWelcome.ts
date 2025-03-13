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
    setShowSetupWelcome
} from './setupHandlers';

/**
 * Shows the welcome screen and main menu for the setup wizard
 */
export const showSetupWelcome: SetupHandler = async ({ message, setupMessage, initiatorId }: SetupContext): Promise<void> => {
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
    
        // Store the setup message ID in the footer for persistence
        // We'll use this in the interaction handlers to find the setup message
        try {
            // Add a hidden field to the embed to store the setup message ID and initiator ID
            embed.setFooter({ 
                text: `Discord Engagement Tracker • Setup Wizard • SetupID:${setupMessage.id} • InitiatorID:${initiatorId}` 
            });
            
            // Update the message with the modified embed
            await setupMessage.edit({
                embeds: [embed],
                components: [row1, row2]
            });
            
            console.log(`Stored setup message ID in footer: ${setupMessage.id}`);
        } catch (error) {
            console.error('Error storing setup message ID:', error);
        }
};

// Register the setup welcome handler
setShowSetupWelcome(showSetupWelcome);
