import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
import { 
    DbMessage, 
    DbReaction, 
    DbReadStatus, 
    DbChannelMember,
    DbGuildPrefix,
    DbScheduledReport,
    MessageData
} from '../types';

class DatabaseService {
    private db: Database.Database;
    private initialized: boolean = false;

    constructor() {
        // Get database path from environment variable
        const dbPath = process.env.DATABASE_PATH || './data/engagement.db';
        
        // Ensure the data directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // Initialize the database
        this.db = new Database(dbPath);
        this.setupDatabase();
    }

    private setupDatabase(): void {
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
        } catch (error) {
            console.error('Error setting up database:', error);
            throw new Error('Failed to initialize database');
        }
    }

    // Message operations
    public saveMessage(message: DbMessage): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO messages (id, channel_id, timestamp, total_members)
                VALUES (?, ?, ?, ?)
            `);
            stmt.run(message.id, message.channel_id, message.timestamp, message.total_members);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    public getMessages(channelId?: string): DbMessage[] {
        try {
            let query = 'SELECT * FROM messages';
            let params: any[] = [];
            
            if (channelId) {
                query += ' WHERE channel_id = ?';
                params.push(channelId);
            }
            
            query += ' ORDER BY timestamp DESC';
            
            const stmt = this.db.prepare(query);
            return stmt.all(...params) as DbMessage[];
        } catch (error) {
            console.error('Error getting messages:', error);
            return [];
        }
    }

    public getMessage(messageId: string): DbMessage | null {
        try {
            const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
            return stmt.get(messageId) as DbMessage || null;
        } catch (error) {
            console.error('Error getting message:', error);
            return null;
        }
    }

    public deleteOldMessages(maxAgeInDays: number): number {
        try {
            const cutoffTime = Date.now() - (maxAgeInDays * 24 * 60 * 60 * 1000);
            const stmt = this.db.prepare('DELETE FROM messages WHERE timestamp < ?');
            const result = stmt.run(cutoffTime);
            return result.changes;
        } catch (error) {
            console.error('Error deleting old messages:', error);
            return 0;
        }
    }

    // Reaction operations
    public saveReaction(reaction: DbReaction): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO reactions (message_id, emoji, user_id)
                VALUES (?, ?, ?)
            `);
            stmt.run(reaction.message_id, reaction.emoji, reaction.user_id);
        } catch (error) {
            console.error('Error saving reaction:', error);
        }
    }

    public removeReaction(messageId: string, emoji: string, userId: string): void {
        try {
            const stmt = this.db.prepare(`
                DELETE FROM reactions 
                WHERE message_id = ? AND emoji = ? AND user_id = ?
            `);
            stmt.run(messageId, emoji, userId);
        } catch (error) {
            console.error('Error removing reaction:', error);
        }
    }

    public getReactions(messageId: string): DbReaction[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM reactions WHERE message_id = ?');
            return stmt.all(messageId) as DbReaction[];
        } catch (error) {
            console.error('Error getting reactions:', error);
            return [];
        }
    }

    // Read status operations
    public saveReadStatus(readStatus: DbReadStatus): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO read_status (message_id, user_id, timestamp)
                VALUES (?, ?, ?)
            `);
            stmt.run(readStatus.message_id, readStatus.user_id, readStatus.timestamp);
        } catch (error) {
            console.error('Error saving read status:', error);
        }
    }

    public getReadStatuses(messageId: string): DbReadStatus[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM read_status WHERE message_id = ?');
            return stmt.all(messageId) as DbReadStatus[];
        } catch (error) {
            console.error('Error getting read statuses:', error);
            return [];
        }
    }

    // Channel member operations
    public saveChannelMember(member: DbChannelMember): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO channel_members (channel_id, user_id, username)
                VALUES (?, ?, ?)
            `);
            stmt.run(member.channel_id, member.user_id, member.username);
        } catch (error) {
            console.error('Error saving channel member:', error);
        }
    }

    public getChannelMembers(channelId: string): DbChannelMember[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM channel_members WHERE channel_id = ?');
            return stmt.all(channelId) as DbChannelMember[];
        } catch (error) {
            console.error('Error getting channel members:', error);
            return [];
        }
    }

    // Guild prefix operations
    public saveGuildPrefix(guildId: string, prefix: string): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO guild_prefixes (guild_id, prefix)
                VALUES (?, ?)
            `);
            stmt.run(guildId, prefix);
        } catch (error) {
            console.error('Error saving guild prefix:', error);
        }
    }

    public getGuildPrefix(guildId: string): string | null {
        try {
            const stmt = this.db.prepare('SELECT prefix FROM guild_prefixes WHERE guild_id = ?');
            const result = stmt.get(guildId) as { prefix: string } | undefined;
            return result ? result.prefix : null;
        } catch (error) {
            console.error('Error getting guild prefix:', error);
            return null;
        }
    }

    // Scheduled report operations
    public saveScheduledReport(report: Omit<DbScheduledReport, 'id'>): number {
        try {
            const stmt = this.db.prepare(`
                INSERT INTO scheduled_reports (guild_id, channel_id, frequency, next_run, report_type)
                VALUES (?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                report.guild_id, 
                report.channel_id, 
                report.frequency, 
                report.next_run, 
                report.report_type
            );
            return result.lastInsertRowid as number;
        } catch (error) {
            console.error('Error saving scheduled report:', error);
            return -1;
        }
    }

    public updateScheduledReport(report: DbScheduledReport): void {
        try {
            const stmt = this.db.prepare(`
                UPDATE scheduled_reports 
                SET guild_id = ?, channel_id = ?, frequency = ?, next_run = ?, report_type = ?
                WHERE id = ?
            `);
            stmt.run(
                report.guild_id, 
                report.channel_id, 
                report.frequency, 
                report.next_run, 
                report.report_type,
                report.id
            );
        } catch (error) {
            console.error('Error updating scheduled report:', error);
        }
    }

    public getScheduledReports(): DbScheduledReport[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM scheduled_reports ORDER BY next_run');
            return stmt.all() as DbScheduledReport[];
        } catch (error) {
            console.error('Error getting scheduled reports:', error);
            return [];
        }
    }

    public getDueReports(currentTime: number): DbScheduledReport[] {
        try {
            const stmt = this.db.prepare('SELECT * FROM scheduled_reports WHERE next_run <= ?');
            return stmt.all(currentTime) as DbScheduledReport[];
        } catch (error) {
            console.error('Error getting due reports:', error);
            return [];
        }
    }

    public deleteScheduledReport(id: number): void {
        try {
            const stmt = this.db.prepare('DELETE FROM scheduled_reports WHERE id = ?');
            stmt.run(id);
        } catch (error) {
            console.error('Error deleting scheduled report:', error);
        }
    }

    // Bulk operations for syncing memory state with database
    public bulkSaveMessages(messages: MessageData[]): void {
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
            const transaction = this.db.transaction((messages: MessageData[]) => {
                for (const message of messages) {
                    // Insert message
                    insertMessage.run(
                        message.messageId,
                        message.channelId,
                        message.timestamp,
                        message.totalMembers
                    );
                    
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
        } catch (error) {
            console.error('Error in bulk save operation:', error);
        }
    }

    public loadMessageData(messageId: string): MessageData | null {
        try {
            // Get the message
            const message = this.getMessage(messageId);
            if (!message) return null;
            
            // Get reactions
            const reactions = this.getReactions(messageId);
            const reactionMap = new Map<string, Set<string>>();
            
            for (const reaction of reactions) {
                if (!reactionMap.has(reaction.emoji)) {
                    reactionMap.set(reaction.emoji, new Set<string>());
                }
                reactionMap.get(reaction.emoji)?.add(reaction.user_id);
            }
            
            // Get read statuses
            const readStatuses = this.getReadStatuses(messageId);
            const readBy = new Set<string>();
            
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
        } catch (error) {
            console.error('Error loading message data:', error);
            return null;
        }
    }

    public loadAllMessages(): MessageData[] {
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
            }).filter(Boolean) as MessageData[];
        } catch (error) {
            console.error('Error loading all messages:', error);
            return [];
        }
    }

    // Database maintenance
    public vacuum(): void {
        try {
            this.db.exec('VACUUM');
            console.log('Database vacuumed successfully');
        } catch (error) {
            console.error('Error vacuuming database:', error);
        }
    }

    // Bot settings operations
    public saveBotSetting(key: string, value: string): void {
        try {
            const stmt = this.db.prepare(`
                INSERT OR REPLACE INTO bot_settings (key, value)
                VALUES (?, ?)
            `);
            stmt.run(key, value);
            console.log(`Saved bot setting: ${key}=${value}`);
        } catch (error) {
            console.error('Error saving bot setting:', error);
        }
    }

    public getBotSetting(key: string): string | null {
        try {
            const stmt = this.db.prepare('SELECT value FROM bot_settings WHERE key = ?');
            const result = stmt.get(key) as { value: string } | undefined;
            return result ? result.value : null;
        } catch (error) {
            console.error(`Error getting bot setting for key ${key}:`, error);
            return null;
        }
    }

    public getAllBotSettings(): Map<string, string> {
        try {
            const stmt = this.db.prepare('SELECT key, value FROM bot_settings');
            const results = stmt.all() as { key: string, value: string }[];
            
            const settingsMap = new Map<string, string>();
            for (const result of results) {
                settingsMap.set(result.key, result.value);
            }
            
            return settingsMap;
        } catch (error) {
            console.error('Error getting all bot settings:', error);
            return new Map();
        }
    }

    public close(): void {
        try {
            this.db.close();
            console.log('Database connection closed');
        } catch (error) {
            console.error('Error closing database:', error);
        }
    }
}

// Export a singleton instance
export default new DatabaseService();
