import { Client, Events, Message, GatewayIntentBits, TextChannel } from 'discord.js';
import config, { updateSettingsFromDatabase } from './config';
import messageTracker from './services/messageTracker';
import database from './services/database';
import reportScheduler from './services/reportScheduler';
import interactionHandler from './services/interactionHandler';
import { registerGeneralInteractionHandlers } from './utils/interactionHandlers';
import { registerSlashCommands } from './utils/slashCommands';
import { createDeleteButton } from './utils/messageButtons';

// Import slash command modules
import './commands/checkEngagement';
import './commands/activityRanking';
import './commands/scheduleReport';
import './commands/setup/index';

class EngagementBot {
    private client: Client;

    constructor() {
        this.client = new Client({
            intents: config.intents.map(intent => GatewayIntentBits[intent])
        });
        this.setupEventHandlers();
        
        // Handle graceful shutdown
        process.on('SIGINT', this.handleShutdown.bind(this));
        process.on('SIGTERM', this.handleShutdown.bind(this));
    }

    private setupEventHandlers(): void {
        // Ready event
        this.client.once(Events.ClientReady, async () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
            
            // Load settings from database
            this.loadSettingsFromDatabase();
            
            // Process existing messages
            this.processExistingMessages();
            
            // Initialize report scheduler
            reportScheduler.initialize(this.client);
            
            // Initialize the interaction handler
            interactionHandler.initialize(this.client);
            
            // Register general interaction handlers
            registerGeneralInteractionHandlers();
            
            // Register slash commands with Discord
            await registerSlashCommands(this.client);
        });

        // Message creation
        this.client.on(Events.MessageCreate, async (message: Message) => {
            if (config.trackedChannelId && message.channel.id === config.trackedChannelId && message.channel instanceof TextChannel) {
                const allMembers = await message.channel.guild.members.fetch();
                // Filter members to only include those who can access the channel
                const channelMembersList = allMembers.filter(member => 
                    message.channel instanceof TextChannel && 
                    message.channel.permissionsFor(member)?.has('ViewChannel')
                );
                messageTracker.trackMessage(message, channelMembersList);
            }
        });

        // Reaction events
        this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
            if (config.trackedChannelId && reaction.message.channel.id === config.trackedChannelId) {
                messageTracker.addReaction(reaction.message.id, reaction.emoji.name, user.id);
            }
        });

        this.client.on(Events.MessageReactionRemove, async (reaction, user) => {
            if (config.trackedChannelId && reaction.message.channel.id === config.trackedChannelId) {
                messageTracker.removeReaction(reaction.message.id, reaction.emoji.name, user.id);
            }
        });
    }

    private async processExistingMessages(): Promise<void> {
        try {
            // Skip if no tracked channel is set
            if (!config.trackedChannelId) {
                console.log('No tracked channel set. Use the !setup command to configure a channel.');
                return;
            }
            
            const channel = await this.client.channels.fetch(config.trackedChannelId);
            if (!(channel instanceof TextChannel)) {
                console.error('Could not find tracked channel or channel is not a text channel');
                return;
            }

            const messages = await channel.messages.fetch({ 
                limit: config.defaults.messagesFetchLimit 
            });
            const allMembers = await channel.guild.members.fetch();
            // Filter members to only include those who can access the channel
            const channelMembersList = allMembers.filter(member => 
                channel.permissionsFor(member)?.has('ViewChannel')
            );

            for (const [_, message] of messages) {
                messageTracker.trackMessage(message, channelMembersList);
                await messageTracker.processExistingReactions(message);
            }

            console.log(`Processed ${messages.size} existing messages`);
        } catch (error) {
            console.error('Error processing existing messages:', error);
        }
    }


    // Add a delete button to a message
    private addDeleteButton(message: Message): void {
        // Edit the message to add the button
        message.edit({ 
            components: [createDeleteButton()] 
        }).catch(error => {
            console.error('Error adding delete button:', error);
        });
    }

    // Load settings from database
    private loadSettingsFromDatabase(): void {
        try {
            const settings = database.getAllBotSettings();
            
            // Update config with database settings
            updateSettingsFromDatabase(settings);
            
            // Update specific config properties if needed
            if (settings.has('TRACKED_CHANNEL_ID')) {
                config.trackedChannelId = settings.get('TRACKED_CHANNEL_ID');
            }
            
            if (settings.has('ADMIN_CHANNEL_ID')) {
                config.adminChannelId = settings.get('ADMIN_CHANNEL_ID');
            }
            
            if (settings.has('ADMIN_ROLE_IDS')) {
                const roleIds = settings.get('ADMIN_ROLE_IDS');
                if (roleIds) {
                    config.permissions.adminRoleIds = roleIds.split(',');
                }
            }
            
            if (settings.has('MOD_ROLE_IDS')) {
                const roleIds = settings.get('MOD_ROLE_IDS');
                if (roleIds) {
                    config.permissions.modRoleIds = roleIds.split(',');
                }
            }
            
            console.log('Settings loaded from database');
        } catch (error) {
            console.error('Error loading settings from database:', error);
        }
    }

    // Handle graceful shutdown
    private async handleShutdown(): Promise<void> {
        console.log('Shutting down bot...');
        
        // Sync data to database
        messageTracker.forceSyncToDatabase();
        
        // Shutdown report scheduler
        reportScheduler.shutdown();
        
        // Close database connection
        database.close();
        
        // Destroy client
        this.client.destroy();
        
        console.log('Bot shutdown complete');
        process.exit(0);
    }

    public start(): void {
        this.client.login(config.token);
    }
}

export default EngagementBot;
