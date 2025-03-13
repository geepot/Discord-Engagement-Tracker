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
 * Role setup page for the setup wizard
 * Allows the user to configure admin and moderator roles
 */
export class RoleSetupPage implements SetupPage {
  /**
   * Render the role setup page
   * @param controller The setup controller
   */
  public async render(controller: SetupController): Promise<MessageCreateOptions> {
    const embed = new EmbedBuilder()
      .setTitle('📊 Role Setup')
      .setDescription('Configure the roles that can use admin and moderator commands.')
      .setColor('#007bff')
      .addFields(
        { 
          name: 'Current Admin Roles', 
          value: config.permissions.adminRoleIds.length > 0 
            ? config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ')
            : 'Not set (only server administrators can use admin commands)'
        },
        { 
          name: 'Current Moderator Roles', 
          value: config.permissions.modRoleIds.length > 0 
            ? config.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ')
            : 'Not set (only users with Manage Messages permission can use mod commands)'
        },
        {
          name: 'Instructions',
          value: 'Click the buttons below to configure which roles can use admin and moderator commands. ' +
                 'Admin roles can use all commands, while moderator roles can only use non-administrative commands.'
        }
      );
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('setup_admin_roles_set')
          .setLabel('Set Admin Roles')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('👑'),
        new ButtonBuilder()
          .setCustomId('setup_mod_roles_set')
          .setLabel('Set Moderator Roles')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🛡️')
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
   * Handle interactions for the role setup page
   * @param controller The setup controller
   * @param interaction The interaction
   * @returns true if the interaction was handled, false otherwise
   */
  public async handleInteraction(controller: SetupController, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<boolean> {
    // Handle button interactions
    if (interaction.isButton()) {
      const buttonId = interaction.customId;
      
      if (buttonId === 'setup_admin_roles_set') {
        // Show the modal for admin roles selection
        const modal = controller.createModal(
          'admin_roles_set',
          'Set Admin Roles',
          [
            {
              id: 'admin_roles',
              label: 'Enter role IDs or mentions, separated by spaces',
              placeholder: 'Example: @Admin @Owner or 123456789012345678',
              style: TextInputStyle.Paragraph,
              value: config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(' '),
              required: true
            }
          ]
        );
        
        await interaction.showModal(modal);
        return true;
      }
      else if (buttonId === 'setup_mod_roles_set') {
        // Show the modal for moderator roles selection
        const modal = controller.createModal(
          'mod_roles_set',
          'Set Moderator Roles',
          [
            {
              id: 'mod_roles',
              label: 'Enter role IDs or mentions, separated by spaces',
              placeholder: 'Example: @Mod @Helper or 123456789012345678',
              style: TextInputStyle.Paragraph,
              value: config.permissions.modRoleIds.map(id => `<@&${id}>`).join(' '),
              required: true
            }
          ]
        );
        
        await interaction.showModal(modal);
        return true;
      }
      
      // If we didn't handle the button, return false
      return false;
    }
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      const modalId = interaction.customId;
      
      if (modalId === 'setup_modal_admin_roles_set') {
        // Get the roles from the modal
        const rolesText = interaction.fields.getTextInputValue('admin_roles').trim();
        
        // Extract role IDs from mentions and raw IDs
        const roleIds = this.extractRoleIds(rolesText);
        
        if (roleIds.length === 0) {
          await interaction.reply({
            content: '❌ No valid role mentions or IDs found. Please mention roles using @role-name or provide role IDs.',
            ephemeral: true
          });
          return true;
        }
        
        // Update settings with new role IDs
        ServiceRegistry.getConfigService().updateSetting('ADMIN_ROLE_IDS', roleIds.join(','));
        
        // Update the setup message with success
        await interaction.reply({
          content: `✅ Successfully set admin roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`,
          ephemeral: true
        });
        
        // Refresh the current page to show the updated roles
        await controller.navigateToPage('roles');
        return true;
      }
      else if (modalId === 'setup_modal_mod_roles_set') {
        // Get the roles from the modal
        const rolesText = interaction.fields.getTextInputValue('mod_roles').trim();
        
        // Extract role IDs from mentions and raw IDs
        const roleIds = this.extractRoleIds(rolesText);
        
        if (roleIds.length === 0) {
          await interaction.reply({
            content: '❌ No valid role mentions or IDs found. Please mention roles using @role-name or provide role IDs.',
            ephemeral: true
          });
          return true;
        }
        
        // Update settings with new role IDs
        ServiceRegistry.getConfigService().updateSetting('MOD_ROLE_IDS', roleIds.join(','));
        
        // Update the setup message with success
        await interaction.reply({
          content: `✅ Successfully set moderator roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`,
          ephemeral: true
        });
        
        // Refresh the current page to show the updated roles
        await controller.navigateToPage('roles');
        return true;
      }
      
      // If we didn't handle the modal, return false
      return false;
    }
    
    // If we reached here, we didn't handle the interaction
    return false;
  }

  /**
   * Extract role IDs from a string containing role mentions and/or raw IDs
   * @param text The text to extract role IDs from
   * @returns Array of role IDs
   */
  private extractRoleIds(text: string): string[] {
    const roleIds: string[] = [];
    
    // Extract role IDs from mentions
    const roleMentions = text.match(/<@&(\d+)>/g);
    if (roleMentions) {
      for (const mention of roleMentions) {
        const roleId = mention.match(/<@&(\d+)>/)?.[1];
        if (roleId && !roleIds.includes(roleId)) {
          roleIds.push(roleId);
        }
      }
    }
    
    // Also check for raw IDs
    const rawIds = text.match(/\b\d{17,20}\b/g);
    if (rawIds) {
      for (const id of rawIds) {
        if (!roleIds.includes(id)) {
          roleIds.push(id);
        }
      }
    }
    
    return roleIds;
  }
}

export default RoleSetupPage;
