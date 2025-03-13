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
    // Handle button interactions
    if (interaction.isButton()) {
      const buttonId = interaction.customId;
      
      if (buttonId === 'setup_channel_set') {
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
        
        await interaction.showModal(modal);
      }
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;
      
      if (modalId === 'setup_modal_channel_set') {
        // Get the channel ID from the modal
        let channelId = interaction.fields.getTextInputValue('channel_id').trim();
        
        // Check if it's a channel mention
        const channelMatch = channelId.match(/<#(\d+)>/);
        if (channelMatch) {
          channelId = channelMatch[1];
        }
        
        // Validate the channel
        try {
          const channel = await interaction.guild?.channels.fetch(channelId);
          if (!channel || !channel.isTextBased()) {
            await interaction.reply({
              content: '❌ Invalid channel or not a text channel.',
              ephemeral: true
            });
            return;
          }
          
          // Update settings with new channel ID
          ServiceRegistry.getConfigService().updateSetting('TRACKED_CHANNEL_ID', channelId);
          
          // Update the setup message with success and return to main menu
          await interaction.reply({
            content: `✅ Successfully set tracked channel to <#${channelId}>. This change will take effect immediately.`,
            ephemeral: true
          });
          
          // Return to the main menu
          await controller.navigateToPage('welcome');
        } catch (error) {
          console.error('Error fetching channel:', error);
          await interaction.reply({
            content: '❌ Error fetching channel. Please try again.',
            ephemeral: true
          });
        }
      }
    }
  }
}

export default ChannelSetupPage;
