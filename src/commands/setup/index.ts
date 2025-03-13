import { 
    Message, 
    TextChannel, 
    SlashCommandBuilder, 
    ChatInputCommandInteraction 
} from 'discord.js';
import './setupWelcome'; // Import for side effects
import './roleSetup'; // Import for side effects
import './channelSetup'; // Import for side effects
import './adminChannelSetup'; // Import for side effects
import './prefixSetup'; // Import for side effects
import './testConfiguration'; // Import for side effects
import { showSetupWelcome } from './setupHandlers';
import { registerSetupInteractionHandlers } from './setupInteractions';
import { registerCommand } from '../../utils/slashCommands';

// Register setup interaction handlers
registerSetupInteractionHandlers();

// Define the slash command
const setupCommand = new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure the bot with a graphical interface');

// Register the slash command
registerCommand({
    data: setupCommand,
    execute: async (interaction: ChatInputCommandInteraction) => {
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
            // Store the user ID of the person who initiated setup
            const initiatorId = interaction.user.id;
            
            // Defer the reply to give us time to prepare the setup wizard
            await interaction.deferReply();
            
            // Send initial message that will be edited by the setup wizard
            const setupMessage = await interaction.editReply({
                content: 'Loading setup wizard...',
                embeds: [],
                components: []
            });
            
            // Create a dummy message object to maintain compatibility with the existing setup code
            const dummyMessage = {
                id: interaction.id,
                channel: interaction.channel,
                author: interaction.user,
                guild: interaction.guild,
                client: interaction.client
            } as Message;
            
            // Show the welcome screen
            await showSetupWelcome({ 
                message: dummyMessage, 
                setupMessage: setupMessage as any, // Type cast to make it compatible
                initiatorId 
            });
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
});

/**
 * Setup command to help users configure the bot with a graphical interface
 * This is kept for backward compatibility
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
    
    await message.reply('Please use the slash command `/setup` instead.');
}

export default handleSetup;
