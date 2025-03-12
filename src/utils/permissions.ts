import { Message, PermissionsBitField } from 'discord.js';
import config from '../config';

/**
 * Checks if a user has permission to use a specific command
 * Permissions can be granted through Discord permissions or by having specific roles
 * 
 * @param message The Discord message containing the command
 * @param command The command name to check permissions for
 * @returns boolean indicating if the user has permission
 */
export function hasCommandPermission(message: Message, command: string): boolean {
    // If no member (e.g., DM), deny permission
    if (!message.member) return false;
    
    // Check if command requires admin permissions
    if (config.permissions.adminCommands.includes(command)) {
        // Check for Administrator permission
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return true;
        }
        
        // Check for admin roles
        if (config.permissions.adminRoleIds.length > 0) {
            return message.member.roles.cache.some(role => 
                config.permissions.adminRoleIds.includes(role.id)
            );
        }
        
        // No admin permission or roles
        return false;
    }
    
    // Check if command requires mod permissions
    if (config.permissions.modCommands.includes(command)) {
        // Check for Manage Messages permission
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return true;
        }
        
        // Check for mod roles
        if (config.permissions.modRoleIds.length > 0) {
            return message.member.roles.cache.some(role => 
                config.permissions.modRoleIds.includes(role.id)
            );
        }
        
        // Also allow if user has admin roles (admins can do mod tasks)
        if (config.permissions.adminRoleIds.length > 0) {
            return message.member.roles.cache.some(role => 
                config.permissions.adminRoleIds.includes(role.id)
            );
        }
        
        // No mod permission or roles
        return false;
    }
    
    // If command doesn't require special permissions, allow it
    return true;
}

/**
 * Gets the command name from a message
 * 
 * @param message The Discord message
 * @param prefix The command prefix to use
 * @returns The command name without the prefix
 */
export function getCommandName(message: Message, prefix: string): string {
    return message.content.split(' ')[0].slice(prefix.length);
}
