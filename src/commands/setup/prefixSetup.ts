import { SetupContext, SetupHandler } from './types';
import { setShowPrefixSetup } from './setupHandlers';

/**
 * This function is no longer needed as we're using slash commands instead of prefix commands.
 * Keeping an empty implementation for backward compatibility.
 */
export const showPrefixSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    console.log('Prefix setup is deprecated - using slash commands instead');
    
    // If this is somehow called, inform the user that prefix setup is no longer needed
    if (setupMessage && setupMessage.edit) {
        await setupMessage.edit({
            content: 'Prefix setup is no longer needed as the bot now uses slash commands.',
            embeds: [],
            components: []
        });
    }
};

// Register the prefix setup handler
setShowPrefixSetup(showPrefixSetup);
