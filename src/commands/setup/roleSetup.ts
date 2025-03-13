import { 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    MessageComponentInteraction,
    CollectorFilter, 
    ReadonlyCollection 
} from 'discord.js';
import config from '../../config';
import { SetupContext, SetupHandler } from './types';
import { updateSetting } from './utils';
import { 
    setShowRoleSetup,
    setShowAdminRoleSetup,
    setShowModRoleSetup,
    showSetupWelcome
} from './setupHandlers';

/**
 * Shows the role setup screen
 */
export const showRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('👥 Role Setup')
        .setDescription('Configure which roles can use admin and moderator commands.\n\nSelect an option:')
        .setColor('#007bff')
        .addFields(
            { name: 'Admin Roles', value: 'Roles that can use admin commands like `set-prefix` and `schedule-report`' },
            { name: 'Mod Roles', value: 'Roles that can use moderator commands like `check-engagement` and activity rankings' }
        )
        .setFooter({ text: 'Discord Engagement Tracker • Role Setup' });
    
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_admin_roles')
                .setLabel('Set Admin Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setup_mod_roles')
                .setLabel('Set Mod Roles')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('setup_back')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await setupMessage.edit({
        embeds: [embed],
        components: [row]
    });
    
    // Create collector for button interactions
    const collector = setupMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (interaction: MessageComponentInteraction) => {
        // Ensure only the original command user can interact with buttons
        if (interaction.user.id !== message.author.id) {
            await interaction.reply({
                content: 'Only the person who initiated setup can use these buttons.',
                ephemeral: true
            });
            return;
        }
        
        await interaction.deferUpdate();
        
        const context: SetupContext = { message, setupMessage };
        
        switch (interaction.customId) {
            case 'setup_admin_roles':
                await showAdminRoleSetup(context);
                break;
                
            case 'setup_mod_roles':
                await showModRoleSetup(context);
                break;
                
            case 'setup_back':
                await showSetupWelcome(context);
                break;
        }
        
        collector.stop();
    });
    
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Role setup timed out.');
            await showSetupWelcome({ message, setupMessage });
        }
    });
};

/**
 * Shows the admin role setup screen
 */
export const showAdminRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('👑 Admin Role Setup')
        .setDescription('Please mention all roles that should have admin command access, separated by spaces.\n\nExample: `@Admin @Owner @Moderator`\n\nCurrent admin roles: ' + 
            (config.permissions.adminRoleIds.length > 0 ? 
                config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') : 
                'None'))
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the role menu' });
    
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
            await showRoleSetup({ message, setupMessage });
            return;
        }
        
        // Extract role IDs from mentions
        const roleIds: string[] = [];
        const roleMentions = response.content.match(/<@&(\d+)>/g);
        
        if (roleMentions) {
            for (const mention of roleMentions) {
                const roleId = mention.match(/<@&(\d+)>/)?.[1];
                if (roleId) {
                    roleIds.push(roleId);
                }
            }
        }
        
        if (roleIds.length === 0) {
            await (message.channel as TextChannel).send('❌ No valid role mentions found. Please mention roles using @role-name.');
            await showAdminRoleSetup({ message, setupMessage });
            return;
        }
        
        // Update settings with new role IDs
        updateSetting('ADMIN_ROLE_IDS', roleIds.join(','));
        
        await (message.channel as TextChannel).send(`✅ Successfully set admin roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`);
        await showRoleSetup({ message, setupMessage });
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, any>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Admin role setup timed out.');
            await showRoleSetup({ message, setupMessage });
        }
    });
};

/**
 * Shows the mod role setup screen
 */
export const showModRoleSetup: SetupHandler = async ({ message, setupMessage }: SetupContext): Promise<void> => {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Mod Role Setup')
        .setDescription('Please mention all roles that should have moderator command access, separated by spaces.\n\nExample: `@Mod @Helper @Support`\n\nCurrent mod roles: ' + 
            (config.permissions.modRoleIds.length > 0 ? 
                config.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') : 
                'None'))
        .setColor('#007bff')
        .setFooter({ text: 'Type "cancel" to go back to the role menu' });
    
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
            await showRoleSetup({ message, setupMessage });
            return;
        }
        
        // Extract role IDs from mentions
        const roleIds: string[] = [];
        const roleMentions = response.content.match(/<@&(\d+)>/g);
        
        if (roleMentions) {
            for (const mention of roleMentions) {
                const roleId = mention.match(/<@&(\d+)>/)?.[1];
                if (roleId) {
                    roleIds.push(roleId);
                }
            }
        }
        
        if (roleIds.length === 0) {
            await (message.channel as TextChannel).send('❌ No valid role mentions found. Please mention roles using @role-name.');
            await showModRoleSetup({ message, setupMessage });
            return;
        }
        
        // Update settings with new role IDs
        updateSetting('MOD_ROLE_IDS', roleIds.join(','));
        
        await (message.channel as TextChannel).send(`✅ Successfully set mod roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. This change will take effect immediately.`);
        await showRoleSetup({ message, setupMessage });
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, any>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Mod role setup timed out.');
            await showRoleSetup({ message, setupMessage });
        }
    });
};

// Register the role setup handlers
setShowRoleSetup(showRoleSetup);
setShowAdminRoleSetup(showAdminRoleSetup);
setShowModRoleSetup(showModRoleSetup);