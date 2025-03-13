import { 
    TextChannel, 
    EmbedBuilder, 
    CollectorFilter, 
    ReadonlyCollection 
} from 'discord.js';
import config from '../../config';
import database from '../../services/database';
import { SetupContext, SetupHandler } from './types';
import { updateEnvFile } from './utils';
import { 
    setShowPrefixSetup,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the prefix setup screen
 */
export const showPrefixSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('⌨️ Command Prefix Setup')
        .setDescription('Please enter a new command prefix. This is the character that will be used before commands.\n\nCurrent prefix: `' + config.commandPrefix + '`\n\nExample prefixes: `!`, `?`, `$`, `.`')
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the main menu' });
    
    await setupMessage.edit({
        embeds: [embed],
        components: []
    });
    
    // Create message collector
    const filter = ((m: any) => m.author.id === message.author.id) as CollectorFilter<[any]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showSetupWelcome({ message, setupMessage });
            return;
        }
        
        const newPrefix = response.content.trim();
        
        // Validate prefix
        if (newPrefix.length > 3) {
            await (message.channel as TextChannel).send('❌ Prefix must be 3 characters or less.');
            await showPrefixSetup({ message, setupMessage });
            return;
        }
        
        // Update .env file with new prefix
        updateEnvFile('COMMAND_PREFIX', newPrefix);
        
        // Save to database for immediate effect
        if (message.guild) {
            database.saveGuildPrefix(message.guild.id, newPrefix);
        }
        
        await (message.channel as TextChannel).send(`✅ Successfully set command prefix to \`${newPrefix}\`. This change will take effect immediately for this server.`);
        await showSetupWelcome({ message, setupMessage });
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, any>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Prefix setup timed out.');
            await showSetupWelcome({ message, setupMessage });
        }
    });
};

// Register the prefix setup handler
setShowPrefixSetup(showPrefixSetup);
