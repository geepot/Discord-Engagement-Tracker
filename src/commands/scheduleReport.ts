import { 
    Message, 
    TextChannel, 
    SlashCommandBuilder, 
    ChatInputCommandInteraction 
} from 'discord.js';
import config from '../config';
import database from '../services/database';
import { registerCommand } from '../utils/slashCommands';

// Define the slash command
const scheduleReportCommand = new SlashCommandBuilder()
    .setName('schedule-report')
    .setDescription('Schedule automated reports')
    .addSubcommand(subcommand =>
        subcommand
            .setName('create')
            .setDescription('Create a new scheduled report')
            .addStringOption(option =>
                option
                    .setName('frequency')
                    .setDescription('How often to run the report')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Daily', value: 'daily' },
                        { name: 'Weekly', value: 'weekly' },
                        { name: 'Monthly', value: 'monthly' }
                    )
            )
            .addStringOption(option =>
                option
                    .setName('type')
                    .setDescription('Type of report to run')
                    .setRequired(true)
                    .addChoices(
                        { name: 'Engagement', value: 'engagement' },
                        { name: 'Activity', value: 'activity' }
                    )
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List all scheduled reports')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('delete')
            .setDescription('Delete a scheduled report')
            .addIntegerOption(option =>
                option
                    .setName('id')
                    .setDescription('ID of the report to delete')
                    .setRequired(true)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('help')
            .setDescription('Show help information for the schedule-report command')
    );

// Register the slash command
registerCommand({
    data: scheduleReportCommand,
    execute: async (interaction: ChatInputCommandInteraction) => {
        // Ensure we're in a text channel
        if (!(interaction.channel instanceof TextChannel)) {
            await interaction.reply({
                content: 'This command can only be used in text channels.',
                ephemeral: true
            });
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create':
                await handleCreateReport(interaction);
                break;
            case 'list':
                await handleListReports(interaction);
                break;
            case 'delete':
                await handleDeleteReport(interaction);
                break;
            case 'help':
                await handleHelp(interaction);
                break;
        }
    }
});

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

/**
 * Handle creating a new scheduled report
 */
async function handleCreateReport(interaction: ChatInputCommandInteraction): Promise<void> {
    const frequency = interaction.options.getString('frequency')!;
    const reportType = interaction.options.getString('type')!;
    
    // Calculate next run time
    const nextRun = calculateNextRunTime(frequency);
    
    try {
        // Save the scheduled report
        const reportId = database.saveScheduledReport({
            guild_id: interaction.guildId!,
            channel_id: interaction.channelId,
            frequency: frequency.toLowerCase(),
            next_run: nextRun,
            report_type: reportType.toLowerCase()
        });
        
        if (reportId === -1) {
            throw new Error('Failed to save scheduled report');
        }
        
        const nextRunDate = new Date(nextRun);
        await interaction.reply(
            `✅ ${reportType} report scheduled to run ${frequency} starting on ${nextRunDate.toLocaleString()}.\n` +
            `Report ID: ${reportId}`
        );
    } catch (error) {
        console.error('Error scheduling report:', error);
        await interaction.reply({
            content: 'An error occurred while scheduling the report.',
            ephemeral: true
        });
    }
}

/**
 * Handle listing all scheduled reports
 */
async function handleListReports(interaction: ChatInputCommandInteraction): Promise<void> {
    const reports = database.getScheduledReports();
    
    if (reports.length === 0) {
        await interaction.reply('No scheduled reports found.');
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
    await interaction.reply(reportList);
}

/**
 * Handle deleting a scheduled report
 */
async function handleDeleteReport(interaction: ChatInputCommandInteraction): Promise<void> {
    const reportId = interaction.options.getInteger('id')!;
    
    database.deleteScheduledReport(reportId);
    await interaction.reply(`Scheduled report #${reportId} has been deleted.`);
}

/**
 * Handle showing help information
 */
async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply({
        content: `
**Schedule Report Command Help**

This command allows you to schedule automated reports that will be posted to this channel.

**Subcommands:**
- \`/schedule-report create\`: Create a new scheduled report
  - \`frequency\`: How often to run the report (daily, weekly, monthly)
  - \`type\`: Type of report to run (engagement, activity)

- \`/schedule-report list\`: List all scheduled reports

- \`/schedule-report delete\`: Delete a scheduled report
  - \`id\`: ID of the report to delete

**Report Types:**
- \`engagement\`: Shows engagement statistics for all tracked messages
- \`activity\`: Shows most active users in the channel

**Examples:**
\`/schedule-report create frequency:daily type:activity\`
\`/schedule-report create frequency:weekly type:engagement\`
\`/schedule-report delete id:1\`
        `,
        ephemeral: true
    });
}

// For backward compatibility with any code that might still use the old function
async function handleScheduleReport(message: Message): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    
    await message.reply('Please use the slash command `/schedule-report` instead.');
}

export default handleScheduleReport;
