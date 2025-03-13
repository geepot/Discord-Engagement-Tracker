"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("./database"));
const config_1 = __importDefault(require("../config"));
class MessageTracker {
    constructor() {
        this.syncInterval = null;
        this.lastCleanup = Date.now();
        this.messages = new Map();
        this.channelMembers = new Map();
        this.loadFromDatabase();
        this.setupSyncInterval();
    }
    // Load data from database on startup
    async loadFromDatabase() {
        try {
            console.log('Loading message data from database...');
            const messages = database_1.default.loadAllMessages();
            for (const message of messages) {
                this.messages.set(message.messageId, message);
            }
            console.log(`Loaded ${messages.length} messages from database`);
        }
        catch (error) {
            console.error('Error loading from database:', error);
        }
    }
    // Set up periodic sync with database
    setupSyncInterval() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.syncInterval = setInterval(() => {
            this.syncToDatabase();
            // Check if cleanup is needed
            const now = Date.now();
            const cleanupIntervalMs = config_1.default.engagement.cleanup.runIntervalHours * 60 * 60 * 1000;
            if (config_1.default.engagement.cleanup.enabled &&
                now - this.lastCleanup > cleanupIntervalMs) {
                this.cleanupOldMessages();
                this.lastCleanup = now;
            }
        }, config_1.default.database.syncInterval * 60 * 1000); // Convert minutes to milliseconds
    }
    // Sync in-memory data to database
    syncToDatabase() {
        try {
            if (this.messages.size === 0)
                return;
            const messagesToSync = Array.from(this.messages.values());
            database_1.default.bulkSaveMessages(messagesToSync);
            // Save channel members
            for (const [channelId, members] of this.channelMembers.entries()) {
                for (const [userId, member] of members) {
                    database_1.default.saveChannelMember({
                        channel_id: channelId,
                        user_id: userId,
                        username: member.user.username
                    });
                }
            }
        }
        catch (error) {
            console.error('Error syncing to database:', error);
        }
    }
    // Initialize tracking for a new message
    trackMessage(message, channelMembersList) {
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
        database_1.default.saveMessage({
            id: message.id,
            channel_id: message.channel.id,
            timestamp: message.createdTimestamp || Date.now(),
            total_members: channelMembersList.size
        });
    }
    // Process existing reactions for a message
    async processExistingReactions(message) {
        const messageData = this.messages.get(message.id);
        if (!messageData)
            return;
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
                database_1.default.saveReaction({
                    message_id: message.id,
                    emoji: emojiName,
                    user_id: userId
                });
                database_1.default.saveReadStatus({
                    message_id: message.id,
                    user_id: userId,
                    timestamp: Date.now()
                });
            }
        }
    }
    // Add a reaction to a message
    addReaction(messageId, emojiName, userId) {
        const messageData = this.messages.get(messageId);
        if (!messageData)
            return;
        const emoji = emojiName || 'unknown_emoji';
        if (!messageData.reactions.has(emoji)) {
            messageData.reactions.set(emoji, new Set());
        }
        messageData.reactions.get(emoji)?.add(userId);
        messageData.readBy.add(userId);
        // Save to database
        database_1.default.saveReaction({
            message_id: messageId,
            emoji: emoji,
            user_id: userId
        });
        database_1.default.saveReadStatus({
            message_id: messageId,
            user_id: userId,
            timestamp: Date.now()
        });
    }
    // Remove a reaction from a message
    removeReaction(messageId, emojiName, userId) {
        const messageData = this.messages.get(messageId);
        if (!messageData)
            return;
        const emoji = emojiName || 'unknown_emoji';
        if (messageData.reactions.has(emoji)) {
            messageData.reactions.get(emoji)?.delete(userId);
            // Remove from database
            database_1.default.removeReaction(messageId, emoji, userId);
        }
    }
    // Get message data
    getMessage(messageId) {
        // First try in-memory cache
        let messageData = this.messages.get(messageId);
        // If not found, try loading from database
        if (!messageData) {
            const dbMessageData = database_1.default.loadMessageData(messageId);
            if (dbMessageData) {
                this.messages.set(messageId, dbMessageData);
                messageData = dbMessageData;
            }
        }
        return messageData;
    }
    // Get all tracked messages
    getAllMessages() {
        return Array.from(this.messages.values());
    }
    // Get channel members
    getChannelMembers(channelId) {
        return this.channelMembers.get(channelId);
    }
    // Check if any messages are being tracked
    hasMessages() {
        return this.messages.size > 0;
    }
    // Get total number of tracked messages
    getMessageCount() {
        return this.messages.size;
    }
    // Get current state
    getState() {
        return {
            messages: this.messages,
            channelMembers: this.channelMembers
        };
    }
    // Clean up old messages
    cleanupOldMessages() {
        if (!config_1.default.engagement.cleanup.enabled)
            return 0;
        const maxAgeInDays = config_1.default.engagement.cleanup.maxMessageAgeInDays;
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
        const dbRemovedCount = database_1.default.deleteOldMessages(maxAgeInDays);
        console.log(`Cleaned up ${removedCount} old messages from memory and ${dbRemovedCount} from database`);
        return removedCount;
    }
    // Force sync to database (useful before shutdown)
    forceSyncToDatabase() {
        this.syncToDatabase();
    }
}
// Export a singleton instance
exports.default = new MessageTracker();
