import fs from 'fs';
import path from 'path';
import database from '../../services/database';

/**
 * Updates a bot setting in both the database and .env file
 * @param key The setting key
 * @param value The setting value
 */
export function updateSetting(key: string, value: string): void {
    try {
        // Save to database for immediate effect
        database.saveBotSetting(key, value);
        
        // Also update .env file for persistence across restarts
        updateEnvFile(key, value);
        
        console.log(`Updated setting: ${key}=${value}`);
    } catch (error) {
        console.error('Error updating setting:', error);
    }
}

/**
 * Updates a setting in the .env file for persistence across restarts
 * @param key The setting key
 * @param value The setting value
 */
export function updateEnvFile(key: string, value: string): void {
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
