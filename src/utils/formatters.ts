import { TextChannel } from 'discord.js';
import { MessageSummary, UserMessageDetails, ActivityRankingResult } from '../types';
import config from '../config';

// Format message engagement summary
export function formatMessageSummary(summary: MessageSummary, userDetails: UserMessageDetails): string {
    let text = `**Message ID: ${summary.messageId}**\n`;
    text += `Total Members: ${summary.totalMembers}\n`;
    text += `Reactions: ${summary.reactions.map(r => `${r.emoji}: ${r.count}`).join(', ') || 'None'}\n\n`;

    // Format read users table
    if (userDetails.readUsers.length > 0) {
        text += '**Users who have read:**\n```\n';
        text += 'Username'.padEnd(20) + 'Reactions\n';
        text += '─'.repeat(40) + '\n';
        
        userDetails.readUsers.forEach(user => {
            text += user.name.padEnd(20) + (user.reactions || 'None') + '\n';
        });
        text += '```\n';
    }

    // Format unread users table
    if (userDetails.unreadUsers.length > 0) {
        text += '**Users who have not read:**\n```\n';
        text += 'Username\n';
        text += '─'.repeat(20) + '\n';
        
        userDetails.unreadUsers.forEach(user => {
            text += user.name + '\n';
        });
        text += '```';
    }

    return text;
}

// Format activity ranking table with detailed metrics
export function formatActivityRanking(
    users: ActivityRankingResult[], 
    count: number, 
    mostActive: boolean, 
    page: number = 1,
    totalUsers: number = users.length
): string {
    const pageSize = config.defaults.pageSize;
    const totalPages = Math.ceil(totalUsers / pageSize);
    
    let text = `**${mostActive ? 'Most Active' : 'Most Inactive'} Users`;
    text += ` (Page ${page}/${totalPages}, Showing ${users.length} of ${totalUsers})**\n\`\`\`\n`;
    
    // Header
    text += 'Username'.padEnd(20) +
            'Messages'.padEnd(10) +
            'Reactions'.padEnd(11) +
            'Early'.padEnd(7) +
            'Score\n';
    
    text += '─'.repeat(53) + '\n';

    // User rows
    users.forEach(user => {
        text += user.username.padEnd(20) +
               user.readCount.toString().padEnd(10) +
               user.totalReactions.toString().padEnd(11) +
               user.firstReadCount.toString().padEnd(7) +
               user.activityScore.toString() + '\n';
    });

    // Legend
    text += '\n' + '─'.repeat(53) + '\n';
    text += 'Messages: Number of messages read\n';
    text += 'Reactions: Total reactions given\n';
    text += 'Early: Times among first 25% to read\n';
    text += 'Score: Weighted activity score\n';
    
    text += '```';
    return text;
}

// Split long messages for Discord's character limit
export async function sendLongMessage(channel: TextChannel, text: string): Promise<void> {
    if (text.length <= 1900) {
        await channel.send(text);
        return;
    }

    const messages: string[] = [];
    while (text.length > 0) {
        let chunk = text.slice(0, 1900);
        // Try to split at a newline if possible
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline !== -1 && text.length > 1900) {
            chunk = chunk.slice(0, lastNewline);
        }
        messages.push(chunk);
        text = text.slice(chunk.length);
    }
    
    for (const msg of messages) {
        await channel.send(msg);
    }
}
