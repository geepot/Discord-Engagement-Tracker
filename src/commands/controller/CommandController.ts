import { 
  ChatInputCommandInteraction, 
  ButtonInteraction, 
  ModalSubmitInteraction
} from 'discord.js';
import ServiceRegistry from '../../services/ServiceRegistry';

/**
 * Command interface
 * Each command implements this interface
 */
export interface Command {
  /**
   * Execute the command
   * @param controller The command controller
   * @param interaction The slash command interaction
   */
  execute(controller: CommandController, interaction: ChatInputCommandInteraction): Promise<void>;
  
  /**
   * Handle button interactions for this command
   * @param controller The command controller
   * @param interaction The button interaction
   * @returns True if the interaction was handled, false otherwise
   */
  handleButtonInteraction?(controller: CommandController, interaction: ButtonInteraction): Promise<boolean>;
  
  /**
   * Handle modal submissions for this command
   * @param controller The command controller
   * @param interaction The modal submission interaction
   * @returns True if the interaction was handled, false otherwise
   */
  handleModalSubmission?(controller: CommandController, interaction: ModalSubmitInteraction): Promise<boolean>;
}

/**
 * Command controller class
 * Manages command execution and interactions
 */
export class CommandController {
  private commands: Map<string, Command> = new Map();
  
  constructor() {
    // Register interaction handlers
    this.registerInteractionHandlers();
  }
  
  /**
   * Register a command
   * @param commandName The command name
   * @param command The command implementation
   */
  public registerCommand(commandName: string, command: Command): void {
    this.commands.set(commandName, command);
  }
  
  /**
   * Execute a command
   * @param interaction The slash command interaction
   */
  public async executeCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      const commandName = interaction.commandName;
      const command = this.commands.get(commandName);
      
      if (!command) {
        await interaction.reply({
          content: `Command not found: ${commandName}`,
          ephemeral: true
        });
        return;
      }
      
      await command.execute(this, interaction);
    } catch (error) {
      console.error('Error executing command:', error);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'An error occurred while executing the command.',
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: 'An error occurred while executing the command.',
          ephemeral: true
        });
      }
    }
  }
  
  /**
   * Register interaction handlers
   */
  private registerInteractionHandlers(): void {
    const interactionHandler = ServiceRegistry.getInteractionHandlerService();
    
    // Register a prefix handler for command buttons
    interactionHandler.registerPrefixHandler('cmd_', this.handleButtonInteraction.bind(this));
  }
  
  /**
   * Handle button interactions
   * @param interaction The button interaction
   */
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      // Extract the command name from the button ID
      // Format: cmd_commandName_action
      const parts = interaction.customId.split('_');
      if (parts.length < 2) {
        console.warn(`Invalid button ID format: ${interaction.customId}`);
        return;
      }
      
      const commandName = parts[1];
      const command = this.commands.get(commandName);
      
      if (!command || !command.handleButtonInteraction) {
        console.warn(`No handler found for button: ${interaction.customId}`);
        return;
      }
      
      const handled = await command.handleButtonInteraction(this, interaction);
      if (!handled) {
        console.warn(`Button interaction not handled: ${interaction.customId}`);
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while processing your interaction.',
          ephemeral: true
        });
      }
    }
  }
  
  /**
   * Handle modal submissions
   * @param interaction The modal submission interaction
   */
  public async handleModalSubmission(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      // Extract the command name from the modal ID
      // Format: cmd_commandName_modalId
      const parts = interaction.customId.split('_');
      if (parts.length < 2) {
        console.warn(`Invalid modal ID format: ${interaction.customId}`);
        return;
      }
      
      const commandName = parts[1];
      const command = this.commands.get(commandName);
      
      if (!command || !command.handleModalSubmission) {
        console.warn(`No handler found for modal: ${interaction.customId}`);
        return;
      }
      
      const handled = await command.handleModalSubmission(this, interaction);
      if (!handled) {
        console.warn(`Modal submission not handled: ${interaction.customId}`);
      }
    } catch (error) {
      console.error('Error handling modal submission:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: 'An error occurred while processing your submission.',
          ephemeral: true
        });
      }
    }
  }
  
  /**
   * Get a command
   * @param commandName The command name
   * @returns The command implementation
   */
  public getCommand(commandName: string): Command | undefined {
    return this.commands.get(commandName);
  }
}

// Export a singleton instance
export default new CommandController();
