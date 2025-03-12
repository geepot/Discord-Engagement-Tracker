import { TextChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { MessageSummary, UserMessageDetails, ActivityRankingResult } from '../types';
import config from '../config';

// Format message engagement summary
export function formatMessageSummary(summary: MessageSummary, userDetails: UserMessageDetails): string {
    let text = `**Message ID: ${summary.messageId}**\n`;
    text += `Total Members: ${summary.totalMembers}\n`;
    text += `Reactions: ${summary.reactions.map(r => `${r.emoji}: ${r.count}`).join(', ') || 'None'}\n\n`;

// Format read users table
if (userDetails.readUsers.length > 0) {
    text += '**Users who have reacted (marked as read):**\n```\n';
    text += 'Username'.padEnd(20) + 'Reactions\n';
    text += '─'.repeat(40) + '\n';
    
    // Calculate the maximum characters we can use for the list
    const maxMessageLength = 1900;
    const currentLength = text.length;
    const codeBlockEnd = '```\n'.length;
    const andMoreText = '\nand xxx more'.length;
    const maxListLength = maxMessageLength - currentLength - codeBlockEnd - andMoreText;
    
    let listText = '';
    let displayedUsers = 0;
    
    // Add users until we reach the limit
    for (const user of userDetails.readUsers) {
        const userLine = user.name.padEnd(20) + (user.reactions || 'None') + '\n';
        if (listText.length + userLine.length <= maxListLength) {
            listText += userLine;
            displayedUsers++;
        } else {
            break;
        }
    }
    
    // Add the list to the text
    text += listText;
    
    // If we couldn't fit all users, add "and xxx more" at the end
    if (displayedUsers < userDetails.readUsers.length) {
        const remaining = userDetails.readUsers.length - displayedUsers;
        text += `and ${remaining} more`;
    }
    
    text += '```\n';
}

// Format unread users table
if (userDetails.unreadUsers.length > 0) {
    text += '**Users who have not reacted (marked as unread):**\n```\n';
    text += 'Username\n';
    text += '─'.repeat(20) + '\n';
    
    // Calculate the maximum characters we can use for the list
    // Discord's message limit is 2000, but we'll use 1900 to be safe
    // We also need to account for the closing code block and potential "and xxx more" text
    const maxMessageLength = 1900;
    const currentLength = text.length;
    const codeBlockEnd = '```'.length;
    const andMoreText = '\nand xxx more'.length;
    const maxListLength = maxMessageLength - currentLength - codeBlockEnd - andMoreText;
    
    let listText = '';
    let displayedUsers = 0;
    
    // Add users until we reach the limit
    for (const user of userDetails.unreadUsers) {
        const userLine = user.name + '\n';
        if (listText.length + userLine.length <= maxListLength) {
            listText += userLine;
            displayedUsers++;
        } else {
            break;
        }
    }
    
    // Add the list to the text
    text += listText;
    
    // If we couldn't fit all users, add "and xxx more" at the end
    if (displayedUsers < userDetails.unreadUsers.length) {
        const remaining = userDetails.unreadUsers.length - displayedUsers;
        text += `and ${remaining} more`;
    }
    
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

    // Calculate the maximum characters we can use for the list
    const maxMessageLength = 1900;
    const headerLength = text.length;
    const legendText = '\n' + '─'.repeat(53) + '\n' +
                       'Messages: Number of messages reacted to\n' +
                       'Reactions: Total reactions given (can be multiple per message)\n' +
                       'Early: Times among first 25% to react to a message\n' +
                       'Score: Weighted score based on messages and early reactions\n';
    const legendLength = legendText.length + '```'.length;
    const andMoreText = '\nand xxx more'.length;
    const maxListLength = maxMessageLength - headerLength - legendLength - andMoreText;
    
    let listText = '';
    let displayedUsers = 0;
    
    // Add users until we reach the limit
    for (const user of users) {
        const userLine = user.username.padEnd(20) +
                         user.readCount.toString().padEnd(10) +
                         user.totalReactions.toString().padEnd(11) +
                         user.firstReadCount.toString().padEnd(7) +
                         user.activityScore.toString() + '\n';
                         
        if (listText.length + userLine.length <= maxListLength) {
            listText += userLine;
            displayedUsers++;
        } else {
            break;
        }
    }
    
    // Add the list to the text
    text += listText;
    
    // If we couldn't fit all users, add "and xxx more" at the end
    if (displayedUsers < users.length) {
        const remaining = users.length - displayedUsers;
        text += `and ${remaining} more`;
    }

    // Legend
    text += '\n' + '─'.repeat(53) + '\n';
    text += 'Messages: Number of messages reacted to\n';
    text += 'Reactions: Total reactions given (can be multiple per message)\n';
    text += 'Early: Times among first 25% to react to a message\n';
    text += 'Score: Weighted score based on messages and early reactions\n';
    
    text += '```';
    return text;
}

// Split long messages for Discord's character limit
export async function sendLongMessage(channel: TextChannel, text: string, components?: any[]): Promise<void> {
    // Create delete button
    const deleteButton = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('delete_message')
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
        );
    
    // Use provided components or default to delete button
    const messageComponents = components || [deleteButton];
    
    if (text.length <= 1900) {
        await channel.send({ 
            content: text, 
            components: messageComponents 
        });
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
    
    // Send all chunks except the last one with delete buttons
    for (let i = 0; i < messages.length - 1; i++) {
        await channel.send({ 
            content: messages[i], 
            components: [deleteButton] 
        });
    }
    
    // Send the last chunk with provided components or delete button
    await channel.send({ 
        content: messages[messages.length - 1], 
        components: messageComponents 
    });
}
