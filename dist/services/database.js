"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
class DatabaseService {
    constructor() {
        this.initialized = false;
        // Get database path from environment variable
        const dbPath = process.env.DATABASE_PATH || './data/engagement.db';
        // Ensure the data directory exists
        const dbDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dbDir)) {
            fs_1.default.mkdirSync(dbDir, { recursive: true });
        }
        // Initialize the database
        this.db = new better_sqlite3_1.default(dbPath);
        this.setupDatabase();
    }
    setupDatabase() {
        try {
            // Enable foreign keys
            this.db.pragma('foreign_keys = ON');
            // Create tables if they don't exist
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    channel_id TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    total_members INTEGER NOT NULL
                );

                CREATE TABLE IF NOT EXISTS reactions (
                    message_id TEXT NOT NULL,
                    emoji TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    PRIMARY KEY (message_id, emoji, user_id),
                    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS read_status (
                    message_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    timestamp INTEGER NOT NULL,
                    PRIMARY KEY (message_id, user_id),
                    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS channel_members (
                    channel_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    username TEXT NOT NULL,
                    PRIMARY KEY (channel_id, user_id)
                );

                CREATE TABLE IF NOT EXISTS guild_prefixes (
                    guild_id TEXT PRIMARY KEY,
                    prefix TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS scheduled_reports (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    frequency TEXT NOT NULL,
                    next_run INTEGER NOT NULL,
                    report_type TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS bot_settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions(message_id);
                CREATE INDEX IF NOT EXISTS idx_read_status_message_id ON read_status(message_id);
                CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON channel_members(channel_id);
                CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run);
            `);
            this.initialized = true;
            console.log('Database initialized successfully');
        }
        catch (error) {
            console.error('Error setting up database:', error);
            throw new Error('Failed to initialize database');
        }
    }
    // Message operations
    saveMessage(message) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO messages (id, channel_id, timestamp, total_members)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(message.id, message.channel_id, message.timestamp, message.total_members);
        }
        catch (error) {
            console.error('Error saving message:', error);
        }
    }
    getMessages(channelId) {
        try {
            let query = 'SELECT * FROM messages';
            let params = [];
            if (channelId) {
                query += ' WHERE channel_id = ?';
                params.push(channelId);
            }
            query += ' ORDER BY timestamp DESC';
            const stmt = this.db.prepare(query);
            return stmt.all(...params);
        }
        catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }
    getMessage(messageId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
            return stmt.get(messageId) || null;
        }
        catch (error) {
            console.error('Error getting message:', error);
            return null;
        }
    }
    deleteOldMessages(maxAgeInDays) {
        try {
            const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
            const stmt = this.db.prepare('DELETE FROM messages WHERE timestamp < ?');
            const result = stmt.run(cutoffTime);
            return result.changes;
        }
        catch (error) {
            console.error('Error deleting old messages:', error);
            return 0;
        }
    }
    // Reaction operations
    saveReaction(reaction) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO reactions (message_id, emoji, user_id)
                VALUES (?, ?, ?)
            `);
            stmt.run(reaction.message_id, reaction.emoji, reaction.user_id);
        }
        catch (error) {
            console.error('Error saving reaction:', error);
        }
    }
    removeReaction(messageId, emoji, userId) {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM reactions 
                WHERE message_id = ? AND emoji = ? AND user_id = ?
            `);
            stmt.run(messageId, emoji, userId);
        }
        catch (error) {
            console.error('Error removing reaction:', error);
        }
    }
    getReactions(messageId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM reactions WHERE message_id = ?');
            return stmt.all(messageId);
        }
        catch (error) {
            console.error('Error getting reactions:', error);
            return [];
        }
    }
    // Read status operations
    saveReadStatus(readStatus) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO read_status (message_id, user_id, timestamp)
                VALUES (?, ?, ?)
            `);
            stmt.run(readStatus.message_id, readStatus.user_id, readStatus.timestamp);
        }
        catch (error) {
            console.error('Error saving read status:', error);
        }
    }
    getReadStatuses(messageId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM read_status WHERE message_id = ?');
            return stmt.all(messageId);
        }
        catch (error) {
            console.error('Error getting read statuses:', error);
            return [];
        }
    }
    // Channel member operations
    saveChannelMember(member) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO channel_members (channel_id, user_id, username)
                VALUES (?, ?, ?)
            `);
            stmt.run(member.channel_id, member.user_id, member.username);
        }
        catch (error) {
            console.error('Error saving channel member:', error);
        }
    }
    getChannelMembers(channelId) {
        try {
            const stmt = this.db.prepare('SELECT * FROM channel_members WHERE channel_id = ?');
            return stmt.all(channelId);
        }
        catch (error) {
            console.error('Error getting channel members:', error);
            return [];
        }
    }
    // Guild prefix operations
    saveGuildPrefix(guildId, prefix) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO guild_prefixes (guild_id, prefix)
                VALUES (?, ?)
            `);
            stmt.run(guildId, prefix);
        }
        catch (error) {
            console.error('Error saving guild prefix:', error);
        }
    }
    getGuildPrefix(guildId) {
        try {
            const stmt = this.db.prepare('SELECT prefix FROM guild_prefixes WHERE guild_id = ?');
            const result = stmt.get(guildId);
            return result ? result.prefix : null;
        }
        catch (error) {
            console.error('Error getting guild prefix:', error);
            return null;
        }
    }
    // Scheduled report operations
    saveScheduledReport(report) {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO scheduled_reports (guild_id, channel_id, frequency, next_run, report_type)
                VALUES (?, ?, ?, ?, ?)
            `);
            const result = stmt.run(report.guild_id, report.channel_id, report.frequency, report.next_run, report.report_type);
            return result.lastInsertRowid;
        }
        catch (error) {
            console.error('Error saving scheduled report:', error);
            return -1;
        }
    }
    updateScheduledReport(report) {
        try {
            const stmt = this.db.prepare(`
                UPDATE scheduled_reports 
                SET guild_id = ?, channel_id = ?, frequency = ?, next_run = ?, report_type = ?
                WHERE id = ?
            `);
            stmt.run(report.guild_id, report.channel_id, report.frequency, report.next_run, report.report_type, report.id);
        }
        catch (error) {
            console.error('Error updating scheduled report:', error);
        }
    }
    getScheduledReports() {
        try {
            const stmt = this.db.prepare('SELECT * FROM scheduled_reports ORDER BY next_run');
            return stmt.all();
        }
        catch (error) {
            console.error('Error getting scheduled reports:', error);
            return [];
        }
    }
    getDueReports(currentTime) {
        try {
            const stmt = this.db.prepare('SELECT * FROM scheduled_reports WHERE next_run <= ?');
            return stmt.all(currentTime);
        }
        catch (error) {
            console.error('Error getting due reports:', error);
            return [];
        }
    }
    deleteScheduledReport(id) {
        try {
            const stmt = this.db.prepare('DELETE FROM scheduled_reports WHERE id = ?');
            stmt.run(id);
        }
        catch (error) {
            console.error('Error deleting scheduled report:', error);
        }
    }
    // Bulk operations for syncing memory state with database
    bulkSaveMessages(messages) {
        try {
            const insertMessage = this.db.prepare(`
                INSERT OR REPLACE INTO messages (id, channel_id, timestamp, total_members)
                VALUES (?, ?, ?, ?)
            `);
            const insertReaction = this.db.prepare(`
                INSERT OR REPLACE INTO reactions (message_id, emoji, user_id)
                VALUES (?, ?, ?)
            `);
            const insertReadStatus = this.db.prepare(`
                INSERT OR REPLACE INTO read_status (message_id, user_id, timestamp)
                VALUES (?, ?, ?)
            `);
            // Use a transaction for better performance
            const transaction = this.db.transaction((messages) => {
                for (const message of messages) {
                    // Insert message
                    insertMessage.run(message.messageId, message.channelId, message.timestamp, message.totalMembers);
                    // Insert reactions
                    for (const [emoji, userIds] of message.reactions.entries()) {
                        for (const userId of userIds) {
                            insertReaction.run(message.messageId, emoji, userId);
                        }
                    }
                    // Insert read statuses
                    for (const userId of message.readBy) {
                        insertReadStatus.run(message.messageId, userId, message.timestamp);
                    }
                }
            });
            transaction(messages);
            console.log(`Bulk saved ${messages.length} messages to database`);
        }
        catch (error) {
            console.error('Error in bulk save operation:', error);
        }
    }
    loadMessageData(messageId) {
        try {
            // Get the message
            const message = this.getMessage(messageId);
            if (!message)
                return null;
            // Get reactions
            const reactions = this.getReactions(messageId);
            const reactionMap = new Map();
            for (const reaction of reactions) {
                if (!reactionMap.has(reaction.emoji)) {
                    reactionMap.set(reaction.emoji, new Set());
                }
                reactionMap.get(reaction.emoji)?.add(reaction.user_id);
            }
            // Get read statuses
            const readStatuses = this.getReadStatuses(messageId);
            const readBy = new Set();
            for (const status of readStatuses) {
                readBy.add(status.user_id);
            }
            return {
                messageId: message.id,
                channelId: message.channel_id,
                timestamp: message.timestamp,
                totalMembers: message.total_members,
                reactions: reactionMap,
                readBy: readBy
            };
        }
        catch (error) {
            console.error('Error loading message data:', error);
            return null;
        }
    }
    loadAllMessages() {
        try {
            const messages = this.getMessages();
            return messages.map(msg => {
                const messageData = this.loadMessageData(msg.id);
                if (!messageData) {
                    // Create a minimal message data object if full data can't be loaded
                    return {
                        messageId: msg.id,
                        channelId: msg.channel_id,
                        timestamp: msg.timestamp,
                        totalMembers: msg.total_members,
                        reactions: new Map(),
                        readBy: new Set()
                    };
                }
                return messageData;
            }).filter(Boolean);
        }
        catch (error) {
            console.error('Error loading all messages:', error);
            return [];
        }
    }
    // Database maintenance
    vacuum() {
        try {
            this.db.exec('VACUUM');
            console.log('Database vacuumed successfully');
        }
        catch (error) {
            console.error('Error vacuuming database:', error);
        }
    }
    // Bot settings operations
    saveBotSetting(key, value) {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO bot_settings (key, value)
                VALUES (?, ?)
            `);
            stmt.run(key, value);
            console.log(`Saved bot setting: ${key}=${value}`);
        }
        catch (error) {
            console.error('Error saving bot setting:', error);
        }
    }
    getBotSetting(key) {
        try {
            const stmt = this.db.prepare('SELECT value FROM bot_settings WHERE key = ?');
            const result = stmt.get(key);
            return result ? result.value : null;
        }
        catch (error) {
            console.error(`Error getting bot setting for key ${key}:`, error);
            return null;
        }
    }
    getAllBotSettings() {
        try {
            const stmt = this.db.prepare('SELECT key, value FROM bot_settings');
            const results = stmt.all();
            const settingsMap = new Map();
            for (const result of results) {
                settingsMap.set(result.key, result.value);
            }
            return settingsMap;
        }
        catch (error) {
            console.error('Error getting all bot settings:', error);
            return new Map();
        }
    }
    close() {
        try {
            this.db.close();
            console.log('Database connection closed');
        }
        catch (error) {
            console.error('Error closing database:', error);
        }
    }
}
// Export a singleton instance
exports.default = new DatabaseService();
