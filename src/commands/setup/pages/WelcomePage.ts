import { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  MessageCreateOptions,
  ButtonInteraction,
  ModalSubmitInteraction
} from 'discord.js';
import config from '../../../config';
import { SetupPage } from '../controller/SetupController';

/**
 * Welcome page for the setup wizard
 * This is the main menu of the setup wizard
 */
export class WelcomePage implements SetupPage {
  /**
   * Render the welcome page
   * @param controller The setup controller
   */
  public async render(controller: any): Promise<MessageCreateOptions> {
    const embed = new EmbedBuilder()
      .setTitle('📊 Discord Engagement Tracker Setup')
      .setDescription('Welcome to the setup wizard! This will help you configure the bot for your server.')
      .setColor('#007bff')
      .addFields(
        { name: 'Current Configuration', value: 'Select an option below to view or modify settings.' },
        { name: 'Tracked Channel', value: config.trackedChannelId ? `<#${config.trackedChannelId}>` : 'Not set', inline: true },
        { name: 'Admin Channel', value: config.adminChannelId ? `<#${config.adminChannelId}>` : 'Not set', inline: true }
      );
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_nav_channel')
          .setLabel('Set Tracked Channel')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📋'),
        new ButtonBuilder()
          .setCustomId('setup_nav_admin_channel')
          .setLabel('Set Admin Channel')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🔔')
      );
      
    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_nav_roles')
          .setLabel('Configure Roles')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👥'),
        new ButtonBuilder()
          .setCustomId('setup_nav_test')
          .setLabel('Test Configuration')
          .setStyle(ButtonStyle.Success)
          .setEmoji('✅')
      );
    
    return {
      content: undefined,
      embeds: [embed],
      components: [row1, row2]
    };
  }

  /**
   * Handle interactions for the welcome page
   * @param controller The setup controller
   * @param interaction The interaction
   */
  public async handleInteraction(controller: any, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
    // The welcome page doesn't have any special interactions
    // All navigation is handled by the controller
  }
}

export default WelcomePage;
