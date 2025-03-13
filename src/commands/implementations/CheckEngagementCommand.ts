import { 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  SlashCommandBuilder,
  TextChannel,
  InteractionReplyOptions
} from 'discord.js';
import { Command, CommandController } from '../controller/CommandController';
import { formatMessageSummary } from '../../utils/formatters';
import { createMessageWithDeleteButton, createConfirmationMessage } from '../../utils/messageButtons';
import { CommandMessageManager } from '../../utils/messageManager';
import ServiceRegistry from '../../services/ServiceRegistry';

/**
 * Check Engagement Command
 * Displays engagement statistics for messages
 */
export class CheckEngagementCommand implements Command {
  /**
   * Get the command definition
   */
  public static getDefinition() {
    return new SlashCommandBuilder()
      .setName('check-engagement')
      .setDescription('Check engagement statistics for a message')
      .addStringOption(option => 
        option
          .setName('message_id')
          .setDescription('The ID of the message to check (optional)')
          .setRequired(false)
      );
  }
  
  /**
   * Execute the command
   * @param controller The command controller
   * @param interaction The slash command interaction
   */
  public async execute(controller: CommandController, interaction: ChatInputCommandInteraction): Promise<void> {
    // Ensure we're in a text channel
    if (!(interaction.channel instanceof TextChannel)) {
      await interaction.reply({
        content: 'This command can only be used in text channels.',
        ephemeral: true
      });
      return;
    }

    const channel = interaction.channel;
    const messageId = interaction.options.getString('message_id');
    
    // Create a message manager for this command
    const messageManager = new CommandMessageManager(channel);

    try {
      if (messageId) {
        // Check specific message
        await interaction.deferReply();
        await this.handleSpecificMessage(messageId, channel, messageManager);
        await interaction.deleteReply();
      } else {
        // Check all tracked messages - but first ask for confirmation
        const messageTracker = ServiceRegistry.getMessageTrackerService();
        const trackedMessages = messageTracker.getAllMessages();
        
        if (trackedMessages.length === 0) {
          await interaction.reply({
            content: 'No messages are currently being tracked.',
            ephemeral: true
          });
          return;
        }
        
        // Show confirmation message with Yes/No buttons
        const confirmMessage = createConfirmationMessage(
          `⚠️ You are about to generate summaries for all ${trackedMessages.length} tracked messages. Are you sure you want to do this? (Hint: Add a message ID to the command.)`,
          'cmd_checkengagement_confirm_yes',
          'cmd_checkengagement_confirm_no'
        );
        
        // Convert MessageCreateOptions to InteractionReplyOptions
        const replyOptions: InteractionReplyOptions = {
          content: confirmMessage.content,
          components: confirmMessage.components
        };
        
        await interaction.reply(replyOptions);
      }
    } catch (error) {
      console.error('Error in check-engagement command:', error);
      
      if (interaction.replied) {
        await interaction.followUp({
          content: 'An error occurred while processing the command.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'An error occurred while processing the command.',
          ephemeral: true
        });
      }
    }
  }
  
  /**
   * Handle button interactions for this command
   * @param controller The command controller
   * @param interaction The button interaction
   */
  public async handleButtonInteraction(controller: CommandController, interaction: ButtonInteraction): Promise<boolean> {
    const buttonId = interaction.customId;
    
    if (buttonId === 'cmd_checkengagement_confirm_yes') {
      // Disable the buttons
      await interaction.update({
        components: []
      });
      
      // User confirmed, process all messages
      if (interaction.channel instanceof TextChannel) {
        const messageManager = new CommandMessageManager(interaction.channel);
        await this.processAllTrackedMessages(interaction.channel, messageManager);
      }
      
      return true;
    } else if (buttonId === 'cmd_checkengagement_confirm_no') {
      // Disable the buttons
      await interaction.update({
        components: []
      });
      
      // User cancelled
      if (interaction.channel instanceof TextChannel) {
        await interaction.channel.send(
          createMessageWithDeleteButton('Command cancelled.')
        );
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Handle checking a specific message
   * @param messageId The message ID
   * @param channel The text channel
   * @param messageManager The message manager
   */
  private async handleSpecificMessage(messageId: string, channel: TextChannel, messageManager: CommandMessageManager): Promise<void> {
    const messageTracker = ServiceRegistry.getMessageTrackerService();
    const engagementStats = ServiceRegistry.getEngagementStatsService();
    
    const data = messageTracker.getMessage(messageId);
    if (!data) {
      await channel.send(
        createMessageWithDeleteButton('Message not found or not being tracked.')
      );
      return;
    }

    const summary = await engagementStats.generateMessageSummary(messageId);
    const userDetails = await engagementStats.getUserDetailsForMessage(messageId);
    
    if (summary && userDetails) {
      const formattedSummary = formatMessageSummary(summary, userDetails);
      
      // Use the message manager to send and track the message
      await messageManager.sendMessage(formattedSummary);
      
      // Add delete button to the last message
      await messageManager.addDeleteButtonToLastMessage();
    } else {
      await channel.send(
        createMessageWithDeleteButton('Could not generate summary for this message.')
      );
    }
  }
  
  /**
   * Process all tracked messages and generate summaries
   * @param channel The text channel
   * @param messageManager The message manager
   */
  private async processAllTrackedMessages(channel: TextChannel, messageManager: CommandMessageManager): Promise<void> {
    const messageTracker = ServiceRegistry.getMessageTrackerService();
    const engagementStats = ServiceRegistry.getEngagementStatsService();
    
    const trackedMessages = messageTracker.getAllMessages();
    
    if (trackedMessages.length === 0) {
      await channel.send(
        createMessageWithDeleteButton('No messages are currently being tracked.')
      );
      return;
    }
    
    // Warn if there are many messages
    if (trackedMessages.length > 5) {
      await messageManager.sendMessage(
        `⚠️ Generating summaries for ${trackedMessages.length} messages. This may take a moment...`
      );
    }

    let processedCount = 0;
    for (const data of trackedMessages) {
      try {
        const summary = await engagementStats.generateMessageSummary(data.messageId);
        const userDetails = await engagementStats.getUserDetailsForMessage(data.messageId);
        
        if (summary && userDetails) {
          const formattedSummary = formatMessageSummary(summary, userDetails);
          
          // Use the message manager to send and track the message
          await messageManager.sendMessage(formattedSummary);
          
          processedCount++;
        }
      } catch (messageError) {
        console.error(`Error processing message ${data.messageId}:`, messageError);
        // Continue with other messages
      }
    }
    
    if (processedCount < trackedMessages.length) {
      await messageManager.sendMessage(
        `⚠️ Only ${processedCount} of ${trackedMessages.length} messages could be processed.`
      );
    }
    
    // Add delete button to the last message
    await messageManager.addDeleteButtonToLastMessage();
  }
}

export default CheckEngagementCommand;
