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
import { SetupController, SetupPage } from '../controller/SetupController';

/**
 * Test configuration page for the setup wizard
 * Allows the user to test the current configuration
 */
export class TestConfigPage implements SetupPage {
  /**
   * Render the test configuration page
   * @param controller The setup controller
   */
  public async render(controller: SetupController): Promise<MessageCreateOptions> {
    // Build the configuration status
    const configStatus = this.buildConfigStatus();
    
    const embed = new EmbedBuilder()
      .setTitle('📊 Test Configuration')
      .setDescription('Review and test your current configuration.')
      .setColor('#007bff')
      .addFields(
        { 
          name: 'Configuration Status', 
          value: configStatus
        },
        {
          name: 'Instructions',
          value: 'Review your configuration above. If everything looks correct, you can return to the main menu. ' +
                 'If you need to make changes, use the back button to return to the main menu and select the appropriate option.'
        }
      );
    
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_back_to_main')
          .setLabel('Back to Main Menu')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('⬅️')
      );
    
    return {
      embeds: [embed],
      components: [row]
    };
  }

  /**
   * Handle interactions for the test configuration page
   * @param controller The setup controller
   * @param interaction The interaction
   */
  public async handleInteraction(controller: SetupController, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<void> {
    // The test configuration page doesn't have any special interactions
    // All navigation is handled by the controller
  }

  /**
   * Build the configuration status text
   * @returns The configuration status text
   */
  private buildConfigStatus(): string {
    let status = '';
    
    // Check tracked channel
    if (config.trackedChannelId) {
      status += '✅ **Tracked Channel**: <#' + config.trackedChannelId + '>\n';
    } else {
      status += '❌ **Tracked Channel**: Not set (required)\n';
    }
    
    // Check admin channel
    if (config.adminChannelId) {
      status += '✅ **Admin Channel**: <#' + config.adminChannelId + '>\n';
    } else {
      status += '⚠️ **Admin Channel**: Not set (optional)\n';
    }
    
    // Check admin roles
    if (config.permissions.adminRoleIds.length > 0) {
      status += '✅ **Admin Roles**: ' + config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') + '\n';
    } else {
      status += '⚠️ **Admin Roles**: Not set (only server administrators can use admin commands)\n';
    }
    
    // Check mod roles
    if (config.permissions.modRoleIds.length > 0) {
      status += '✅ **Moderator Roles**: ' + config.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') + '\n';
    } else {
      status += '⚠️ **Moderator Roles**: Not set (only users with Manage Messages permission can use mod commands)\n';
    }
    
    // Overall status
    if (config.trackedChannelId) {
      status += '\n✅ **Overall Status**: The bot is properly configured and ready to use.\n';
      status += 'The bot will track messages in <#' + config.trackedChannelId + '> and monitor engagement.';
    } else {
      status += '\n❌ **Overall Status**: The bot is not properly configured.\n';
      status += 'You must set a tracked channel for the bot to function properly.';
    }
    
    return status;
  }
}

export default TestConfigPage;
