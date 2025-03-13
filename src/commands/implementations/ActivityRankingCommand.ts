import { 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  SlashCommandBuilder,
  TextChannel,
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  Message
} from 'discord.js';
import { Command, CommandController } from '../controller/CommandController';
import { formatActivityRanking } from '../../utils/formatters';
import { createMessageWithDeleteButton } from '../../utils/messageButtons';
import { CommandMessageManager } from '../../utils/messageManager';
import config from '../../config';
import ServiceRegistry from '../../services/ServiceRegistry';

/**
 * Activity Ranking Command
 * Displays most active or inactive users in the tracked channel
 */
export class ActivityRankingCommand implements Command {
  private readonly maxAllowedCount: number = 100; // Safety limit for large servers
  
  /**
   * Get the most active command definition
   */
  public static getMostActiveDefinition() {
    return new SlashCommandBuilder()
      .setName('most-active')
      .setDescription('Show the most active users in the tracked channel')
      .addIntegerOption(option => 
        option
          .setName('count')
          .setDescription('Number of users to show (default: 10)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(100)
      )
      .addIntegerOption(option => 
        option
          .setName('page')
          .setDescription('Page number (default: 1)')
          .setRequired(false)
          .setMinValue(1)
      );
  }
  
  /**
   * Get the most inactive command definition
   */
  public static getMostInactiveDefinition() {
    return new SlashCommandBuilder()
      .setName('most-inactive')
      .setDescription('Show the least active users in the tracked channel')
      .addIntegerOption(option => 
        option
          .setName('count')
          .setDescription('Number of users to show (default: 10)')
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(100)
      )
      .addIntegerOption(option => 
        option
          .setName('page')
          .setDescription('Page number (default: 1)')
          .setRequired(false)
          .setMinValue(1)
      );
  }
  
  /**
   * Execute the command
   * @param controller The command controller
   * @param interaction The slash command interaction
   */
  public async execute(controller: CommandController, interaction: ChatInputCommandInteraction): Promise<void> {
    const isActive = interaction.commandName === 'most-active';
    const count = interaction.options.getInteger('count') || config.defaults.activityRankingCount;
    const page = interaction.options.getInteger('page') || 1;
    
    await this.handleActivityRanking(interaction, isActive, count, page);
  }
  
  /**
   * Handle button interactions for this command
   * @param controller The command controller
   * @param interaction The button interaction
   */
  public async handleButtonInteraction(controller: CommandController, interaction: ButtonInteraction): Promise<boolean> {
    const buttonId = interaction.customId;
    
    // Check if this is an activity ranking button
    if (buttonId.startsWith('cmd_most-active:') || buttonId.startsWith('cmd_most-inactive:')) {
      const parts = buttonId.split(':');
      if (parts.length < 5) return false;
      
      // Determine if this is a most-active or most-inactive command
      const commandName = buttonId.startsWith('cmd_most-active:') ? 'most-active' : 'most-inactive';
      const isActive = commandName === 'most-active';
      
      const action = parts[2]; // prev or next
      const count = parseInt(parts[4]);
      let page = parseInt(parts[5]);
      
      // Adjust page based on action
      if (action === 'next') {
        page = page; // Page is already set to the next page in the button ID
      } else if (action === 'prev') {
        page = Math.max(1, page); // Ensure page is at least 1
      }
      
      // Defer the update first
      await interaction.deferUpdate();
      
      try {
        // Pass the already deferred interaction to handleActivityRanking
        await this.handleActivityRanking(interaction, isActive, count, page, true);
      } catch (error) {
        console.error('Error in handleButtonInteraction:', error);
        // We've already deferred, so we can't reply again
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle activity ranking
   * @param source The source (interaction or message)
   * @param isActive Whether to show most active (true) or most inactive (false)
   * @param initialCount The initial count
   * @param initialPage The initial page
   */
  private async handleActivityRanking(
    source: Message | ButtonInteraction | ChatInputCommandInteraction, 
    isActive = true,
    initialCount?: number,
    initialPage?: number,
    isAlreadyDeferred = false
  ): Promise<void> {
    // Determine the type of source
    const isMessage = source instanceof Message;
    const isButtonInteraction = source instanceof ButtonInteraction;
    const isSlashCommand = source instanceof ChatInputCommandInteraction;
    
    // Get the channel
    let channel: TextChannel;
    if (isMessage) {
      if (!(source.channel instanceof TextChannel)) {
        await source.reply('This command can only be used in text channels.');
        return;
      }
      channel = source.channel;
    } else {
      if (!(source.channel instanceof TextChannel)) {
        await source.reply({ content: 'This interaction can only be used in text channels.', ephemeral: true });
        return;
      }
      channel = source.channel;
    }

    try {
      const messageTracker = ServiceRegistry.getMessageTrackerService();
      const engagementStats = ServiceRegistry.getEngagementStatsService();
      
      // Check if there are messages being tracked
      if (!messageTracker.hasMessages()) {
        if (isSlashCommand) {
          await (source as ChatInputCommandInteraction).reply({
            content: 'No messages are currently being tracked.',
            ephemeral: true
          });
        } else if (isButtonInteraction) {
          await (source as ButtonInteraction).update({
            content: 'No messages are currently being tracked.',
            components: []
          });
        } else {
          await channel.send(
            createMessageWithDeleteButton('No messages are currently being tracked.')
          );
        }
        return;
      }

      // Parse and validate count and page
      let count = initialCount || config.defaults.activityRankingCount;
      let page = initialPage || 1;
      
      if (isMessage) {
        const message = source as Message;
        const args = message.content.split(' ');
        
        if (args[1]) {
          count = parseInt(args[1]);
        }
        
        if (args[2]) {
          page = parseInt(args[2]);
        }
      }
      
      this.validateInput(count, page);

      // Get channel statistics
      const stats = await this.getChannelStats();
      if (!stats) {
        if (isSlashCommand) {
          await (source as ChatInputCommandInteraction).reply({
            content: 'Could not fetch channel statistics.',
            ephemeral: true
          });
        } else if (isButtonInteraction) {
          await (source as ButtonInteraction).update({
            content: 'Could not fetch channel statistics.',
            components: []
          });
        } else {
          await channel.send(
            createMessageWithDeleteButton('Could not fetch channel statistics.')
          );
        }
        return;
      }

      // Calculate total users for pagination
      const allStats = await engagementStats.calculateUserStats();
      const totalUsers = Math.min(allStats.size, count); // Limit to requested count
      
      // Generate rankings for the requested page
      const rankedUsers = await engagementStats.getActivityRanking(count, isActive, page);
      if (rankedUsers.length === 0) {
        if (isSlashCommand) {
          await (source as ChatInputCommandInteraction).reply({
            content: 'No user activity data available.',
            ephemeral: true
          });
        } else if (isButtonInteraction) {
          await (source as ButtonInteraction).update({
            content: 'No user activity data available.',
            components: []
          });
        } else {
          await channel.send(
            createMessageWithDeleteButton('No user activity data available.')
          );
        }
        return;
      }

      // Generate summary text
      const summaryText = await this.generateSummaryText(stats, isActive);
      
      // Format the ranking text with summary included
      const formattedRanking = summaryText + formatActivityRanking(
        rankedUsers, 
        count, 
        isActive, 
        page, 
        totalUsers
      );
      
      // Calculate total pages for pagination
      const totalPages = Math.ceil(totalUsers / config.defaults.pageSize);
      
      // Create pagination buttons
      const paginationButtons = this.createPaginationButtons(isActive, count, page, totalPages);
      
      // Handle different source types
      if (isSlashCommand) {
        // For slash commands, defer the reply first
        const interaction = source as ChatInputCommandInteraction;
        await interaction.deferReply();
        
        // Create pagination buttons
        const commandName = isActive ? 'most-active' : 'most-inactive';
        const paginationButtons = [
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages)
        ];
        
        // Create a delete button
        const deleteButton = new ButtonBuilder()
          .setCustomId('delete_message')
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);
        
        // Create an action row
        const actionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents([...paginationButtons, deleteButton]);
        
        // Send the combined message with pagination buttons
        await interaction.editReply({
          content: formattedRanking,
          components: [actionRow]
        });
        
        // Add warning if there's a big difference between active and total members
        if (stats.activeMembers < stats.totalMembers * 0.5) {
          await channel.send(
            '⚠️ **Note:** Less than 50% of members have activity. ' +
            'Rankings might not represent overall channel engagement.'
          );
        }
      } else if (isButtonInteraction) {
        // For button interactions, update the existing message
        const buttonInteraction = source as ButtonInteraction;
        
        // Create pagination buttons
        const commandName = isActive ? 'most-active' : 'most-inactive';
        const paginationButtons = [
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages)
        ];
        
        // Create a delete button
        const deleteButton = new ButtonBuilder()
          .setCustomId('delete_message')
          .setLabel('Delete')
          .setStyle(ButtonStyle.Danger);
        
        // Create an action row
        const actionRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents([...paginationButtons, deleteButton]);
        
        // Update the message
        if (!isAlreadyDeferred) {
          await buttonInteraction.update({
            content: formattedRanking,
            components: [actionRow]
          });
        } else {
          await buttonInteraction.editReply({
            content: formattedRanking,
            components: [actionRow]
          });
        }
      } else {
        // For message commands, send a single message
        // Create a message manager for this command
        const messageManager = new CommandMessageManager(channel);
        
        // Create pagination buttons
        const commandName = isActive ? 'most-active' : 'most-inactive';
        const paginationButtons = [
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page <= 1),
          new ButtonBuilder()
            .setCustomId(`cmd_${commandName}:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(page >= totalPages)
        ];
        
        // Send the combined message with pagination buttons
        const message = await messageManager.sendMessage(formattedRanking);
        
        // Add buttons to the message
        try {
          await message.edit({
            content: formattedRanking,
            components: [
              new ActionRowBuilder<ButtonBuilder>()
                .addComponents([
                  ...paginationButtons,
                  new ButtonBuilder()
                    .setCustomId('delete_message')
                    .setLabel('Delete')
                    .setStyle(ButtonStyle.Danger)
                ])
            ]
          });
        } catch (error) {
          console.warn('Could not update message with buttons:', error);
          // Fall back to adding buttons to the last message
          await messageManager.addDeleteButtonToLastMessage(paginationButtons);
        }
      }
    } catch (error) {
      console.error('Error generating activity ranking:', error);
      
      const errorMessage = error instanceof Error && 
        (error.message.includes('Please provide') || error.message.includes('Maximum allowed'))
        ? error.message
        : 'An error occurred while generating activity ranking.';
      
      if (isSlashCommand) {
        const interaction = source as ChatInputCommandInteraction;
        if (interaction.deferred) {
          await interaction.editReply({
            content: errorMessage,
            components: []
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            ephemeral: true
          });
        }
      } else if (isButtonInteraction) {
        const buttonInteraction = source as ButtonInteraction;
        
        // Check if the interaction has already been deferred
        if (isAlreadyDeferred) {
          await buttonInteraction.editReply({
            content: errorMessage,
            components: []
          });
        } else if (!buttonInteraction.replied && !buttonInteraction.deferred) {
          await buttonInteraction.update({
            content: errorMessage,
            components: []
          });
        }
        // If already replied and not deferred by us, we can't do anything
      } else {
        await channel.send(
          createMessageWithDeleteButton(errorMessage)
        );
      }
    }
  }
  
  /**
   * Validate input parameters
   * @param count The count
   * @param page The page
   */
  private validateInput(count: number, page: number): void {
    if (isNaN(count) || count < 1) {
      throw new Error('Please provide a valid count greater than 0.');
    }
    if (count > this.maxAllowedCount) {
      throw new Error(`Maximum allowed count is ${this.maxAllowedCount}.`);
    }
    if (isNaN(page) || page < 1) {
      throw new Error('Please provide a valid page number greater than 0.');
    }
  }
  
  /**
   * Get channel statistics
   * @returns Channel statistics or null if not available
   */
  private async getChannelStats() {
    // Always use the tracked channel ID from config
    const trackedChannelId = config.trackedChannelId;
    if (!trackedChannelId) return null;
    
    const messageTracker = ServiceRegistry.getMessageTrackerService();
    const engagementStats = ServiceRegistry.getEngagementStatsService();
    
    const members = messageTracker.getChannelMembers(trackedChannelId);
    if (!members) return null;

    return {
      totalMembers: members.size,
      activeMembers: (await engagementStats.calculateUserStats()).size
    };
  }
  
  /**
   * Generate summary text
   * @param stats Channel statistics
   * @param isActive Whether to show most active (true) or most inactive (false)
   * @returns Summary text
   */
  private async generateSummaryText(stats: { totalMembers: number; activeMembers: number }, isActive: boolean): Promise<string> {
    const type = isActive ? 'active' : 'inactive';
    let text = '**Channel Statistics**\n';
    text += `Total Members: ${stats.totalMembers}\n`;
    text += `Members with Activity: ${stats.activeMembers}\n`;
    text += `Showing ${type} users based on:\n`;
    text += '- Number of messages read\n';
    text += '- Total reactions given\n';
    text += '- Combined activity score\n\n';
    return text;
  }
  
  /**
   * Create pagination buttons
   * @param isActive Whether to show most active (true) or most inactive (false)
   * @param count The count
   * @param page The page
   * @param totalPages The total number of pages
   * @returns Array of pagination buttons
   */
  private createPaginationButtons(isActive: boolean, count: number, page: number, totalPages: number): ButtonBuilder[] {
    const commandName = isActive ? 'most-active' : 'most-inactive';
    return [
      new ButtonBuilder()
        .setCustomId(`cmd_${commandName}:prev:${isActive}:${count}:${Math.max(1, page - 1)}`)
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId(`cmd_${commandName}:next:${isActive}:${count}:${Math.min(totalPages, page + 1)}`)
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page >= totalPages)
    ];
  }
}

export default ActivityRankingCommand;
