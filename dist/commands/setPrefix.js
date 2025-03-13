"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = __importDefault(require("../config"));
const database_1 = __importDefault(require("../services/database"));
async function handleSetPrefix(message) {
    // Ensure we're in a text channel
    if (!(message.channel instanceof discord_js_1.TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    const args = message.content.split(' ');
    // Check if a new prefix was provided
    if (args.length < 2) {
        await message.reply(`Current prefix is: \`${config_1.default.commandPrefix}\`. To change it, use \`${config_1.default.commandPrefix}${config_1.default.commands.setPrefix} new_prefix\``);
        return;
    }
    const newPrefix = args[1];
    // Validate the new prefix
    if (newPrefix.length > 3) {
        await message.reply('Prefix must be 3 characters or less.');
        return;
    }
    try {
        // Save the new prefix to the database
        database_1.default.saveGuildPrefix(message.guild.id, newPrefix);
        await message.channel.send(`Command prefix has been changed to: \`${newPrefix}\``);
        await message.channel.send(`Example: \`${newPrefix}${config_1.default.commands.checkEngagement}\``);
        // Note: The actual prefix change will take effect after bot restart
        // In a more advanced implementation, we would update the in-memory config as well
        await message.channel.send('⚠️ Note: The new prefix will take effect after the bot restarts.');
    }
    catch (error) {
        console.error('Error setting prefix:', error);
        await message.channel.send('An error occurred while setting the new prefix.');
    }
}
exports.default = handleSetPrefix;
