import { 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle
} from 'discord.js';
import config from '../../config';
import database from '../../services/database';
import { SetupContext, SetupHandler } from './types';
import { 
    setTestConfiguration,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the test configuration screen
 */
export const testConfiguration: SetupHandler = async ({ message, setupMessage, initiatorId }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('✅ Configuration Test')
        .setDescription('Testing your current configuration...')
        .setColor('#28a745');
    
    await setupMessage.edit({
        embeds: [embed],
        components: []
    });
    
    // Test database connection
    let dbStatus = '❌ Not connected';
    try {
        // Simple test query
        const testQuery = database.getMessage('test');
        dbStatus = '✅ Connected';
    } catch (error) {
        console.error('Database test error:', error);
    }
    
    // Test tracked channel
    let channelStatus = '❌ Not set';
    try {
        if (config.trackedChannelId) {
            const channel = await message.guild?.channels.fetch(config.trackedChannelId);
            if (channel && channel instanceof TextChannel) {
                channelStatus = `✅ Found: <#${channel.id}>`;
            } else {
                channelStatus = '❌ Not found or not accessible';
            }
        }
    } catch (error) {
        console.error('Channel test error:', error);
    }
    
    // Test admin channel
    let adminChannelStatus = '❌ Not set';
    try {
        if (config.adminChannelId) {
            const channel = await message.guild?.channels.fetch(config.adminChannelId);
            if (channel && channel instanceof TextChannel) {
                adminChannelStatus = `✅ Found: <#${channel.id}>`;
            } else {
                adminChannelStatus = '❌ Not found or not accessible';
            }
        }
    } catch (error) {
        console.error('Admin channel test error:', error);
    }
    
    // Update embed with test results
    const resultsEmbed = new EmbedBuilder()
        .setTitle('✅ Configuration Test Results')
        .setDescription('Here are the results of your configuration test:')
        .setColor('#28a745')
        .addFields(
            { name: 'Database', value: dbStatus, inline: true },
            { name: 'Tracked Channel', value: channelStatus, inline: true },
            { name: 'Admin Channel', value: adminChannelStatus, inline: true },
            { name: 'Command Prefix', value: `\`${config.commandPrefix}\``, inline: true },
            { name: 'Admin Roles', value: config.permissions.adminRoleIds.length > 0 ? 
                config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true },
            { name: 'Mod Roles', value: config.permissions.modRoleIds.length > 0 ? 
                config.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true }
        )
        .setFooter({ text: `Discord Engagement Tracker • Configuration Test • SetupID:${setupMessage.id} • InitiatorID:${initiatorId}` });
    
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await setupMessage.edit({
        embeds: [resultsEmbed],
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

// Register the test configuration handler
setTestConfiguration(testConfiguration);
