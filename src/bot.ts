import { Client, Events, Message, GatewayIntentBits, TextChannel, GuildTextBasedChannel } from 'discord.js';
import config from './config';
import messageTracker from './services/messageTracker';
import database from './services/database';
import reportScheduler from './services/reportScheduler';
import handleCheckEngagement from './commands/checkEngagement';
import { handleMostActive, handleMostInactive } from './commands/activityRanking';
import handleSetPrefix from './commands/setPrefix';
import handleScheduleReport from './commands/scheduleReport';
import handleSetup from './commands/setup';
import { getCommandName, hasCommandPermission } from './utils/permissions';

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
        this.client.once(Events.ClientReady, () => {
            console.log(`Logged in as ${this.client.user?.tag}`);
            this.processExistingMessages();
            
            // Initialize report scheduler
            reportScheduler.initialize(this.client);
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

            // Check for custom guild prefix
            let prefix = config.commandPrefix;
            if (message.guild) {
                const customPrefix = database.getGuildPrefix(message.guild.id);
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

    private async handleCommand(message: Message, prefix: string): Promise<void> {
        const command = getCommandName(message, prefix);
        
        // Check if user has permission to use this command
        if (!hasCommandPermission(message, command)) {
            await message.reply('You do not have permission to use this command.');
            return;
        }
        
        try {
            switch (command) {
                case config.commands.checkEngagement: {
                    const messageId = message.content.split(' ')[1];
                    await handleCheckEngagement(message, messageId);
                    break;
                }
    
                case config.commands.mostActive:
                    await handleMostActive(message);
                    break;
    
                case config.commands.mostInactive:
                    await handleMostInactive(message);
                    break;
                    
                case config.commands.setPrefix:
                    await handleSetPrefix(message);
                    break;
                    
                case config.commands.report:
                    await handleScheduleReport(message);
                    break;
                    
                case 'setup':
                    await handleSetup(message);
                    break;
                    
                default:
                    // Unknown command
                    break;
            }
        } catch (error) {
            console.error(`Error handling command ${command}:`, error);
            if (message.channel instanceof TextChannel) {
                await message.channel.send('An error occurred while processing the command.');
            }
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
