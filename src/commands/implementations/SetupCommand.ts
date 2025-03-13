import { 
  ChatInputCommandInteraction, 
  SlashCommandBuilder
} from 'discord.js';
import { Command, CommandController } from '../controller/CommandController';
import { handleSetupCommand } from '../setup';

/**
 * Setup Command
 * Provides a graphical interface for configuring the bot
 */
export class SetupCommand implements Command {
  /**
   * Get the command definition
   */
  public static getDefinition() {
    return new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Configure the bot with a graphical interface');
  }
  
  /**
   * Execute the command
   * @param controller The command controller
   * @param interaction The slash command interaction
   */
  public async execute(controller: CommandController, interaction: ChatInputCommandInteraction): Promise<void> {
    await handleSetupCommand(interaction);
  }
}

export default SetupCommand;
