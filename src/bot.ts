import { Client, Events, Message, GatewayIntentBits, TextChannel, GuildTextBasedChannel, Interaction, ButtonInteraction } from 'discord.js';
import config, { updateSettingsFromDatabase } from './config';
import messageTracker from './services/messageTracker';
import database from './services/database';
import reportScheduler from './services/reportScheduler';
import handleCheckEngagement from './commands/checkEngagement';
import { handleMostActive, handleMostInactive } from './commands/activityRanking';
import handleSetPrefix from './commands/setPrefix';
import handleScheduleReport from './commands/scheduleReport';
import handleSetup from './commands/setup/index';
import { getCommandName, hasCommandPermission } from './utils/permissions';
import { createDeleteButton } from './utils/messageButtons';

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
            
            // Load settings from database
            this.loadSettingsFromDatabase();
            
            // Process existing messages
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
        
        // Button interaction handler
        this.client.on(Events.InteractionCreate, async (interaction: Interaction) => {
            if (!interaction.isButton()) return;
            
            try {
                const buttonInteraction = interaction as ButtonInteraction;
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
                                } catch (error) {
                                    console.error(`Error deleting linked message ${id}:`, error);
                                    // Continue with other messages
                                }
                            }
                        }
                    } catch (error) {
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
                            await handleMostActive(buttonInteraction, count, page);
                        } else {
                            await handleMostInactive(buttonInteraction, count, page);
                        }
                    }
                }
            } catch (error) {
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
            const reply = await message.reply('You do not have permission to use this command.');
            this.addDeleteButton(reply);
            return;
        }
        
        try {
            // Process the command
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
            
            // Delete the command message after processing
            if (message.deletable) {
                await message.delete().catch(error => {
                    console.error('Error deleting command message:', error);
                });
            }
        } catch (error) {
            console.error(`Error handling command ${command}:`, error);
            if (message.channel instanceof TextChannel) {
                await message.channel.send('An error occurred while processing the command.');
            }
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
