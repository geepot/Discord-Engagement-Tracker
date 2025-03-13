import { 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    MessageComponentInteraction
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
    
    // Create collector for button interactions
    const collector = setupMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async (interaction: MessageComponentInteraction) => {
        // Ensure only the original command user can interact with buttons
        if (interaction.user.id !== message.author.id) {
            await interaction.reply({
                content: 'Only the person who initiated setup can use these buttons.',
                ephemeral: true
            });
            return;
        }
        
        await interaction.deferUpdate();
        
        const context: SetupContext = { message, setupMessage };
        
        switch (interaction.customId) {
            case 'setup_channel':
                await showChannelSetup(context);
                break;
                
            case 'setup_admin_channel':
                await showAdminChannelSetup(context);
                break;
                
            case 'setup_prefix':
                await showPrefixSetup(context);
                break;
                
            case 'setup_roles':
                await showRoleSetup(context);
                break;
                
            case 'setup_test':
                await testConfiguration(context);
                break;
        }
    });
    
    collector.on('end', async () => {
        // Disable buttons after timeout
        const disabledRow1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_channel')
                    .setLabel('Set Tracked Channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_admin_channel')
                    .setLabel('Set Admin Channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_prefix')
                    .setLabel('Set Command Prefix')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⌨️')
                    .setDisabled(true)
            );
            
        const disabledRow2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_roles')
                    .setLabel('Configure Roles')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_test')
                    .setLabel('Test Configuration')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
                    .setDisabled(true)
            );
        
        await setupMessage.edit({
            components: [disabledRow1, disabledRow2]
        });
    });
};

// Register the setup welcome handler
setShowSetupWelcome(showSetupWelcome);
        