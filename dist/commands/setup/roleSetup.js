"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showModRoleSetup = exports.showAdminRoleSetup = exports.showRoleSetup = void 0;
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../../config"));
const utils_1 = require("./utils");
const setupHandlers_1 = require("./setupHandlers");
/**
 * Shows the role setup screen
 */
const showRoleSetup = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('👥 Role Setup')
        .setDescription('Configure which roles can use admin and moderator commands.\n\nSelect an option:')
        .setColor('#007bff')
        .addFields({ name: 'Admin Roles', value: 'Roles that can use admin commands like `set-prefix` and `schedule-report`' }, { name: 'Mod Roles', value: 'Roles that can use moderator commands like `check-engagement` and activity rankings' })
        .setFooter({ text: 'Discord Engagement Tracker • Role Setup' });
    const row = new discord_js_1.ActionRowBuilder()
        .addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId('setup_admin_roles')
        .setLabel('Set Admin Roles')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('setup_mod_roles')
        .setLabel('Set Mod Roles')
        .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
        .setCustomId('setup_back')
        .setLabel('Back to Main Menu')
        .setStyle(discord_js_1.ButtonStyle.Secondary));
    await setupMessage.edit({
        embeds: [embed],
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
        const context = { message, setupMessage };
        switch (interaction.customId) {
            case 'setup_admin_roles':
                await (0, exports.showAdminRoleSetup)(context);
                break;
            case 'setup_mod_roles':
                await (0, exports.showModRoleSetup)(context);
                break;
            case 'setup_back':
                await (0, setupHandlers_1.showSetupWelcome)(context);
                break;
        }
        collector.stop();
    });
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await message.channel.send('⏱️ Role setup timed out.');
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        }
    });
};
exports.showRoleSetup = showRoleSetup;
/**
 * Shows the admin role setup screen
 */
const showAdminRoleSetup = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('👑 Admin Role Setup')
        .setDescription('Please mention all roles that should have admin command access, separated by spaces.\n\nExample: `@Admin @Owner @Moderator`\n\nCurrent admin roles: ' +
        (config_1.default.permissions.adminRoleIds.length > 0 ?
            config_1.default.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') :
            'None'))
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the role menu' });
    await setupMessage.edit({
        embeds: [embed],
        components: []
    });
    // Create message collector
    const filter = ((m) => m.author.id === message.author.id);
    const collector = message.channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    collector.on('collect', async (response) => {
        if (response.content.toLowerCase() === 'cancel') {
            await (0, exports.showRoleSetup)({ message, setupMessage });
            return;
        }
        // Extract role IDs from mentions
        const roleIds = [];
        const roleMentions = response.content.match(/<@&(\d+)>/g);
        if (roleMentions) {
            for (const mention of roleMentions) {
                const roleId = mention.match(/<@&(\d+)>/)?.[1];
                if (roleId) {
                    roleIds.push(roleId);
                }
            }
        }
        if (roleIds.length === 0) {
            await message.channel.send('❌ No valid role mentions found. Please mention roles using @role-name.');
            await (0, exports.showAdminRoleSetup)({ message, setupMessage });
            return;
        }
        // Update settings with new role IDs
        (0, utils_1.updateSetting)('ADMIN_ROLE_IDS', roleIds.join(','));
        await message.channel.send(`✅ Successfully set admin roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`);
        await (0, exports.showRoleSetup)({ message, setupMessage });
    });
    collector.on('end', async (collected, reason) => {
        if (collected.size === 0) {
            await message.channel.send('⏱️ Admin role setup timed out.');
            await (0, exports.showRoleSetup)({ message, setupMessage });
        }
    });
};
exports.showAdminRoleSetup = showAdminRoleSetup;
/**
 * Shows the mod role setup screen
 */
const showModRoleSetup = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('🛡️ Mod Role Setup')
        .setDescription('Please mention all roles that should have moderator command access, separated by spaces.\n\nExample: `@Mod @Helper @Support`\n\nCurrent mod roles: ' +
        (config_1.default.permissions.modRoleIds.length > 0 ?
            config_1.default.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') :
            'None'))
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the role menu' });
    await setupMessage.edit({
        embeds: [embed],
        components: []
    });
    // Create message collector
    const filter = ((m) => m.author.id === message.author.id);
    const collector = message.channel.createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    collector.on('collect', async (response) => {
        if (response.content.toLowerCase() === 'cancel') {
            await (0, exports.showRoleSetup)({ message, setupMessage });
            return;
        }
        // Extract role IDs from mentions
        const roleIds = [];
        const roleMentions = response.content.match(/<@&(\d+)>/g);
        if (roleMentions) {
            for (const mention of roleMentions) {
                const roleId = mention.match(/<@&(\d+)>/)?.[1];
                if (roleId) {
                    roleIds.push(roleId);
                }
            }
        }
        if (roleIds.length === 0) {
            await message.channel.send('❌ No valid role mentions found. Please mention roles using @role-name.');
            await (0, exports.showModRoleSetup)({ message, setupMessage });
            return;
        }
        // Update settings with new role IDs
        (0, utils_1.updateSetting)('MOD_ROLE_IDS', roleIds.join(','));
        await message.channel.send(`✅ Successfully set mod roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`);
        await (0, exports.showRoleSetup)({ message, setupMessage });
    });
    collector.on('end', async (collected, reason) => {
        if (collected.size === 0) {
            await message.channel.send('⏱️ Mod role setup timed out.');
            await (0, exports.showRoleSetup)({ message, setupMessage });
        }
    });
};
exports.showModRoleSetup = showModRoleSetup;
// Register the role setup handlers
(0, setupHandlers_1.setShowRoleSetup)(exports.showRoleSetup);
(0, setupHandlers_1.setShowAdminRoleSetup)(exports.showAdminRoleSetup);
(0, setupHandlers_1.setShowModRoleSetup)(exports.showModRoleSetup);
