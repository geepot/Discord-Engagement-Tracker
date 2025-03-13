import { ButtonInteraction } from 'discord.js';
import interactionHandler from '../services/interactionHandler';
import { handleMostActive, handleMostInactive } from '../commands/activityRanking';

/**
 * Register all general interaction handlers
 */
export function registerGeneralInteractionHandlers(): void {
    // Register handlers for delete message buttons
    interactionHandler.registerPrefixHandler('delete_message', handleDeleteMessageButton);
    
    // Register handlers for activity ranking pagination
    interactionHandler.registerPrefixHandler('activity_ranking:', handleActivityRankingButton);
    
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

/**
 * Handle the activity ranking pagination buttons
 */
async function handleActivityRankingButton(interaction: ButtonInteraction): Promise<void> {
    try {
        const customId = interaction.customId;
        const [_, action, isActiveStr, countStr, pageStr] = customId.split(':');
        const isActive = isActiveStr === 'true';
        const count = parseInt(countStr);
        const page = parseInt(pageStr);
        
        if (action === 'prev' || action === 'next') {
            // Defer the reply to avoid interaction timeout
            await interaction.deferUpdate();
            
            // Handle the pagination based on whether it's most active or most inactive
            if (isActive) {
                await handleMostActive(interaction, count, page);
            } else {
                await handleMostInactive(interaction, count, page);
            }
        }
    } catch (error) {
        console.error('Error handling activity ranking button:', error);
        if (!interaction.replied) {
            await interaction.reply({
                content: 'Failed to update activity ranking.',
                ephemeral: true
            });
        }
    }
}
