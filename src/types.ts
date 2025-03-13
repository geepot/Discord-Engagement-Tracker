import { Collection, User, GuildMember } from 'discord.js';

// Message tracking types
export interface MessageData {
    messageId: string;
    channelId: string;
    timestamp: number;
    reactions: Map<string, Set<string>>; // emoji -> Set of userIds
    readBy: Set<string>;                 // Set of userIds
    totalMembers: number;
}

// User activity statistics
export interface UserStats {
    username: string;
    readCount: number;
    totalReactions: number;
    firstReadCount: number;
    lastActive: number;
    activityScore: number;
}

// Activity ranking result
export interface ActivityRankingResult {
    userId: string;
    username: string;
    readCount: number;
    totalReactions: number;
    firstReadCount: number;
    lastActive: number;
    activityScore: number;
}

// Message summary
export interface MessageSummary {
    messageId: string;
    totalMembers: number;
    readCount: number;
    unreadCount: number;
    reactions: ReactionCount[];
}

export interface ReactionCount {
    emoji: string;
    count: number;
}

// User details for message
export interface UserMessageDetails {
    readUsers: ReadUserDetail[];
    unreadUsers: UnreadUserDetail[];
}

export interface ReadUserDetail {
    name: string;
    reactions: string;
}

export interface UnreadUserDetail {
    name: string;
}

// Channel statistics
export interface ChannelStats {
    totalMembers: number;
    activeMembers: number;
}

// Activity metrics configuration
export interface ActivityMetrics {
    READ_WEIGHT: number;
    REACTION_WEIGHT: number;
    FIRST_READ_BONUS: number;
}

// Message tracker state
export interface MessageTrackerState {
    messages: Map<string, MessageData>;
    channelMembers: Map<string, Collection<string, GuildMember>>;
}

// Database types
export interface DbMessage {
    id: string;
    channel_id: string;
    timestamp: number;
    total_members: number;
}

export interface DbReaction {
    message_id: string;
    emoji: string;
    user_id: string;
}

export interface DbReadStatus {
    message_id: string;
    user_id: string;
    timestamp: number;
}

export interface DbChannelMember {
    channel_id: string;
    user_id: string;
    username: string;
}

export interface DbGuildPrefix {
    guild_id: string;
    prefix: string;
}

export interface DbScheduledReport {
    id: number;
    guild_id: string;
    channel_id: string;
    frequency: string; // 'daily', 'weekly', 'monthly'
    next_run: number;
    report_type: string; // 'engagement', 'activity'
}

// Bot settings stored in database
export interface DbBotSetting {
    key: string;
    value: string;
}
