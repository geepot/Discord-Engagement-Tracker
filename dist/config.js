"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettingsFromDatabase = updateSettingsFromDatabase;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Validate required environment variables
if (!process.env.DISCORD_BOT_TOKEN) {
    console.error('Missing DISCORD_BOT_TOKEN environment variable. Please check your .env file.');
    process.exit(1);
}
// This will be populated after database initialization
let databaseSettings = new Map();
// Function to update settings from database after initialization
function updateSettingsFromDatabase(settings) {
    databaseSettings = settings;
}
// Helper function to get settings (will be used after database is initialized)
function getSetting(key) {
    return databaseSettings.get(key);
}
const config = {
    // Bot configuration - sensitive data always from env vars
    token: process.env.DISCORD_BOT_TOKEN,
    // Settings that can be updated via setup command
    trackedChannelId: '', // Will be loaded from database after initialization
    adminChannelId: undefined, // Will be loaded from database after initialization
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
        adminRoleIds: [], // Will be loaded from database after initialization
        modRoleIds: [] // Will be loaded from database after initialization
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
exports.default = config;
