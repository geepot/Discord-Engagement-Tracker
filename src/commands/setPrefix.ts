import { Message, TextChannel } from 'discord.js';
import config from '../config';
import database from '../services/database';

async function handleSetPrefix(message: Message): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    
    
    const args = message.content.split(' ');
    
    // Check if a new prefix was provided
    if (args.length < 2) {
        await message.reply(`Current prefix is: \`${config.commandPrefix}\`. To change it, use \`${config.commandPrefix}${config.commands.setPrefix} new_prefix\``);
        return;
    }
    
    const newPrefix = args[1];
    
    // Validate the new prefix
    if (newPrefix.length > 3) {
        await message.reply('Prefix must be 3 characters or less.');
        return;
    }
    
    try {
        // Save the new prefix to the database
        database.saveGuildPrefix(message.guild!.id, newPrefix);
        
        await message.channel.send(`Command prefix has been changed to: \`${newPrefix}\``);
        await message.channel.send(`Example: \`${newPrefix}${config.commands.checkEngagement}\``);
        
        // Note: The actual prefix change will take effect after bot restart
        // In a more advanced implementation, we would update the in-memory config as well
        await message.channel.send('⚠️ Note: The new prefix will take effect after the bot restarts.');
    } catch (error) {
        console.error('Error setting prefix:', error);
        await message.channel.send('An error occurred while setting the new prefix.');
    }
}

export default handleSetPrefix;
