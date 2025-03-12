import { Message, TextChannel } from 'discord.js';
import config from '../config';
import database from '../services/database';

// Helper function to calculate next run time based on frequency
function calculateNextRunTime(frequency: string): number {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency.toLowerCase()) {
        case 'daily':
            // Set to next day at 9:00 AM
            nextRun.setDate(now.getDate() + 1);
            nextRun.setHours(9, 0, 0, 0);
            break;
            
        case 'weekly':
            // Set to next week, same day at 9:00 AM
            nextRun.setDate(now.getDate() + 7);
            nextRun.setHours(9, 0, 0, 0);
            break;
            
        case 'monthly':
            // Set to next month, same day at 9:00 AM
            nextRun.setMonth(now.getMonth() + 1);
            nextRun.setHours(9, 0, 0, 0);
            break;
            
        default:
            // Default to daily
            nextRun.setDate(now.getDate() + 1);
            nextRun.setHours(9, 0, 0, 0);
    }
    
    return nextRun.getTime();
}

// Helper function to validate frequency
function isValidFrequency(frequency: string): boolean {
    return ['daily', 'weekly', 'monthly'].includes(frequency.toLowerCase());
}

// Helper function to validate report type
function isValidReportType(type: string): boolean {
    return ['engagement', 'activity'].includes(type.toLowerCase());
}

async function handleScheduleReport(message: Message): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    
    
    const args = message.content.split(' ');
    
    // Display help if no arguments or help requested
    if (args.length < 3 || args[1].toLowerCase() === 'help') {
        await message.channel.send(`
**Schedule Report Command Help**
Usage: \`${config.commandPrefix}${config.commands.report} <frequency> <type>\`

**Frequencies:**
- \`daily\`: Report will run every day at 9:00 AM
- \`weekly\`: Report will run every week on the same day at 9:00 AM
- \`monthly\`: Report will run every month on the same day at 9:00 AM

**Report Types:**
- \`engagement\`: Shows engagement statistics for all tracked messages
- \`activity\`: Shows most active users in the channel

**Examples:**
\`${config.commandPrefix}${config.commands.report} daily activity\`
\`${config.commandPrefix}${config.commands.report} weekly engagement\`

**To list scheduled reports:**
\`${config.commandPrefix}${config.commands.report} list\`

**To delete a scheduled report:**
\`${config.commandPrefix}${config.commands.report} delete <report_id>\`
        `);
        return;
    }
    
    // Handle list command
    if (args[1].toLowerCase() === 'list') {
        const reports = database.getScheduledReports();
        
        if (reports.length === 0) {
            await message.channel.send('No scheduled reports found.');
            return;
        }
        
        let reportList = '**Scheduled Reports:**\n```\n';
        reportList += 'ID'.padEnd(5) + 'Type'.padEnd(12) + 'Frequency'.padEnd(10) + 'Next Run\n';
        reportList += '─'.repeat(50) + '\n';
        
        for (const report of reports) {
            const nextRunDate = new Date(report.next_run);
            reportList += report.id.toString().padEnd(5) + 
                          report.report_type.padEnd(12) + 
                          report.frequency.padEnd(10) + 
                          nextRunDate.toLocaleString() + '\n';
        }
        
        reportList += '```';
        await message.channel.send(reportList);
        return;
    }
    
    // Handle delete command
    if (args[1].toLowerCase() === 'delete' && args[2]) {
        const reportId = parseInt(args[2]);
        
        if (isNaN(reportId)) {
            await message.channel.send('Please provide a valid report ID.');
            return;
        }
        
        database.deleteScheduledReport(reportId);
        await message.channel.send(`Scheduled report #${reportId} has been deleted.`);
        return;
    }
    
    // Handle schedule command
    const frequency = args[1];
    const reportType = args[2];
    
    // Validate frequency
    if (!isValidFrequency(frequency)) {
        await message.channel.send('Invalid frequency. Use daily, weekly, or monthly.');
        return;
    }
    
    // Validate report type
    if (!isValidReportType(reportType)) {
        await message.channel.send('Invalid report type. Use engagement or activity.');
        return;
    }
    
    // Calculate next run time
    const nextRun = calculateNextRunTime(frequency);
    
    try {
        // Save the scheduled report
        const reportId = database.saveScheduledReport({
            guild_id: message.guild!.id,
            channel_id: message.channel.id,
            frequency: frequency.toLowerCase(),
            next_run: nextRun,
            report_type: reportType.toLowerCase()
        });
        
        if (reportId === -1) {
            throw new Error('Failed to save scheduled report');
        }
        
        const nextRunDate = new Date(nextRun);
        await message.channel.send(
            `✅ ${reportType} report scheduled to run ${frequency} starting on ${nextRunDate.toLocaleString()}.\n` +
            `Report ID: ${reportId}`
        );
    } catch (error) {
        console.error('Error scheduling report:', error);
        await message.channel.send('An error occurred while scheduling the report.');
    }
}

export default handleScheduleReport;
