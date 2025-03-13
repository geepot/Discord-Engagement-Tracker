"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showSetupWelcome = void 0;
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../../config"));
const setupHandlers_1 = require("./setupHandlers");
/**
 * Shows the welcome screen and main menu for the setup wizard
 */
const showSetupWelcome = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('📊 Discord Engagement Tracker Setup')
        .setDescription('Welcome to the setup wizard! This will help you configure the bot for your server.')
        .setColor('#007bff')
        .addFields({ name: 'Current Configuration', value: 'Select an option below to view or modify settings.' }, { name: 'Tracked Channel', value: `<#${config_1.default.trackedChannelId || 'Not set'}>`, inline: true }, { name: 'Admin Channel', value: config_1.default.adminChannelId ? `<#${config_1.default.adminChannelId}>` : 'Not set', inline: true }, { name: 'Command Prefix', value: config_1.default.commandPrefix, inline: true })
        .setFooter({ text: 'Discord Engagement Tracker • Setup Wizard' });
    const row1 = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('setup_channel')
        .setLabel('Set Tracked Channel')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setEmoji('📋'), new discord_js_1.ButtonBuilder()
        .setCustomId('setup_admin_channel')
        .setLabel('Set Admin Channel')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setEmoji('🔔'), new discord_js_1.ButtonBuilder()
        .setCustomId('setup_prefix')
        .setLabel('Set Command Prefix')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setEmoji('⌨️'));
    const row2 = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('setup_roles')
        .setLabel('Configure Roles')
        .setStyle(discord_js_1.ButtonStyle.Primary)
        .setEmoji('👥'), new discord_js_1.ButtonBuilder()
        .setCustomId('setup_test')
        .setLabel('Test Configuration')
        .setStyle(discord_js_1.ButtonStyle.Success)
        .setEmoji('✅'));
    await setupMessage.edit({
        embeds: [embed],
        components: [row1, row2]
    });
    // Create collector for button interactions
    const collector = setupMessage.createMessageComponentCollector({
        componentType: discord_js_1.ComponentType.Button,
        time: 300000 // 5 minutes
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
        const context = { message, setupMessage };
        switch (interaction.customId) {
            case 'setup_channel':
                await (0, setupHandlers_1.showChannelSetup)(context);
                break;
            case 'setup_admin_channel':
                await (0, setupHandlers_1.showAdminChannelSetup)(context);
                break;
            case 'setup_prefix':
                await (0, setupHandlers_1.showPrefixSetup)(context);
                break;
            case 'setup_roles':
                await (0, setupHandlers_1.showRoleSetup)(context);
                break;
            case 'setup_test':
                await (0, setupHandlers_1.testConfiguration)(context);
                break;
        }
    });
    collector.on('end', async () => {
        // Disable buttons after timeout
        const disabledRow1 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('setup_channel')
            .setLabel('Set Tracked Channel')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('📋')
            .setDisabled(true), new discord_js_1.ButtonBuilder()
            .setCustomId('setup_admin_channel')
            .setLabel('Set Admin Channel')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('🔔')
            .setDisabled(true), new discord_js_1.ButtonBuilder()
            .setCustomId('setup_prefix')
            .setLabel('Set Command Prefix')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('⌨️')
            .setDisabled(true));
        const disabledRow2 = new discord_js_1.ActionRowBuilder()
            .addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId('setup_roles')
            .setLabel('Configure Roles')
            .setStyle(discord_js_1.ButtonStyle.Primary)
            .setEmoji('👥')
            .setDisabled(true), new discord_js_1.ButtonBuilder()
            .setCustomId('setup_test')
            .setLabel('Test Configuration')
            .setStyle(discord_js_1.ButtonStyle.Success)
            .setEmoji('✅')
            .setDisabled(true));
        await setupMessage.edit({
            components: [disabledRow1, disabledRow2]
        });
    });
};
exports.showSetupWelcome = showSetupWelcome;
// Register the setup welcome handler
(0, setupHandlers_1.setShowSetupWelcome)(exports.showSetupWelcome);
