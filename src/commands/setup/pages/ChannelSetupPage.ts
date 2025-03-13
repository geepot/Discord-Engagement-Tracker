import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageCreateOptions,
  ButtonInteraction,
  ModalSubmitInteraction,
  TextInputStyle
} from 'discord.js';
import config from '../../../config';
import ServiceRegistry from '../../../services/ServiceRegistry';
import { SetupController, SetupPage } from '../controller/SetupController';

/**
 * Channel setup page for the setup wizard
 * Allows the user to configure the tracked channel
 */
export class ChannelSetupPage implements SetupPage {
  /**
   * Render the channel setup page
   * @param controller The setup controller
   */
  public async render(controller: SetupController): Promise<MessageCreateOptions> {
    const embed = new EmbedBuilder()
      .setTitle('📊 Channel Setup')
      .setDescription('Configure the channel that the bot will track for engagement.')
      .setColor('#007bff')
      .addFields(
        { 
          name: 'Current Tracked Channel', 
          value: config.trackedChannelId ? `<#${config.trackedChannelId}>` : 'Not set'
        },
        {
          name: 'Instructions',
          value: 'Click the button below to set the channel that the bot will track for engagement. ' +
                 'This should be the channel where you want to monitor message reactions and engagement.'
        }
      );
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_channel_set')
          .setLabel('Set Tracked Channel')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋')
      );
      
    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_back_to_main')
          .setLabel('Back to Main Menu')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⬅️')
      );
    
    return {
      embeds: [embed],
      components: [row1, row2]
    };
  }

  /**
   * Handle interactions for the channel setup page
   * @param controller The setup controller
   * @param interaction The interaction
   */
  public async handleInteraction(controller: SetupController, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
    try {
      // Handle button interactions
      if (interaction.isButton()) {
        const buttonId = interaction.customId;
        console.log(`ChannelSetupPage received button interaction: ${buttonId}`);
        
        if (buttonId === 'setup_channel_set') {
          console.log('Creating channel selection modal');
          // Show the modal for channel selection
          const modal = controller.createModal(
            'channel_set',
            'Set Tracked Channel',
            [
              {
                id: 'channel_id',
                label: 'Enter the channel ID or mention (#channel)',
                placeholder: 'Example: #general or 123456789012345678',
                style: TextInputStyle.Short,
                required: true
              }
            ]
          );
          
          try {
            console.log('Showing channel selection modal');
            await interaction.showModal(modal);
            console.log('Modal shown successfully');
          } catch (error) {
            console.error('Error showing channel selection modal:', error);
            await interaction.reply({
              content: '❌ Error showing channel selection form. Please try again.',
              ephemeral: true
            });
          }
        }
      }
      // Handle modal submissions
      else if (interaction.isModalSubmit()) {
        const modalId = interaction.customId;
        console.log(`ChannelSetupPage received modal submission: ${modalId}`);
        
        if (modalId === 'setup_modal_channel_set') {
          console.log('Processing channel selection modal submission');
          try {
            // Get the channel ID from the modal
            let channelId = interaction.fields.getTextInputValue('channel_id').trim();
            console.log(`Received channel input: ${channelId}`);
            
            // Check if it's a channel mention
            const channelMatch = channelId.match(/<#(\d+)>/);
            if (channelMatch) {
              channelId = channelMatch[1];
              console.log(`Extracted channel ID from mention: ${channelId}`);
            }
            
            // Validate the channel
            console.log(`Validating channel ID: ${channelId}`);
            const channel = await interaction.guild?.channels.fetch(channelId);
            
            if (!channel) {
              console.warn(`Channel not found: ${channelId}`);
              await interaction.reply({
                content: '❌ Channel not found. Please check the ID and try again.',
                ephemeral: true
              });
              return;
            }
            
            if (!channel.isTextBased()) {
              console.warn(`Channel is not text-based: ${channelId}`);
              await interaction.reply({
                content: '❌ The selected channel is not a text channel.',
                ephemeral: true
              });
              return;
            }
            
            console.log(`Channel validated successfully: ${channelId}`);
            
            // Update settings with new channel ID
            console.log(`Updating config with channel ID: ${channelId}`);
            ServiceRegistry.getConfigService().updateSetting('TRACKED_CHANNEL_ID', channelId);
            
            // Update the setup message with success and return to main menu
            console.log('Sending success message');
            await interaction.reply({
              content: `✅ Successfully set tracked channel to <#${channelId}>. This change will take effect immediately.`,
              ephemeral: true
            });
            
            // Return to the main menu
            console.log('Navigating back to welcome page');
            await controller.navigateToPage('welcome');
          } catch (error) {
            console.error('Error processing channel modal submission:', error);
            try {
              await interaction.reply({
                content: '❌ Error processing your channel selection. Please try again.',
                ephemeral: true
              });
            } catch (replyError) {
              console.error('Error sending error reply:', replyError);
            }
          }
        } else {
          console.warn(`Unknown modal ID received: ${modalId}, expected setup_modal_channel_set`);
        }
      } else {
        console.warn(`Unknown interaction type received in ChannelSetupPage`);
      }
    } catch (error) {
      console.error('Uncaught error in ChannelSetupPage.handleInteraction:', error);
      try {
        if (!interaction.replied) {
          await interaction.reply({
            content: '❌ An unexpected error occurred. Please try again.',
            ephemeral: true
          });
        }
      } catch (replyError) {
        console.error('Error sending error reply:', replyError);
      }
    }
  }
}

export default ChannelSetupPage;
