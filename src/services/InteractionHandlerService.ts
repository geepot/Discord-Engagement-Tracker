import { 
    Interaction, 
    ButtonInteraction, 
    ModalSubmitInteraction,
    ChatInputCommandInteraction,
    Client,
    Events
} from 'discord.js';
import { AbstractBaseService } from './BaseService';
import { handleSlashCommand } from '../utils/slashCommands';

type ButtonInteractionHandler = (interaction: ButtonInteraction) => Promise<void>;
type ModalSubmitInteractionHandler = (interaction: ModalSubmitInteraction) => Promise<void>;
type SlashCommandInteractionHandler = (interaction: ChatInputCommandInteraction) => Promise<void>;

/**
 * Service for handling Discord interactions
 * Manages button, modal, and slash command interactions
 */
export class InteractionHandlerService extends AbstractBaseService {
    private buttonHandlers: Map<string, ButtonInteractionHandler> = new Map();
    private prefixHandlers: Map<string, ButtonInteractionHandler> = new Map();
    private modalHandlers: Map<string, ModalSubmitInteractionHandler> = new Map();
    private modalPrefixHandlers: Map<string, ModalSubmitInteractionHandler> = new Map();
    private slashCommandHandlers: Map<string, SlashCommandInteractionHandler> = new Map();
    private client: Client | null = null;

    /**
     * Initialize the service
     * This method is called when the service is registered with the container
     */
    public async initialize(): Promise<void> {
        console.log('InteractionHandlerService initialized');
    }

    /**
     * Shutdown the service
     * This method is called when the application is shutting down
     */
    public async shutdown(): Promise<void> {
        console.log('InteractionHandlerService shutdown');
    }

    /**
     * Initialize the interaction handler with the Discord client
     * @param client The Discord.js client
     */
    public initializeClient(client: Client): void {
        this.client = client;
        
        // Set up the interaction event handler
        client.on(Events.InteractionCreate, this.handleInteraction.bind(this));
        
        console.log('Interaction handler client initialized');
    }

    /**
     * Register a handler for a specific button ID
     * @param buttonId The exact button ID to handle
     * @param handler The handler function, or null to unregister
     */
    public registerButtonHandler(buttonId: string, handler: ButtonInteractionHandler | null): void {
        if (handler === null) {
            this.buttonHandlers.delete(buttonId);
        } else {
            this.buttonHandlers.set(buttonId, handler);
        }
    }

    /**
     * Register a handler for buttons with IDs starting with a specific prefix
     * @param prefix The button ID prefix to handle
     * @param handler The handler function, or null to unregister
     */
    public registerPrefixHandler(prefix: string, handler: ButtonInteractionHandler | null): void {
        if (handler === null) {
            this.prefixHandlers.delete(prefix);
        } else {
            this.prefixHandlers.set(prefix, handler);
        }
    }
    
    /**
     * Register a handler for a specific modal ID
     * @param modalId The exact modal ID to handle
     * @param handler The handler function, or null to unregister
     */
    public registerModalHandler(modalId: string, handler: ModalSubmitInteractionHandler | null): void {
        if (handler === null) {
            this.modalHandlers.delete(modalId);
        } else {
            this.modalHandlers.set(modalId, handler);
        }
    }
    
    /**
     * Register a handler for modals with IDs starting with a specific prefix
     * @param prefix The modal ID prefix to handle
     * @param handler The handler function, or null to unregister
     */
    public registerModalPrefixHandler(prefix: string, handler: ModalSubmitInteractionHandler | null): void {
        if (handler === null) {
            this.modalPrefixHandlers.delete(prefix);
        } else {
            this.modalPrefixHandlers.set(prefix, handler);
        }
    }

    /**
     * Register a handler for a specific slash command
     * @param commandName The exact command name to handle
     * @param handler The handler function, or null to unregister
     */
    public registerSlashCommandHandler(commandName: string, handler: SlashCommandInteractionHandler | null): void {
        if (handler === null) {
            this.slashCommandHandlers.delete(commandName);
        } else {
            this.slashCommandHandlers.set(commandName, handler);
        }
    }

    /**
     * Handle an incoming interaction
     * @param interaction The Discord.js interaction
     */
    private async handleInteraction(interaction: Interaction): Promise<void> {
        try {
            if (interaction.isButton()) {
                await this.handleButtonInteraction(interaction);
            } else if (interaction.isModalSubmit()) {
                await this.handleModalSubmitInteraction(interaction);
            } else if (interaction.isChatInputCommand()) {
                // Use the slash command handler from slashCommands.ts
                await handleSlashCommand(interaction);
            }
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            // If the interaction hasn't been responded to yet, send an error message
            if (interaction.isRepliable()) {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ 
                        content: 'An error occurred while processing this interaction.', 
                        ephemeral: true 
                    });
                }
            }
        }
    }
    
    /**
     * Handle a button interaction
     * @param interaction The button interaction
     */
    private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        const customId = interaction.customId;
        
        // Check for exact button ID handlers
        if (this.buttonHandlers.has(customId)) {
            await this.buttonHandlers.get(customId)!(interaction);
            return;
        }
        
        // Check for prefix handlers
        for (const [prefix, handler] of this.prefixHandlers.entries()) {
            if (customId.startsWith(prefix)) {
                await handler(interaction);
                return;
            }
        }
        
        // No handler found
        console.warn(`No handler found for button interaction with ID: ${customId}`);
    }
    
    /**
     * Handle a modal submit interaction
     * @param interaction The modal submit interaction
     */
    private async handleModalSubmitInteraction(interaction: ModalSubmitInteraction): Promise<void> {
        const customId = interaction.customId;
        
        console.log(`Handling modal submission with ID: ${customId}`);
        
        // Check for exact modal ID handlers
        if (this.modalHandlers.has(customId)) {
            console.log(`Found exact handler for modal: ${customId}`);
            await this.modalHandlers.get(customId)!(interaction);
            return;
        }
        
        // Check for prefix handlers
        for (const [prefix, handler] of this.modalPrefixHandlers.entries()) {
            if (customId.startsWith(prefix)) {
                console.log(`Found prefix handler for modal: ${customId} (prefix: ${prefix})`);
                await handler(interaction);
                return;
            }
        }
        
        // No handler found
        console.warn(`No handler found for modal submit interaction with ID: ${customId}`);
    }
}

export default InteractionHandlerService;
