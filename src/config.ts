import { GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import database from './services/database';

dotenv.config();

// Validate required environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('Missing DISCORD_BOT_TOKEN environment variable. Please check your .env file.');
    process.exit(1);
}

// Helper function to get non-sensitive settings from database or fallback to env vars
function getSetting(key: string, envVar?: string): string | undefined {
    // Try to get from database first
    const dbValue = database.getBotSetting(key);
    if (dbValue !== null) {
        return dbValue;
    }
    
    // Fallback to environment variable
    return envVar;
}

interface BotConfig {
    token: string;
    trackedChannelId?: string; // Now optional since it can be set via setup command
    adminChannelId?: string; // Optional admin channel for error notifications
    intents: (keyof typeof GatewayIntentBits)[];
    commandPrefix: string;
    commands: {
        checkEngagement: string;
        mostActive: string;
        mostInactive: string;
        setPrefix: string; // New command for customizing prefix
        report: string;    // New command for scheduled reports
    };
    defaults: {
        activityRankingCount: number;
        messagesFetchLimit: number;
        pageSize: number;  // For pagination
    };
    permissions: {
        adminCommands: string[]; // Commands that require admin permissions
        modCommands: string[];   // Commands that require moderator permissions
        adminRoleIds: string[];  // Role IDs that have admin command access
        modRoleIds: string[];    // Role IDs that have mod command access
    };
    engagement: {
        metrics: {
            readWeight: number;
            reactionWeight: number;
            firstReadBonus: number;
            earlyReaderPercentage: number; // Percentage threshold for early readers
        };
        cleanup: {
            enabled: boolean;
            maxMessageAgeInDays: number;
            runIntervalHours: number;
        };
    };
    database: {
        path: string;
        syncInterval: number; // Minutes between memory and DB syncs
    };
}

const config: BotConfig = {
    // Bot configuration - sensitive data always from env vars
    token: process.env.DISCORD_BOT_TOKEN,
    
    // Settings that can be updated via setup command - check database first
    trackedChannelId: getSetting('TRACKED_CHANNEL_ID', process.env.TRACKED_CHANNEL_ID) || '',
    adminChannelId: getSetting('ADMIN_CHANNEL_ID', process.env.ADMIN_CHANNEL_ID),
    
    // Discord.js intents
    intents: [
        'Guilds',
        'GuildMessages',
        'GuildMessageReactions',
        'GuildMembers',
        'MessageContent'
    ],

    // Command configuration
    commandPrefix: process.env.COMMAND_PREFIX || '!',
    commands: {
        checkEngagement: 'check-engagement',
        mostActive: 'most-active',
        mostInactive: 'most-inactive',
        setPrefix: 'set-prefix',
        report: 'schedule-report'
    },

    // Default values
    defaults: {
        activityRankingCount: 10,
        messagesFetchLimit: 100,
        pageSize: 10
    },

    // Command permissions
    permissions: {
        adminCommands: ['set-prefix', 'schedule-report'],
        modCommands: ['check-engagement', 'most-active', 'most-inactive'],
        adminRoleIds: getSetting('ADMIN_ROLE_IDS', process.env.ADMIN_ROLE_IDS)?.split(',') || [],
        modRoleIds: getSetting('MOD_ROLE_IDS', process.env.MOD_ROLE_IDS)?.split(',') || []
    },

    // Engagement metrics and settings
    engagement: {
        metrics: {
            readWeight: 1,
            reactionWeight: 1,
            firstReadBonus: 2,
            earlyReaderPercentage: 25 // Top 25% are considered early readers
        },
        cleanup: {
            enabled: true,
            maxMessageAgeInDays: 30,
            runIntervalHours: 24
        }
    },

    // Database settings
    database: {
        path: process.env.DATABASE_PATH || './data/engagement.db',
        syncInterval: 15 // Sync every 15 minutes
    }
};

export default config;
