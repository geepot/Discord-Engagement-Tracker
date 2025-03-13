import { 
    TextChannel, 
    EmbedBuilder, 
    CollectorFilter, 
    ReadonlyCollection 
} from 'discord.js';
import { SetupContext, SetupHandler } from './types';
import { updateSetting } from './utils';
import { 
    setShowAdminChannelSetup,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the admin channel setup screen
 */
export const showAdminChannelSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('🔔 Admin Channel Setup')
        .setDescription('Please mention the channel you want to use for admin notifications.\n\nExample: `#bot-admin`\n\nThis channel will receive error notifications and important bot updates.')
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the main menu or "none" to clear the admin channel' });
    
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
        
        if (response.content.toLowerCase() === 'none') {
            // Clear the admin channel
            updateSetting('ADMIN_CHANNEL_ID', '');
            await (message.channel as TextChannel).send('✅ Admin channel has been cleared. This change will take effect immediately.');
            await showSetupWelcome({ message, setupMessage });
            return;
        }
        
        // Extract channel ID from mention
        const channelMatch = response.content.match(/<#(\d+)>/);
        if (!channelMatch) {
            await (message.channel as TextChannel).send('❌ Invalid channel format. Please mention a channel using #channel-name.');
            await showAdminChannelSetup({ message, setupMessage });
            return;
        }
        
        const channelId = channelMatch[1];
        
        // Check if channel exists
        try {
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel || !(channel instanceof TextChannel)) {
                await (message.channel as TextChannel).send('❌ Invalid channel or not a text channel.');
                await showAdminChannelSetup({ message, setupMessage });
                return;
            }
            
            // Update settings with new channel ID
            updateSetting('ADMIN_CHANNEL_ID', channelId);
            
            await (message.channel as TextChannel).send(`✅ Successfully set admin channel to <#${channelId}>. This change will take effect immediately.`);
            await showSetupWelcome({ message, setupMessage });
        } catch (error) {
            console.error('Error fetching channel:', error);
            await (message.channel as TextChannel).send('❌ Error fetching channel. Please try again.');
            await showAdminChannelSetup({ message, setupMessage });
        }
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, any>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Admin channel setup timed out.');
            await showSetupWelcome({ message, setupMessage });
        }
    });
};

// Register the admin channel setup handler
setShowAdminChannelSetup(showAdminChannelSetup);
