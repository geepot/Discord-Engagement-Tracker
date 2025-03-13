"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSetting = updateSetting;
exports.updateEnvFile = updateEnvFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../../services/database"));
/**
 * Updates a bot setting in both the database and .env file
 * @param key The setting key
 * @param value The setting value
 */
function updateSetting(key, value) {
    try {
        // Save to database for immediate effect
        database_1.default.saveBotSetting(key, value);
        // Also update .env file for persistence across restarts
        updateEnvFile(key, value);
        console.log(`Updated setting: ${key}=${value}`);
    }
    catch (error) {
        console.error('Error updating setting:', error);
    }
}
/**
 * Updates a setting in the .env file for persistence across restarts
 * @param key The setting key
 * @param value The setting value
 */
function updateEnvFile(key, value) {
    try {
        const envPath = path_1.default.resolve(process.cwd(), '.env');
        // Check if .env file exists
        if (!fs_1.default.existsSync(envPath)) {
            // Create .env file from .env.example
            const examplePath = path_1.default.resolve(process.cwd(), '.env.example');
            if (fs_1.default.existsSync(examplePath)) {
                fs_1.default.copyFileSync(examplePath, envPath);
            }
            else {
                // Create empty .env file
                fs_1.default.writeFileSync(envPath, '');
            }
        }
        // Read current .env file
        let envContent = fs_1.default.readFileSync(envPath, 'utf8');
        // Check if key already exists
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            // Update existing key
            envContent = envContent.replace(regex, `${key}=${value}`);
        }
        else {
            // Add new key
            envContent += `\n${key}=${value}`;
        }
        // Write updated content back to .env file
        fs_1.default.writeFileSync(envPath, envContent);
        console.log(`Updated .env file: ${key}=${value}`);
    }
    catch (error) {
        console.error('Error updating .env file:', error);
    }
}
