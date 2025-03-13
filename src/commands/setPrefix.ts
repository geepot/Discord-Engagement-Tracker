import { Message } from 'discord.js';

// This command is no longer needed since we're using slash commands
// Keeping this file for backward compatibility

async function handleSetPrefix(message: Message): Promise<void> {
    // No-op function for backward compatibility
    console.log('setPrefix command is deprecated - using slash commands instead');
}

export default handleSetPrefix;
