"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showChannelSetup = void 0;
const discord_js_1 = require("discord.js");
const utils_1 = require("./utils");
const setupHandlers_1 = require("./setupHandlers");
/**
 * Shows the channel setup screen
 */
const showChannelSetup = async ({ message, setupMessage }) => {
    const embed = new discord_js_1.EmbedBuilder()
        .setTitle('📋 Channel Setup')
        .setDescription('Please mention the channel you want to track engagement in.\n\nExample: `#announcements`')
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
        // Extract channel ID from mention
        const channelMatch = response.content.match(/<#(\d+)>/);
        if (!channelMatch) {
            await message.channel.send('❌ Invalid channel format. Please mention a channel using #channel-name.');
            await (0, exports.showChannelSetup)({ message, setupMessage });
            return;
        }
        const channelId = channelMatch[1];
        // Check if channel exists
        try {
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel || !(channel instanceof discord_js_1.TextChannel)) {
                await message.channel.send('❌ Invalid channel or not a text channel.');
                await (0, exports.showChannelSetup)({ message, setupMessage });
                return;
            }
            // Update settings with new channel ID
            (0, utils_1.updateSetting)('TRACKED_CHANNEL_ID', channelId);
            await message.channel.send(`✅ Successfully set tracked channel to <#${channelId}>. This change will take effect immediately.`);
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        }
        catch (error) {
            console.error('Error fetching channel:', error);
            await message.channel.send('❌ Error fetching channel. Please try again.');
            await (0, exports.showChannelSetup)({ message, setupMessage });
        }
    });
    collector.on('end', async (collected, reason) => {
        if (collected.size === 0) {
            await message.channel.send('⏱️ Channel setup timed out.');
            await (0, setupHandlers_1.showSetupWelcome)({ message, setupMessage });
        }
    });
};
exports.showChannelSetup = showChannelSetup;
// Register the channel setup handler
(0, setupHandlers_1.setShowChannelSetup)(exports.showChannelSetup);
