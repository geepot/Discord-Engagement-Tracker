import { Message, TextChannel } from 'discord.js';
import './setupWelcome'; // Import for side effects
import './roleSetup'; // Import for side effects
import './channelSetup'; // Import for side effects
import './adminChannelSetup'; // Import for side effects
import './prefixSetup'; // Import for side effects
import './testConfiguration'; // Import for side effects
import { showSetupWelcome } from './setupHandlers';
import { registerSetupInteractionHandlers } from './setupInteractions';

// Register setup interaction handlers
registerSetupInteractionHandlers();

/**
 * Setup command to help users configure the bot with a graphical interface
 */
async function handleSetup(message: Message): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    
    // Check if user has administrator permissions
    if (!message.member?.permissions.has('Administrator')) {
        await message.reply('You need Administrator permissions to use the setup command.');
        return;
    }
    
    try {
        // Store the user ID of the person who initiated setup
        const initiatorId = message.author.id;
        
        // Send initial message that will be edited by the setup wizard
        const setupMessage = await (message.channel as TextChannel).send({
            content: 'Loading setup wizard...',
            embeds: [],
            components: []
        });
        
        // Show the welcome screen
        await showSetupWelcome({ message, setupMessage, initiatorId });
    } catch (error) {
        console.error('Error in setup command:', error);
        await (message.channel as TextChannel).send('An error occurred during setup. Please try again later.');
    }
}

export default handleSetup;
