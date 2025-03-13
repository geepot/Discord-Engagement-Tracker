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
 * Admin channel setup page for the setup wizard
 * Allows the user to configure the admin channel
 */
export class AdminChannelSetupPage implements SetupPage {
  /**
   * Render the admin channel setup page
   * @param controller The setup controller
   */
  public async render(controller: SetupController): Promise<MessageCreateOptions> {
    const embed = new EmbedBuilder()
      .setTitle('📊 Admin Channel Setup')
      .setDescription('Configure the admin channel for bot notifications.')
      .setColor('#007bff')
      .addFields(
        { 
          name: 'Current Admin Channel', 
          value: config.adminChannelId ? `<#${config.adminChannelId}>` : 'Not set'
        },
        {
          name: 'Instructions',
          value: 'Click the button below to set the admin channel for bot notifications. ' +
                 'This channel will receive error messages and other administrative notifications. ' +
                 'You can also clear the admin channel by entering "none".'
        }
      );
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_admin_channel_set')
          .setLabel('Set Admin Channel')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔔')
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
   * Handle interactions for the admin channel setup page
   * @param controller The setup controller
   * @param interaction The interaction
   * @returns true if the interaction was handled, false otherwise
   */
  public async handleInteraction(controller: SetupController, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<boolean> {
    // Handle button interactions
    if (interaction.isButton()) {
      const buttonId = interaction.customId;
      
      if (buttonId === 'setup_admin_channel_set') {
        // Show the modal for admin channel selection
        const modal = controller.createModal(
          'admin_channel_set',
          'Set Admin Channel',
          [
            {
              id: 'admin_channel_id',
              label: 'Enter the channel ID or mention (#channel)',
              placeholder: 'Example: #admin or 123456789012345678 or "none"',
              style: TextInputStyle.Short,
              required: true
            }
          ]
        );
        
        await interaction.showModal(modal);
        return true;
      }
      return false;
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;
      
      if (modalId === 'setup_modal_admin_channel_set') {
        // Get the channel ID from the modal
        let channelId = interaction.fields.getTextInputValue('admin_channel_id').trim();
        
        // Check if user wants to clear the admin channel
        if (channelId.toLowerCase() === 'none') {
          // Clear the admin channel
          ServiceRegistry.getConfigService().updateSetting('ADMIN_CHANNEL_ID', '');
          
          await interaction.reply({
            content: '✅ Admin channel has been cleared. This change will take effect immediately.',
            ephemeral: true
          });
          
          // Return to the main menu
          await controller.navigateToPage('welcome');
          return true;
        }
        
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
            return true;
          }
          
          // Update settings with new channel ID
          ServiceRegistry.getConfigService().updateSetting('ADMIN_CHANNEL_ID', channelId);
          
          // Update the setup message with success and return to main menu
          await interaction.reply({
            content: `✅ Successfully set admin channel to <#${channelId}>. This change will take effect immediately.`,
            ephemeral: true
          });
          
          // Return to the main menu
          await controller.navigateToPage('welcome');
          return true;
        } catch (error) {
          console.error('Error fetching channel:', error);
          await interaction.reply({
            content: '❌ Error fetching channel. Please try again.',
            ephemeral: true
          });
          return true;
        }
      }
      return false;
    }
    
    // If we reached here, we didn't handle the interaction
    return false;
  }
}

export default AdminChannelSetupPage;
