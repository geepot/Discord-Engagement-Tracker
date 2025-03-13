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
  console.log(`Setting up setup command for user: ${interaction.user.tag} (${interaction.user.id})`);
  
  try {
    // Ensure we're in a text channel
    if (!(interaction.channel instanceof TextChannel)) {
      console.log('Setup attempted in non-text channel');
      await interaction.reply({
        content: 'This command can only be used in text channels.',
        ephemeral: true
      });
      return;
    }
    
    // Check if user has administrator permissions
    if (!interaction.memberPermissions?.has('Administrator')) {
      console.log('Setup attempted by user without Administrator permissions');
      await interaction.reply({
        content: 'You need Administrator permissions to use the setup command.',
        ephemeral: true
      });
      return;
    }
    
    console.log('Creating SetupController instance');
    // Create a new setup controller
    const controller = new SetupController(interaction);
    
    // Register the pages
    console.log('Registering setup pages');
    controller.registerPage('welcome', new WelcomePage());
    controller.registerPage('channel', new ChannelSetupPage());
    controller.registerPage('admin_channel', new AdminChannelSetupPage());
    controller.registerPage('roles', new RoleSetupPage());
    controller.registerPage('test', new TestConfigPage());
    
    // Start the setup wizard
    console.log('Starting setup wizard flow');
    await controller.start();
  } catch (error) {
    console.error('Error in setup command:', error);
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply('An error occurred during setup. Please try again later.');
      } else {
        await interaction.reply({
          content: 'An error occurred during setup. Please try again later.',
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

// Export the handler for potential use by CommandController
export { handleSetupCommand };
