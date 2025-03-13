import { 
    SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    ModalSubmitInteraction,
    Client,
    REST,
    Routes,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder
} from 'discord.js';
import config from '../config';

// Type definitions for slash commands
export type SlashCommandExecuteFunction = (interaction: ChatInputCommandInteraction) => Promise<void>;

export interface SlashCommand {
    data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder | SlashCommandSubcommandsOnlyBuilder;
    execute: SlashCommandExecuteFunction;
}

// Collection of registered slash commands
const commands = new Map<string, SlashCommand>();

/**
 * Register a slash command
 * @param command The slash command to register
 */
export function registerCommand(command: SlashCommand): void {
    commands.set(command.data.name, command);
}

/**
 * Get a registered slash command
 * @param name The name of the command to get
 * @returns The slash command, or undefined if not found
 */
export function getCommand(name: string): SlashCommand | undefined {
    return commands.get(name);
}

/**
 * Get all registered slash commands
 * @returns Array of all registered slash commands
 */
export function getAllCommands(): SlashCommand[] {
    return Array.from(commands.values());
}

/**
 * Register all slash commands with Discord
 * @param client The Discord.js client
 */
export async function registerSlashCommands(client: Client): Promise<void> {
    try {
        console.log('Started refreshing application (/) commands.');
        
        const rest = new REST().setToken(config.token);
        
        // Get all command data
        const commandData = getAllCommands().map(command => command.data.toJSON());
        
        // Register commands globally
        if (client.application) {
            await rest.put(
                Routes.applicationCommands(client.application.id),
                { body: commandData }
            );
            
            console.log(`Successfully registered ${commandData.length} application (/) commands.`);
        } else {
            console.error('Client application is not available.');
        }
    } catch (error) {
        console.error('Error registering slash commands:', error);
    }
}

/**
 * Create a modal for user input
 * @param customId The custom ID for the modal
 * @param title The title of the modal
 * @param inputs Array of input fields for the modal
 * @returns The created modal
 */
export function createModal(
    customId: string,
    title: string,
    inputs: {
        id: string;
        label: string;
        style?: TextInputStyle;
        placeholder?: string;
        value?: string;
        required?: boolean;
        minLength?: number;
        maxLength?: number;
    }[]
): ModalBuilder {
    const modal = new ModalBuilder()
        .setCustomId(customId)
        .setTitle(title);
    
    // Add inputs to the modal
    for (const input of inputs) {
        const textInput = new TextInputBuilder()
            .setCustomId(input.id)
            .setLabel(input.label)
            .setStyle(input.style || TextInputStyle.Short);
        
        if (input.placeholder) textInput.setPlaceholder(input.placeholder);
        if (input.value) textInput.setValue(input.value);
        if (input.required !== undefined) textInput.setRequired(input.required);
        if (input.minLength) textInput.setMinLength(input.minLength);
        if (input.maxLength) textInput.setMaxLength(input.maxLength);
        
        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
        modal.addComponents(row);
    }
    
    return modal;
}

/**
 * Handle a slash command interaction
 * @param interaction The slash command interaction
 */
export async function handleSlashCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = getCommand(interaction.commandName);
    
    if (!command) {
        await interaction.reply({
            content: `No command matching ${interaction.commandName} was found.`,
            ephemeral: true
        });
        return;
    }
    
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}
