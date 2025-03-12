import { 
    Message, 
    TextChannel, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    MessageComponentInteraction,
    Collection,
    CollectorFilter,
    ReadonlyCollection
} from 'discord.js';
import config from '../config';
import database from '../services/database';
import fs from 'fs';
import path from 'path';

// Setup command to help users configure the bot with a graphical interface
async function handleSetup(message: Message): Promise<void> {
    // Ensure we're in a text channel
    if (!(message.channel instanceof TextChannel)) {
        await message.reply('This command can only be used in text channels.');
        return;
    }
    
    // Check if user has administrator permissions
    if (!message.member?.permissions.has('Administrator')) {
        await message.reply('You need Administrator permissions to use the setup command.');
        return;
    }
    
    try {
        await showSetupWelcome(message);
    } catch (error) {
        console.error('Error in setup command:', error);
        await (message.channel as TextChannel).send('An error occurred during setup. Please try again later.');
    }
}

// Show welcome message and main menu
async function showSetupWelcome(message: Message): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle('📊 Discord Engagement Tracker Setup')
        .setDescription('Welcome to the setup wizard! This will help you configure the bot for your server.')
        .setColor('#007bff')
        .addFields(
            { name: 'Current Configuration', value: 'Select an option below to view or modify settings.' },
            { name: 'Tracked Channel', value: `<#${config.trackedChannelId || 'Not set'}>`, inline: true },
            { name: 'Admin Channel', value: config.adminChannelId ? `<#${config.adminChannelId}>` : 'Not set', inline: true },
            { name: 'Command Prefix', value: config.commandPrefix, inline: true }
        )
        .setFooter({ text: 'Discord Engagement Tracker • Setup Wizard' });
    
    const row1 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_channel')
                .setLabel('Set Tracked Channel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📋'),
            new ButtonBuilder()
                .setCustomId('setup_admin_channel')
                .setLabel('Set Admin Channel')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🔔'),
            new ButtonBuilder()
                .setCustomId('setup_prefix')
                .setLabel('Set Command Prefix')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('⌨️')
        );
        
    const row2 = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_roles')
                .setLabel('Configure Roles')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👥'),
            new ButtonBuilder()
                .setCustomId('setup_test')
                .setLabel('Test Configuration')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );
    
    const setupMessage = await (message.channel as TextChannel).send({
        embeds: [embed],
        components: [row1, row2]
    });
    
    // Create collector for button interactions
    const collector = setupMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
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
        
        switch (interaction.customId) {
            case 'setup_channel':
                await showChannelSetup(message, setupMessage);
                break;
                
            case 'setup_admin_channel':
                await showAdminChannelSetup(message, setupMessage);
                break;
                
            case 'setup_prefix':
                await showPrefixSetup(message, setupMessage);
                break;
                
            case 'setup_roles':
                await showRoleSetup(message, setupMessage);
                break;
                
            case 'setup_test':
                await testConfiguration(message, setupMessage);
                break;
        }
    });
    
    collector.on('end', async () => {
        // Disable buttons after timeout
        const disabledRow1 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_channel')
                    .setLabel('Set Tracked Channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_admin_channel')
                    .setLabel('Set Admin Channel')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔔')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_prefix')
                    .setLabel('Set Command Prefix')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⌨️')
                    .setDisabled(true)
            );
            
        const disabledRow2 = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('setup_roles')
                    .setLabel('Configure Roles')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥')
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('setup_test')
                    .setLabel('Test Configuration')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✅')
                    .setDisabled(true)
            );
        
        await setupMessage.edit({
            components: [disabledRow1, disabledRow2]
        });
    });
}

// Channel setup
async function showChannelSetup(message: Message, setupMessage: Message): Promise<void> {
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
    const filter = ((m: Message) => m.author.id === message.author.id) as CollectorFilter<[Message]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response: Message) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showSetupWelcome(message);
            return;
        }
        
        // Extract channel ID from mention
        const channelMatch = response.content.match(/<#(\d+)>/);
        if (!channelMatch) {
            await (message.channel as TextChannel).send('❌ Invalid channel format. Please mention a channel using #channel-name.');
            await showChannelSetup(message, setupMessage);
            return;
        }
        
        const channelId = channelMatch[1];
        
        // Check if channel exists
        try {
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel || !(channel instanceof TextChannel)) {
                await (message.channel as TextChannel).send('❌ Invalid channel or not a text channel.');
                await showChannelSetup(message, setupMessage);
                return;
            }
            
            // Update .env file with new channel ID
            updateEnvFile('TRACKED_CHANNEL_ID', channelId);
            
            await (message.channel as TextChannel).send(`✅ Successfully set tracked channel to <#${channelId}>. Note: This change will take effect after restarting the bot.`);
            await showSetupWelcome(message);
        } catch (error) {
            console.error('Error fetching channel:', error);
            await (message.channel as TextChannel).send('❌ Error fetching channel. Please try again.');
            await showChannelSetup(message, setupMessage);
        }
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, Message>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Channel setup timed out.');
            await showSetupWelcome(message);
        }
    });
}

// Admin Channel setup
async function showAdminChannelSetup(message: Message, setupMessage: Message): Promise<void> {
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
    const filter = ((m: Message) => m.author.id === message.author.id) as CollectorFilter<[Message]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response: Message) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showSetupWelcome(message);
            return;
        }
        
        if (response.content.toLowerCase() === 'none') {
            // Clear the admin channel
            updateEnvFile('ADMIN_CHANNEL_ID', '');
            await (message.channel as TextChannel).send('✅ Admin channel has been cleared. No admin notifications will be sent.');
            await showSetupWelcome(message);
            return;
        }
        
        // Extract channel ID from mention
        const channelMatch = response.content.match(/<#(\d+)>/);
        if (!channelMatch) {
            await (message.channel as TextChannel).send('❌ Invalid channel format. Please mention a channel using #channel-name.');
            await showAdminChannelSetup(message, setupMessage);
            return;
        }
        
        const channelId = channelMatch[1];
        
        // Check if channel exists
        try {
            const channel = await message.guild?.channels.fetch(channelId);
            if (!channel || !(channel instanceof TextChannel)) {
                await (message.channel as TextChannel).send('❌ Invalid channel or not a text channel.');
                await showAdminChannelSetup(message, setupMessage);
                return;
            }
            
            // Update .env file with new channel ID
            updateEnvFile('ADMIN_CHANNEL_ID', channelId);
            
            await (message.channel as TextChannel).send(`✅ Successfully set admin channel to <#${channelId}>. Note: This change will take effect after restarting the bot.`);
            await showSetupWelcome(message);
        } catch (error) {
            console.error('Error fetching channel:', error);
            await (message.channel as TextChannel).send('❌ Error fetching channel. Please try again.');
            await showAdminChannelSetup(message, setupMessage);
        }
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, Message>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Admin channel setup timed out.');
            await showSetupWelcome(message);
        }
    });
}

// Prefix setup
async function showPrefixSetup(message: Message, setupMessage: Message): Promise<void> {
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
    const filter = ((m: Message) => m.author.id === message.author.id) as CollectorFilter<[Message]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response: Message) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showSetupWelcome(message);
            return;
        }
        
        const newPrefix = response.content.trim();
        
        // Validate prefix
        if (newPrefix.length > 3) {
            await (message.channel as TextChannel).send('❌ Prefix must be 3 characters or less.');
            await showPrefixSetup(message, setupMessage);
            return;
        }
        
        // Update .env file with new prefix
        updateEnvFile('COMMAND_PREFIX', newPrefix);
        
        // Save to database for immediate effect
        if (message.guild) {
            database.saveGuildPrefix(message.guild.id, newPrefix);
        }
        
        await (message.channel as TextChannel).send(`✅ Successfully set command prefix to \`${newPrefix}\`. This change will take effect immediately for this server.`);
        await showSetupWelcome(message);
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, Message>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Prefix setup timed out.');
            await showSetupWelcome(message);
        }
    });
}

// Role setup
async function showRoleSetup(message: Message, setupMessage: Message): Promise<void> {
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
        
        switch (interaction.customId) {
            case 'setup_admin_roles':
                await showAdminRoleSetup(message, setupMessage);
                break;
                
            case 'setup_mod_roles':
                await showModRoleSetup(message, setupMessage);
                break;
                
            case 'setup_back':
                await showSetupWelcome(message);
                break;
        }
        
        collector.stop();
    });
    
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Role setup timed out.');
            await showSetupWelcome(message);
        }
    });
}

// Admin role setup
async function showAdminRoleSetup(message: Message, setupMessage: Message): Promise<void> {
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
    const filter = ((m: Message) => m.author.id === message.author.id) as CollectorFilter<[Message]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response: Message) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showRoleSetup(message, setupMessage);
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
            await showAdminRoleSetup(message, setupMessage);
            return;
        }
        
        // Update .env file with new role IDs
        updateEnvFile('ADMIN_ROLE_IDS', roleIds.join(','));
        
        await (message.channel as TextChannel).send(`✅ Successfully set admin roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. Note: This change will take effect after restarting the bot.`);
        await showRoleSetup(message, setupMessage);
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, Message>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Admin role setup timed out.');
            await showRoleSetup(message, setupMessage);
        }
    });
}

// Mod role setup
async function showModRoleSetup(message: Message, setupMessage: Message): Promise<void> {
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
    const filter = ((m: Message) => m.author.id === message.author.id) as CollectorFilter<[Message]>;
    const collector = (message.channel as TextChannel).createMessageCollector({
        filter,
        max: 1,
        time: 60000 // 1 minute
    });
    
    collector.on('collect', async (response: Message) => {
        if (response.content.toLowerCase() === 'cancel') {
            await showRoleSetup(message, setupMessage);
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
            await showModRoleSetup(message, setupMessage);
            return;
        }
        
        // Update .env file with new role IDs
        updateEnvFile('MOD_ROLE_IDS', roleIds.join(','));
        
        await (message.channel as TextChannel).send(`✅ Successfully set mod roles to ${roleIds.map(id => `<@&${id}>`).join(', ')}. Note: This change will take effect after restarting the bot.`);
        await showRoleSetup(message, setupMessage);
    });
    
    collector.on('end', async (collected: ReadonlyCollection<string, Message>, reason: string) => {
        if (collected.size === 0) {
            await (message.channel as TextChannel).send('⏱️ Mod role setup timed out.');
            await showRoleSetup(message, setupMessage);
        }
    });
}

// Test configuration
async function testConfiguration(message: Message, setupMessage: Message): Promise<void> {
    const embed = new EmbedBuilder()
        .setTitle('✅ Configuration Test')
        .setDescription('Testing your current configuration...')
        .setColor('#28a745');
    
    await setupMessage.edit({
        embeds: [embed],
        components: []
    });
    
    // Test database connection
    let dbStatus = '❌ Not connected';
    try {
        // Simple test query
        const testQuery = database.getMessage('test');
        dbStatus = '✅ Connected';
    } catch (error) {
        console.error('Database test error:', error);
    }
    
    // Test tracked channel
    let channelStatus = '❌ Not set';
    try {
        if (config.trackedChannelId) {
            const channel = await message.guild?.channels.fetch(config.trackedChannelId);
            if (channel && channel instanceof TextChannel) {
                channelStatus = `✅ Found: <#${channel.id}>`;
            } else {
                channelStatus = '❌ Not found or not accessible';
            }
        }
    } catch (error) {
        console.error('Channel test error:', error);
    }
    
    // Test admin channel
    let adminChannelStatus = '❌ Not set';
    try {
        if (config.adminChannelId) {
            const channel = await message.guild?.channels.fetch(config.adminChannelId);
            if (channel && channel instanceof TextChannel) {
                adminChannelStatus = `✅ Found: <#${channel.id}>`;
            } else {
                adminChannelStatus = '❌ Not found or not accessible';
            }
        }
    } catch (error) {
        console.error('Admin channel test error:', error);
    }
    
    // Update embed with test results
    const resultsEmbed = new EmbedBuilder()
        .setTitle('✅ Configuration Test Results')
        .setDescription('Here are the results of your configuration test:')
        .setColor('#28a745')
        .addFields(
            { name: 'Database', value: dbStatus, inline: true },
            { name: 'Tracked Channel', value: channelStatus, inline: true },
            { name: 'Admin Channel', value: adminChannelStatus, inline: true },
            { name: 'Command Prefix', value: `\`${config.commandPrefix}\``, inline: true },
            { name: 'Admin Roles', value: config.permissions.adminRoleIds.length > 0 ? 
                config.permissions.adminRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true },
            { name: 'Mod Roles', value: config.permissions.modRoleIds.length > 0 ? 
                config.permissions.modRoleIds.map(id => `<@&${id}>`).join(', ') : 'None set', inline: true }
        )
        .setFooter({ text: 'Discord Engagement Tracker • Configuration Test' });
    
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('setup_back_to_main')
                .setLabel('Back to Main Menu')
                .setStyle(ButtonStyle.Secondary)
        );
    
    await setupMessage.edit({
        embeds: [resultsEmbed],
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
        await showSetupWelcome(message);
        collector.stop();
    });
    
    collector.on('end', async (collected, reason) => {
        if (reason === 'time' && collected.size === 0) {
            await showSetupWelcome(message);
        }
    });
}

// Helper function to update .env file
function updateEnvFile(key: string, value: string): void {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        
        // Check if .env file exists
        if (!fs.existsSync(envPath)) {
            // Create .env file from .env.example
            const examplePath = path.resolve(process.cwd(), '.env.example');
            if (fs.existsSync(examplePath)) {
                fs.copyFileSync(examplePath, envPath);
            } else {
                // Create empty .env file
                fs.writeFileSync(envPath, '');
            }
        }
        
        // Read current .env file
        let envContent = fs.readFileSync(envPath, 'utf8');
        
        // Check if key already exists
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            // Update existing key
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            // Add new key
            envContent += `\n${key}=${value}`;
        }
        
        // Write updated content back to .env file
        fs.writeFileSync(envPath, envContent);
        
        console.log(`Updated .env file: ${key}=${value}`);
    } catch (error) {
        console.error('Error updating .env file:', error);
    }
}

export default handleSetup;
