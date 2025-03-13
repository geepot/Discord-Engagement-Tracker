import { TextChannel } from 'discord.js';
import { SetupContext, SetupHandler } from './types';
import { setShowAdminChannelSetup } from './setupHandlers';

/**
 * This function is no longer used as it's been replaced by the modal approach in setupInteractions.ts
 * Keeping an empty implementation for backward compatibility
 */
export const showAdminChannelSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    console.log('Admin channel setup requested via legacy method');
    // No implementation needed as this is handled by the modal in setupInteractions.ts
};

// Register the admin channel setup handler
setShowAdminChannelSetup(showAdminChannelSetup);
