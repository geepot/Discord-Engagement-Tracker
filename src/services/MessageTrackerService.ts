import { Collection, Message, GuildMember } from 'discord.js';
import { MessageData, MessageTrackerState } from '../types';
import { AbstractBaseService } from './BaseService';
import ServiceRegistry from './ServiceRegistry';
import config from '../config';

/**
 * Service for tracking message engagement
 * Tracks messages, reactions, and read status
 */
export class MessageTrackerService extends AbstractBaseService {
    private messages: Map<string, MessageData>;
    private channelMembers: Map<string, Collection<string, GuildMember>>;
    private syncInterval: NodeJS.Timeout | null = null;
    private lastCleanup: number = Date.now();

    constructor() {
        super();
        this.messages = new Map();
        this.channelMembers = new Map();
    }

    /**
     * Initialize the service
     * This method is called when the service is registered with the container
     */
    public async initialize(): Promise<void> {
        await this.loadFromDatabase();
        this.setupSyncInterval();
        console.log('MessageTrackerService initialized');
    }

    /**
     * Shutdown the service
     * This method is called when the application is shutting down
     */
    public async shutdown(): Promise<void> {
        this.forceSyncToDatabase();
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        console.log('MessageTrackerService shutdown');
    }

    /**
     * Load data from database on startup
     */
    private async loadFromDatabase(): Promise<void> {
        try {
            console.log('Loading message data from database...');
            const database = ServiceRegistry.getDatabaseService();
            const messages = database.loadAllMessages();
            
            for (const message of messages) {
                this.messages.set(message.messageId, message);
            }
            
            console.log(`Loaded ${messages.length} messages from database`);
        } catch (error) {
            console.error('Error loading from database:', error);
        }
    }

    /**
     * Set up periodic sync with database
     */
    private setupSyncInterval(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.syncToDatabase();
            
            // Check if cleanup is needed
            const now = Date.now();
            const cleanupIntervalMs = config.engagement.cleanup.runIntervalHours * 60 * 60 * 1000;
            
            if (config.engagement.cleanup.enabled && 
                now - this.lastCleanup > cleanupIntervalMs) {
                this.cleanupOldMessages();
                this.lastCleanup = now;
            }
        }, config.database.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }

    /**
     * Sync in-memory data to database
     */
    private syncToDatabase(): void {
        try {
            if (this.messages.size === 0) return;
            
            const database = ServiceRegistry.getDatabaseService();
            const messagesToSync = Array.from(this.messages.values());
            database.bulkSaveMessages(messagesToSync);
            
            // Save channel members
            for (const [channelId, members] of this.channelMembers.entries()) {
                for (const [userId, member] of members) {
                    database.saveChannelMember({
                        channel_id: channelId,
                        user_id: userId,
                        username: member.user.username
                    });
                }
            }
        } catch (error) {
            console.error('Error syncing to database:', error);
        }
    }

    /**
     * Initialize tracking for a new message
     * @param message The message to track
     * @param channelMembersList The list of members in the channel
     */
    public trackMessage(message: Message, channelMembersList: Collection<string, GuildMember>): void {
        this.messages.set(message.id, {
            messageId: message.id,
            channelId: message.channel.id,
            timestamp: message.createdTimestamp || Date.now(),
            reactions: new Map(),
            readBy: new Set(),
            totalMembers: channelMembersList.size
        });

        this.channelMembers.set(message.channel.id, channelMembersList);
        
        // Save to database
        const database = ServiceRegistry.getDatabaseService();
        database.saveMessage({
            id: message.id,
            channel_id: message.channel.id,
            timestamp: message.createdTimestamp || Date.now(),
            total_members: channelMembersList.size
        });
    }

    /**
     * Process existing reactions for a message
     * @param message The message to process
     */
    public async processExistingReactions(message: Message): Promise<void> {
        const messageData = this.messages.get(message.id);
        if (!messageData) return;

        const database = ServiceRegistry.getDatabaseService();
        for (const [_, reaction] of message.reactions.cache) {
            const users = await reaction.users.fetch();
            const emojiName = reaction.emoji.name || reaction.emoji.identifier;
            if (!messageData.reactions.has(emojiName)) {
                messageData.reactions.set(emojiName, new Set());
            }
            
            for (const [userId, _] of users) {
                messageData.reactions.get(emojiName)?.add(userId);
                messageData.readBy.add(userId);
                
                // Save to database
                database.saveReaction({
                    message_id: message.id,
                    emoji: emojiName,
                    user_id: userId
                });
                
                database.saveReadStatus({
                    message_id: message.id,
                    user_id: userId,
                    timestamp: Date.now()
                });
            }
        }
    }

    /**
     * Add a reaction to a message
     * @param messageId The message ID
     * @param emojiName The emoji name
     * @param userId The user ID
     */
    public addReaction(messageId: string, emojiName: string | null, userId: string): void {
        const messageData = this.messages.get(messageId);
        if (!messageData) return;

        const emoji = emojiName || 'unknown_emoji';
        if (!messageData.reactions.has(emoji)) {
            messageData.reactions.set(emoji, new Set());
        }
        messageData.reactions.get(emoji)?.add(userId);
        messageData.readBy.add(userId);
        
        // Save to database
        const database = ServiceRegistry.getDatabaseService();
        database.saveReaction({
            message_id: messageId,
            emoji: emoji,
            user_id: userId
        });
        
        database.saveReadStatus({
            message_id: messageId,
            user_id: userId,
            timestamp: Date.now()
        });
    }

    /**
     * Remove a reaction from a message
     * @param messageId The message ID
     * @param emojiName The emoji name
     * @param userId The user ID
     */
    public removeReaction(messageId: string, emojiName: string | null, userId: string): void {
        const messageData = this.messages.get(messageId);
        if (!messageData) return;

        const emoji = emojiName || 'unknown_emoji';
        if (messageData.reactions.has(emoji)) {
            messageData.reactions.get(emoji)?.delete(userId);
            
            // Remove from database
            const database = ServiceRegistry.getDatabaseService();
            database.removeReaction(messageId, emoji, userId);
        }
    }

    /**
     * Get message data
     * @param messageId The message ID
     * @returns The message data
     */
    public getMessage(messageId: string): MessageData | undefined {
        // First try in-memory cache
        let messageData = this.messages.get(messageId);
        
        // If not found, try loading from database
        if (!messageData) {
            const database = ServiceRegistry.getDatabaseService();
            const dbMessageData = database.loadMessageData(messageId);
            if (dbMessageData) {
                this.messages.set(messageId, dbMessageData);
                messageData = dbMessageData;
            }
        }
        
        return messageData;
    }

    /**
     * Get all tracked messages
     * @returns Array of all message data
     */
    public getAllMessages(): MessageData[] {
        return Array.from(this.messages.values());
    }

    /**
     * Get channel members
     * @param channelId The channel ID
     * @returns Collection of channel members
     */
    public getChannelMembers(channelId: string): Collection<string, GuildMember> | undefined {
        return this.channelMembers.get(channelId);
    }

    /**
     * Check if any messages are being tracked
     * @returns True if messages are being tracked
     */
    public hasMessages(): boolean {
        return this.messages.size > 0;
    }

    /**
     * Get total number of tracked messages
     * @returns Number of tracked messages
     */
    public getMessageCount(): number {
        return this.messages.size;
    }

    /**
     * Get current state
     * @returns The current state
     */
    public getState(): MessageTrackerState {
        return {
            messages: this.messages,
            channelMembers: this.channelMembers
        };
    }
    
    /**
     * Clean up old messages
     * @returns Number of messages removed
     */
    public cleanupOldMessages(): number {
        if (!config.engagement.cleanup.enabled) return 0;
        
        const maxAgeInDays = config.engagement.cleanup.maxMessageAgeInDays;
        const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
        let removedCount = 0;
        
        // Remove from memory
        for (const [messageId, data] of this.messages.entries()) {
            if (data.timestamp < cutoffTime) {
                this.messages.delete(messageId);
                removedCount++;
            }
        }
        
        // Remove from database
        const database = ServiceRegistry.getDatabaseService();
        const dbRemovedCount = database.deleteOldMessages(maxAgeInDays);
        
        console.log(`Cleaned up ${removedCount} old messages from memory and ${dbRemovedCount} from database`);
        return removedCount;
    }
    
    /**
     * Force sync to database (useful before shutdown)
     */
    public forceSyncToDatabase(): void {
        this.syncToDatabase();
    }
}

export default MessageTrackerService;
