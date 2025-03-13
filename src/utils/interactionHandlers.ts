import { ButtonInteraction } from 'discord.js';
import ServiceRegistry from '../services/ServiceRegistry';

/**
 * Register all general interaction handlers
 */
export function registerGeneralInteractionHandlers(): void {
    // Register handlers for delete message buttons
    ServiceRegistry.getInteractionHandlerService().registerPrefixHandler('delete_message', handleDeleteMessageButton);
    
    console.log('General interaction handlers registered');
}

/**
 * Handle the delete message button
 */
async function handleDeleteMessageButton(interaction: ButtonInteraction): Promise<void> {
    try {
        const message = interaction.message;
        const customId = interaction.customId;
        const parts = customId.split(':');
        const messageIds = parts.slice(1); // Skip the 'delete_message' part
        
        // Delete the interaction message first
        if (message.deletable) {
            await message.delete().catch(error => {
                console.error('Error deleting message:', error);
            });
        }
        
        // Delete any linked messages
        if (messageIds.length > 0) {
            for (const id of messageIds) {
                try {
                    const channel = message.channel;
                    const relatedMessage = await channel.messages.fetch(id);
                    if (relatedMessage && relatedMessage.deletable) {
                        await relatedMessage.delete();
                    }
                } catch (error) {
                    console.error(`Error deleting linked message ${id}:`, error);
                    // Continue with other messages
                }
            }
        }
    } catch (error) {
        console.error('Error handling delete button:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'Failed to delete message(s).',
                ephemeral: true
            });
        }
    }
}
