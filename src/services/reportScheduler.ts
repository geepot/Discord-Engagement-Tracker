import { Client, TextChannel } from 'discord.js';
import database from './database';
import engagementStats from './engagementStats';
import messageTracker from './messageTracker';
import { formatActivityRanking, formatMessageSummary, sendLongMessage } from '../utils/formatters';
import config from '../config';

class ReportScheduler {
    private client: Client | null = null;
    private checkInterval: NodeJS.Timeout | null = null;
    
    // Initialize the scheduler with the Discord client
    public initialize(client: Client): void {
        this.client = client;
        this.setupScheduler();
    }
    
    // Set up the interval to check for due reports
    private setupScheduler(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        // Check for due reports every 5 minutes
        this.checkInterval = setInterval(() => {
            this.checkAndRunDueReports();
        }, 5 * 60 * 1000); // 5 minutes in milliseconds
        
        console.log('Report scheduler initialized');
    }
    
    // Check for due reports and run them
    private async checkAndRunDueReports(): Promise<void> {
        if (!this.client) {
            console.error('Cannot run reports: Discord client not initialized');
            return;
        }
        
        try {
            const currentTime = Date.now();
            const dueReports = database.getDueReports(currentTime);
            
            if (dueReports.length === 0) return;
            
            console.log(`Running ${dueReports.length} scheduled reports`);
            
            for (const report of dueReports) {
                try {
                    // Get the channel
                    const channel = await this.client.channels.fetch(report.channel_id);
                    if (!(channel instanceof TextChannel)) {
                        console.error(`Channel ${report.channel_id} is not a text channel`);
                        continue;
                    }
                    
                    // Run the appropriate report
                    if (report.report_type === 'engagement') {
                        await this.runEngagementReport(channel);
                    } else if (report.report_type === 'activity') {
                        await this.runActivityReport(channel);
                    }
                    
                    // Calculate next run time based on frequency
                    const nextRun = this.calculateNextRunTime(report.frequency);
                    
                    // Update the report with the new next run time
                    database.updateScheduledReport({
                        ...report,
                        next_run: nextRun
                    });
                    
                    console.log(`Completed scheduled report ${report.id}, next run: ${new Date(nextRun).toLocaleString()}`);
                } catch (reportError) {
                    console.error(`Error running scheduled report ${report.id}:`, reportError);
                }
            }
        } catch (error) {
            console.error('Error checking for due reports:', error);
        }
    }
    
    // Calculate next run time based on frequency
    private calculateNextRunTime(frequency: string): number {
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
    
    // Run an engagement report for all tracked messages
    private async runEngagementReport(channel: TextChannel): Promise<void> {
        try {
            await channel.send('📊 **Scheduled Engagement Report**');
            
            const trackedMessages = messageTracker.getAllMessages();
            
            if (trackedMessages.length === 0) {
                await channel.send('No messages are currently being tracked.');
                return;
            }
            
            await channel.send(`Generating report for ${trackedMessages.length} tracked messages...`);
            
            let processedCount = 0;
            for (const data of trackedMessages) {
                try {
                    const summary = await engagementStats.generateMessageSummary(data.messageId);
                    const userDetails = await engagementStats.getUserDetailsForMessage(data.messageId);
                    
                    if (summary && userDetails) {
                        const formattedSummary = formatMessageSummary(summary, userDetails);
                        await sendLongMessage(channel, formattedSummary);
                        processedCount++;
                    }
                } catch (messageError) {
                    console.error(`Error processing message ${data.messageId}:`, messageError);
                    // Continue with other messages
                }
            }
            
            if (processedCount < trackedMessages.length) {
                await channel.send(`⚠️ Only ${processedCount} of ${trackedMessages.length} messages could be processed.`);
            }
            
            await channel.send('📊 **End of Engagement Report**');
        } catch (error) {
            console.error('Error running engagement report:', error);
            await channel.send('An error occurred while generating the engagement report.');
        }
    }
    
    // Run an activity report showing most active users
    private async runActivityReport(channel: TextChannel): Promise<void> {
        try {
            await channel.send('📊 **Scheduled Activity Report**');
            
            if (!messageTracker.hasMessages()) {
                await channel.send('No messages are currently being tracked.');
                return;
            }
            
            // Get channel statistics
            const members = messageTracker.getChannelMembers(channel.id);
            if (!members) {
                await channel.send('Could not fetch channel statistics.');
                return;
            }
            
            const stats = {
                totalMembers: members.size,
                activeMembers: (await engagementStats.calculateUserStats()).size
            };
            
            // Generate summary text
            let summaryText = '**Channel Activity Statistics**\n';
            summaryText += `Total Members: ${stats.totalMembers}\n`;
            summaryText += `Members with Activity: ${stats.activeMembers}\n`;
            summaryText += 'Activity ranking based on:\n';
            summaryText += '- Number of messages read\n';
            summaryText += '- Total reactions given\n';
            summaryText += '- Combined activity score\n\n';
            
            await channel.send(summaryText);
            
            // Calculate total users for pagination
            const allStats = await engagementStats.calculateUserStats();
            const totalUsers = allStats.size;
            
            // Generate rankings
            const count = config.defaults.activityRankingCount;
            const rankedUsers = await engagementStats.getActivityRanking(count, true, 1);
            
            if (rankedUsers.length === 0) {
                await channel.send('No user activity data available.');
                return;
            }
            
            const formattedRanking = formatActivityRanking(
                rankedUsers, 
                count, 
                true, 
                1, 
                totalUsers
            );
            
            await sendLongMessage(channel, formattedRanking);
            
            // Add warning if there's a big difference between active and total members
            if (stats.activeMembers < stats.totalMembers * 0.5) {
                await channel.send(
                    '⚠️ **Note:** Less than 50% of members have activity. ' +
                    'Rankings might not represent overall channel engagement.'
                );
            }
            
            await channel.send('📊 **End of Activity Report**');
        } catch (error) {
            console.error('Error running activity report:', error);
            await channel.send('An error occurred while generating the activity report.');
        }
    }
    
    // Force check for due reports (useful for testing)
    public async forceCheckReports(): Promise<void> {
        await this.checkAndRunDueReports();
    }
    
    // Clean up resources
    public shutdown(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Export a singleton instance
export default new ReportScheduler();
