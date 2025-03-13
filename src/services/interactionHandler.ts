import { 
    Interaction, 
    ButtonInteraction, 
    Message, 
    Client,
    Events
} from 'discord.js';

type ButtonInteractionHandler = (interaction: ButtonInteraction) => Promise<void>;

class InteractionHandlerService {
    private buttonHandlers: Map<string, ButtonInteractionHandler> = new Map();
    private prefixHandlers: Map<string, ButtonInteractionHandler> = new Map();
    private client: Client | null = null;

    /**
     * Initialize the interaction handler with the Discord client
     * @param client The Discord.js client
     */
    public initialize(client: Client): void {
        this.client = client;
        
        // Set up the interaction event handler
        client.on(Events.InteractionCreate, this.handleInteraction.bind(this));
        
        console.log('Interaction handler initialized');
    }

    /**
     * Register a handler for a specific button ID
     * @param buttonId The exact button ID to handle
     * @param handler The handler function
     */
    public registerButtonHandler(buttonId: string, handler: ButtonInteractionHandler): void {
        this.buttonHandlers.set(buttonId, handler);
    }

    /**
     * Register a handler for buttons with IDs starting with a specific prefix
     * @param prefix The button ID prefix to handle
     * @param handler The handler function
     */
    public registerPrefixHandler(prefix: string, handler: ButtonInteractionHandler): void {
        this.prefixHandlers.set(prefix, handler);
    }

    /**
     * Handle an incoming interaction
     * @param interaction The Discord.js interaction
     */
    private async handleInteraction(interaction: Interaction): Promise<void> {
        if (!interaction.isButton()) return;
        
        try {
            const buttonInteraction = interaction as ButtonInteraction;
            const customId = buttonInteraction.customId;
            
            // Check for exact button ID handlers
            if (this.buttonHandlers.has(customId)) {
                await this.buttonHandlers.get(customId)!(buttonInteraction);
                return;
            }
            
            // Check for prefix handlers
            for (const [prefix, handler] of this.prefixHandlers.entries()) {
                if (customId.startsWith(prefix)) {
                    await handler(buttonInteraction);
                    return;
                }
            }
            
            // No handler found
            console.warn(`No handler found for button interaction with ID: ${customId}`);
            
        } catch (error) {
            console.error('Error handling interaction:', error);
            
            // If the interaction hasn't been responded to yet, send an error message
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ 
                    content: 'An error occurred while processing this interaction.', 
                    ephemeral: true 
                });
            }
        }
    }
}

// Export a singleton instance
export default new InteractionHandlerService();
