"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConfiguration = void 0;
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../../config"));
const database_1 = __importDefault(require("../../services/database"));
const setupHandlers_1 = require("./setupHandlers");
/**
 * Shows the test configuration screen
 */
const testConfiguration = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
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
        const testQuery = database_1.default.getMessage('test');
        dbStatus = '✅ Connected';
    }
    catch (error) {
        console.error('Database test error:', error);
    }
    // Test tracked channel
    let channelStatus = '❌ Not set';
    try {
        if (config_1.default.trackedChannelId) {
            const channel = await message.guild?.channels.fetch(config_1.default.trackedChannelId);
            if (channel && channel instanceof discord_js_1.TextChannel) {
                channelStatus = `✅ Found: <#${channel.id}>`;
            }
            else {
                channelStatus = '❌ Not found or not accessible';
            }
        }
    }
    catch (error) {
        console.error('Channel test error:', error);
    }
    // Test admin channel
    let adminChannelStatus = '❌ Not set';
    try {
        if (config_1.default.adminChannelId) {
            const channel = await message.guild?.channels.fetch(config_1.default.adminChannelId);
            if (channel && channel instanceof discord_js_1.TextChannel) {
                adminChannelStatus = `✅ Found: <#${channel.id}>`;
            }
            else {
                adminChannelStatus = '❌ Not found or not accessible';
            }
        }
    }
    catch (error) {
        console.error('Admin channel test error:', error);
    }
    // Update embed with test results
    const resultsEmbed = new discord_js_1.EmbedBuilder()
        .setTitle('✅ Configuration Test Results')
        .setDescription('Here are the results of your configuration test:')
        .setColor('#28a745')
        .addFields({ name: 'Database', value: dbStatus, inline: true }, { name: 'Tracked Channel', value: channelStatus, inline: true }, { name: 'Admin Channel', value: adminChannelStatus, inline: true }, { name: 'Command Prefix', value: `\`${config_1.default.commandPrefix}\``, inline: true }, { name: 'Admin Roles', value: config_1.default.permissions.adminRoleIds.length > 0 ?
            config_1.default.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true }, { name: 'Mod Roles', value: config_1.default.permissions.modRoleIds.length > 0 ?
            config_1.default.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true })
        .setFooter({ text: 'Discord Engagement Tracker • Configuration Test' });
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('setup_back_to_main')
        .setLabel('Back to Main Menu')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await setupMessage.edit({
        embeds: [resultsEmbed],
        components: [row]
    });
    // Create collector for button interactions
    const collector = setupMessage.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 60000 // 1 minute
    });
    collector.on('collect', async (interaction) => {
        // Ensure only the original command user can interact with buttons
        if (interaction.user.id !== message.author.id) {
            await interaction.reply({
                content: 'Only the person who initiated setup can use these buttons.',
                ephemeral: true
            });
            return;
        }
        await interaction.deferUpdate();
        await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        collector.stop();
    });
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        }
    });
};
exports.testConfiguration = testConfiguration;
// Register the test configuration handler
(0, setupHandlers_1.setTestConfiguration)(exports.testConfiguration);
