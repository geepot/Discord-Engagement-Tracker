"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showPrefixSetup = void 0;
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../../config"));
const database_1 = __importDefault(require("../../services/database"));
const utils_1 = require("./utils");
const setupHandlers_1 = require("./setupHandlers");
/**
 * Shows the prefix setup screen
 */
const showPrefixSetup = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('⌨️ Command Prefix Setup')
        .setDescription('Please enter a new command prefix. This is the character that will be used before commands.\n\nCurrent prefix: `' + config_1.default.commandPrefix + '`\n\nExample prefixes: `!`, `?`, `$`, `.`')
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the main menu' });
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
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
            return;
        }
        const newPrefix = response.content.trim();
        // Validate prefix
        if (newPrefix.length > 3) {
            await message.channel.send('❌ Prefix must be 3 characters or less.');
            await (0, exports.showPrefixSetup)({ message, setupMessage });
            return;
        }
        // Update .env file with new prefix
        (0, utils_1.updateEnvFile)('COMMAND_PREFIX', newPrefix);
        // Save to database for immediate effect
        if (message.guild) {
            database_1.default.saveGuildPrefix(message.guild.id, newPrefix);
        }
        await message.channel.send(`✅ Successfully set command prefix to \`${newPrefix}\`. This change will take effect immediately for this server.`);
        await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
    });
    collector.on('end', async (collected, reason) => {
        if (collected.size === 0) {
            await message.channel.send('⏱️ Prefix setup timed out.');
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        }
    });
};
exports.showPrefixSetup = showPrefixSetup;
// Register the prefix setup handler
(0, setupHandlers_1.setShowPrefixSetup)(exports.showPrefixSetup);
