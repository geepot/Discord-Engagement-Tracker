"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const setupWelcome_1 = require("./setupWelcome");
/**
 * Setup command to help users configure the bot with a graphical interface
 */
async function handleSetup(message) {
    // Ensure we're in a text channel
    if (!(message.channel instanceof discord_js_1.TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    // Check if user has administrator permissions
    if (!message.member?.permissions.has('Administrator')) {
        await message.reply('You need Administrator permissions to use the setup command.');
        return;
    }
    try {
        // Send initial message that will be edited by the setup wizard
        const setupMessage = await message.channel.send({
            content: 'Loading setup wizard...',
            embeds: [],
            components: []
        });
        // Show the welcome screen
        await (0, setupWelcome_1.showSetupWelcome)({ message, setupMessage });
    }
    catch (error) {
        console.error('Error in setup command:', error);
        await message.channel.send('An error occurred during setup. Please try again later.');
    }
}
exports.default = handleSetup;
