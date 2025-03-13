"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const config_1 = __importStar(require("./config"));
const messageTracker_1 = __importDefault(require("./services/messageTracker"));
const database_1 = __importDefault(require("./services/database"));
const reportScheduler_1 = __importDefault(require("./services/reportScheduler"));
const checkEngagement_1 = __importDefault(require("./commands/checkEngagement"));
const activityRanking_1 = require("./commands/activityRanking");
const setPrefix_1 = __importDefault(require("./commands/setPrefix"));
const scheduleReport_1 = __importDefault(require("./commands/scheduleReport"));
const index_1 = __importDefault(require("./commands/setup/index"));
const permissions_1 = require("./utils/permissions");
const messageButtons_1 = require("./utils/messageButtons");
class EngagementBot {
    constructor() {
        this.client = new discord_js_1.Client({
            intents: config_1.default.intents.map(intent => discord_js_1.GatewayIntentBits[intent])
        });
        this.setupEventHandlers();
        // Handle graceful shutdown
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
    }
    setupEventHandlers() {
        // Ready event
        this.client.once(discord_js_1.Events.ClientReady, () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
            // Load settings from database
            this.loadSettingsFromDatabase();
            // Process existing messages
            this.processExistingMessages();
            // Initialize report scheduler
            reportScheduler_1.default.initialize(this.client);
        });
        // Message creation
        this.client.on(discord_js_1.Events.MessageCreate, async (message) => {
            if (config_1.default.trackedChannelId && message.channel.id === config_1.default.trackedChannelId && message.channel instanceof discord_js_1.TextChannel) {
                const allMembers = await message.channel.guild.members.fetch();
                // Filter members to only include those who can access the channel
                const channelMembersList = allMembers.filter(member => message.channel instanceof discord_js_1.TextChannel &&
                    message.channel.permissionsFor(member)?.has('ViewChannel'));
                messageTracker_1.default.trackMessage(message, channelMembersList);
            }
            // Check for custom guild prefix
            let prefix = config_1.default.commandPrefix;
            if (message.guild) {
                const customPrefix = database_1.default.getGuildPrefix(message.guild.id);
                if (customPrefix) {
                    prefix = customPrefix;
                }
            }
            // Handle commands
            if (message.content.startsWith(prefix)) {
                await this.handleCommand(message, prefix);
            }
        });
        // Reaction events
        this.client.on(discord_js_1.Events.MessageReactionAdd, async (reaction, user) => {
            if (config_1.default.trackedChannelId && reaction.message.channel.id === config_1.default.trackedChannelId) {
                messageTracker_1.default.addReaction(reaction.message.id, reaction.emoji.name, user.id);
            }
        });
        this.client.on(discord_js_1.Events.MessageReactionRemove, async (reaction, user) => {
            if (config_1.default.trackedChannelId && reaction.message.channel.id === config_1.default.trackedChannelId) {
                messageTracker_1.default.removeReaction(reaction.message.id, reaction.emoji.name, user.id);
            }
        });
        // Button interaction handler
        this.client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
            if (!interaction.isButton())
                return;
            try {
                const buttonInteraction = interaction;
                const customId = buttonInteraction.customId;
                // Handle delete message button
                if (customId.startsWith('delete_message')) {
                    try {
                        const message = buttonInteraction.message;
                        const parts = customId.split(':');
                        const messageIds = parts.slice(1); // Skip the 'delete_message' part
                        // Delete the interaction message first
                        if (message.deletable) {
                            await message.delete().catch(error => {
                                console.error('Error deleting message:', error);
                            });
                        }
                        // Delete any linked messages
                        if (messageIds.length > 0) {
                            for (const id of messageIds) {
                                try {
                                    const channel = message.channel;
                                    const relatedMessage = await channel.messages.fetch(id);
                                    if (relatedMessage && relatedMessage.deletable) {
                                        await relatedMessage.delete();
                                    }
                                }
                                catch (error) {
                                    console.error(`Error deleting linked message ${id}:`, error);
                                    // Continue with other messages
                                }
                            }
                        }
                    }
                    catch (error) {
                        console.error('Error handling delete button:', error);
                        if (!buttonInteraction.replied) {
                            await buttonInteraction.reply({
                                content: 'Failed to delete message(s).',
                                ephemeral: true
                            });
                        }
                    }
                    return;
                }
                // Handle activity ranking pagination buttons
                if (customId.startsWith('activity_ranking:')) {
                    const [_, action, isActiveStr, countStr, pageStr] = customId.split(':');
                    const isActive = isActiveStr === 'true';
                    const count = parseInt(countStr);
                    const page = parseInt(pageStr);
                    if (action === 'prev' || action === 'next') {
                        // Defer the reply to avoid interaction timeout
                        await buttonInteraction.deferUpdate();
                        // Handle the pagination based on whether it's most active or most inactive
                        if (isActive) {
                            await (0, activityRanking_1.handleMostActive)(buttonInteraction, count, page);
                        }
                        else {
                            await (0, activityRanking_1.handleMostInactive)(buttonInteraction, count, page);
                        }
                    }
                }
            }
            catch (error) {
                console.error('Error handling button interaction:', error);
                // If the interaction hasn't been responded to yet, send an error message
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'An error occurred while processing this interaction.',
                        ephemeral: true
                    });
                }
            }
        });
    }
    async processExistingMessages() {
        try {
            // Skip if no tracked channel is set
            if (!config_1.default.trackedChannelId) {
                console.log('No tracked channel set. Use the !setup command to configure a channel.');
                return;
            }
            const channel = await this.client.channels.fetch(config_1.default.trackedChannelId);
            if (!(channel instanceof discord_js_1.TextChannel)) {
                console.error('Could not find tracked channel or channel is not a text channel');
                return;
            }
            const messages = await channel.messages.fetch({
                limit: config_1.default.defaults.messagesFetchLimit
            });
            const allMembers = await channel.guild.members.fetch();
            // Filter members to only include those who can access the channel
            const channelMembersList = allMembers.filter(member => channel.permissionsFor(member)?.has('ViewChannel'));
            for (const [_, message] of messages) {
                messageTracker_1.default.trackMessage(message, channelMembersList);
                await messageTracker_1.default.processExistingReactions(message);
            }
            console.log(`Processed ${messages.size} existing messages`);
        }
        catch (error) {
            console.error('Error processing existing messages:', error);
        }
    }
    async handleCommand(message, prefix) {
        const command = (0, permissions_1.getCommandName)(message, prefix);
        // Check if user has permission to use this command
        if (!(0, permissions_1.hasCommandPermission)(message, command)) {
            const reply = await message.reply('You do not have permission to use this command.');
            this.addDeleteButton(reply);
            return;
        }
        try {
            // Process the command
            switch (command) {
                case config_1.default.commands.checkEngagement: {
                    const messageId = message.content.split(' ')[1];
                    await (0, checkEngagement_1.default)(message, messageId);
                    break;
                }
                case config_1.default.commands.mostActive:
                    await (0, activityRanking_1.handleMostActive)(message);
                    break;
                case config_1.default.commands.mostInactive:
                    await (0, activityRanking_1.handleMostInactive)(message);
                    break;
                case config_1.default.commands.setPrefix:
                    await (0, setPrefix_1.default)(message);
                    break;
                case config_1.default.commands.report:
                    await (0, scheduleReport_1.default)(message);
                    break;
                case 'setup':
                    await (0, index_1.default)(message);
                    break;
                default:
                    // Unknown command
                    break;
            }
            // Delete the command message after processing
            if (message.deletable) {
                await message.delete().catch(error => {
                    console.error('Error deleting command message:', error);
                });
            }
        }
        catch (error) {
            console.error(`Error handling command ${command}:`, error);
            if (message.channel instanceof discord_js_1.TextChannel) {
                await message.channel.send('An error occurred while processing the command.');
            }
        }
    }
    // Add a delete button to a message
    addDeleteButton(message) {
        // Edit the message to add the button
        message.edit({
            components: [(0, messageButtons_1.createDeleteButton)()]
        }).catch(error => {
            console.error('Error adding delete button:', error);
        });
    }
    // Load settings from database
    loadSettingsFromDatabase() {
        try {
            const settings = database_1.default.getAllBotSettings();
            // Update config with database settings
            (0, config_1.updateSettingsFromDatabase)(settings);
            // Update specific config properties if needed
            if (settings.has('TRACKED_CHANNEL_ID')) {
                config_1.default.trackedChannelId = settings.get('TRACKED_CHANNEL_ID');
            }
            if (settings.has('ADMIN_CHANNEL_ID')) {
                config_1.default.adminChannelId = settings.get('ADMIN_CHANNEL_ID');
            }
            if (settings.has('ADMIN_ROLE_IDS')) {
                const roleIds = settings.get('ADMIN_ROLE_IDS');
                if (roleIds) {
                    config_1.default.permissions.adminRoleIds = roleIds.split(',');
                }
            }
            if (settings.has('MOD_ROLE_IDS')) {
                const roleIds = settings.get('MOD_ROLE_IDS');
                if (roleIds) {
                    config_1.default.permissions.modRoleIds = roleIds.split(',');
                }
            }
            console.log('Settings loaded from database');
        }
        catch (error) {
            console.error('Error loading settings from database:', error);
        }
    }
    // Handle graceful shutdown
    async handleShutdown() {
        console.log('Shutting down bot...');
        // Sync data to database
        messageTracker_1.default.forceSyncToDatabase();
        // Shutdown report scheduler
        reportScheduler_1.default.shutdown();
        // Close database connection
        database_1.default.close();
        // Destroy client
        this.client.destroy();
        console.log('Bot shutdown complete');
        process.exit(0);
    }
    start() {
        this.client.login(config_1.default.token);
    }
}
exports.default = EngagementBot;
