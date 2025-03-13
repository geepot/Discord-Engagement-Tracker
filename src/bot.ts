import { Client, Events, Message, GatewayIntentBits, TextChannel } from 'discord.js';
import config from './config';
import { registerGeneralInteractionHandlers } from './utils/interactionHandlers';
import { registerSlashCommands } from './utils/slashCommands';
import ServiceRegistry from './services/ServiceRegistry';

// Import command modules
import registerCommands from './commands/index';
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
            
            // Initialize services
            await ServiceRegistry.initialize();
            
            // Process existing messages
            this.processExistingMessages();
            
            // Initialize report scheduler
            ServiceRegistry.getReportSchedulerService().initializeClient(this.client);
            
            // Initialize the interaction handler
            ServiceRegistry.getInteractionHandlerService().initializeClient(this.client);
            
            // Register general interaction handlers
            registerGeneralInteractionHandlers();
            
            // Register commands with the CommandController
            registerCommands();
            
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
                ServiceRegistry.getMessageTrackerService().trackMessage(message, channelMembersList);
            }
        });

        // Reaction events
        this.client.on(Events.MessageReactionAdd, async (reaction, user) => {
            if (config.trackedChannelId && reaction.message.channel.id === config.trackedChannelId) {
                ServiceRegistry.getMessageTrackerService().addReaction(reaction.message.id, reaction.emoji.name, user.id);
            }
        });

        this.client.on(Events.MessageReactionRemove, async (reaction, user) => {
            if (config.trackedChannelId && reaction.message.channel.id === config.trackedChannelId) {
                ServiceRegistry.getMessageTrackerService().removeReaction(reaction.message.id, reaction.emoji.name, user.id);
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
                ServiceRegistry.getMessageTrackerService().trackMessage(message, channelMembersList);
                await ServiceRegistry.getMessageTrackerService().processExistingReactions(message);
            }

            console.log(`Processed ${messages.size} existing messages`);
        } catch (error) {
            console.error('Error processing existing messages:', error);
        }
    }

    // Handle graceful shutdown
    private async handleShutdown(): Promise<void> {
        console.log('Shutting down bot...');
        
        // Shutdown all services
        await ServiceRegistry.shutdown();
        
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
