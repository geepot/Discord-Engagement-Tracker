import { 
  ChatInputCommandInteraction,
  TextChannel
} from 'discord.js';

// Import the setup controller and pages
import SetupController from './controller/SetupController';
import WelcomePage from './pages/WelcomePage';
import ChannelSetupPage from './pages/ChannelSetupPage';
import AdminChannelSetupPage from './pages/AdminChannelSetupPage';
import RoleSetupPage from './pages/RoleSetupPage';
import TestConfigPage from './pages/TestConfigPage';

// Setup command handler
async function handleSetupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  // Ensure we're in a text channel
  if (!(interaction.channel instanceof TextChannel)) {
    await interaction.reply({
      content: 'This command can only be used in text channels.',
      ephemeral: true
    });
    return;
  }
  
  // Check if user has administrator permissions
  if (!interaction.memberPermissions?.has('Administrator')) {
    await interaction.reply({
      content: 'You need Administrator permissions to use the setup command.',
      ephemeral: true
    });
    return;
  }
  
  try {
    // Create a new setup controller
    const controller = new SetupController(interaction);
    
    // Register the pages
    controller.registerPage('welcome', new WelcomePage());
    controller.registerPage('channel', new ChannelSetupPage());
    controller.registerPage('admin_channel', new AdminChannelSetupPage());
    controller.registerPage('roles', new RoleSetupPage());
    controller.registerPage('test', new TestConfigPage());
    
    // Start the setup wizard
    await controller.start();
  } catch (error) {
    console.error('Error in setup command:', error);
    
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply('An error occurred during setup. Please try again later.');
    } else {
      await interaction.reply({
        content: 'An error occurred during setup. Please try again later.',
        ephemeral: true
      });
    }
  }
}

// Export the handler for potential use by CommandController
export { handleSetupCommand };
