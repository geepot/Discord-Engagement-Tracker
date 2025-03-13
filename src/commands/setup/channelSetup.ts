import { 
    TextChannel, 
    EmbedBuilder, 
    CollectorFilter, 
    ReadonlyCollection 
} from 'discord.js';
import { SetupContext, SetupHandler } from './types';
import { updateSetting } from './utils';
import { 
    setShowChannelSetup,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the channel setup screen
 */
export const showChannelSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('📋 Channel Setup')
        .setDescription('Please mention the channel you want to track engagement in.\n\nExample: `#announcements`')
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
        
        // Extract channel ID from mention
        const channelMatch = response.content.match(/<#(\d+)>/);
        if (!channelMatch) {
            await (message.channel as TextChannel).send('❌ Invalid channel format. Please mention a channel using #channel-name.');
            await showChannelSetup({ message, setupMessage });
            return;
        }
        
        const channelId = channelMatch[1];
        
        // Check if channel exists
        try {
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel || !(channel instanceof TextChannel)) {
                await (message.channel as TextChannel).send('❌ Invalid channel or not a text channel.');
                await showChannelSetup({ message, setupMessage });
                return;
            }
            
            // Update settings with new channel ID
            updateSetting('TRACKED_CHANNEL_ID', channelId);
            
            await (message.channel as TextChannel).send(`✅ Successfully set tracked channel to <#${channelId}>. This change will take effect immediately.`);
            await showSetupWelcome({ message, setupMessage });
        } catch (error) {
            console.error('Error fetching channel:', error);
            await (message.channel as TextChannel).send('❌ Error fetching channel. Please try again.');
            await showChannelSetup({ message, setupMessage });
        }
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, any>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Channel setup timed out.');
            await showSetupWelcome({ message, setupMessage });
        }
    });
};

// Register the channel setup handler
setShowChannelSetup(showChannelSetup);
