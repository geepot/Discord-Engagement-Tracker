import config from '../config';
import ServiceRegistry from './ServiceRegistry';
import { AbstractBaseService } from './BaseService';

/**
 * Service for managing bot configuration
 * Provides a clean API for updating settings and ensures config is kept in sync
 */
export class ConfigService extends AbstractBaseService {
  /**
   * Initialize the service
   * This method is called when the service is registered with the container
   */
  public async initialize(): Promise<void> {
    // Load settings from database
    await this.loadSettingsFromDatabase();
    console.log('ConfigService initialized');
  }

  /**
   * Load settings from database
   */
  private async loadSettingsFromDatabase(): Promise<void> {
    try {
      const database = ServiceRegistry.getDatabaseService();
      const settings = database.getAllBotSettings();
      
      // Update specific config properties if needed
      if (settings.has('TRACKED_CHANNEL_ID')) {
        config.trackedChannelId = settings.get('TRACKED_CHANNEL_ID');
      }
      
      if (settings.has('ADMIN_CHANNEL_ID')) {
        config.adminChannelId = settings.get('ADMIN_CHANNEL_ID');
      }
      
      if (settings.has('ADMIN_ROLE_IDS')) {
        const roleIds = settings.get('ADMIN_ROLE_IDS');
        if (roleIds) {
          config.permissions.adminRoleIds = roleIds.split(',');
        }
      }
      
      if (settings.has('MOD_ROLE_IDS')) {
        const roleIds = settings.get('MOD_ROLE_IDS');
        if (roleIds) {
          config.permissions.modRoleIds = roleIds.split(',');
        }
      }
      
      console.log('Settings loaded from database');
    } catch (error) {
      console.error('Error loading settings from database:', error);
    }
  }

  /**
   * Update a configuration setting
   * @param key The setting key
   * @param value The setting value
   */
  public updateSetting(key: string, value: string): void {
    try {
      // Save to database
      const database = ServiceRegistry.getDatabaseService();
      database.saveBotSetting(key, value);
      
      // Update in-memory config
      switch (key) {
        case 'TRACKED_CHANNEL_ID':
          config.trackedChannelId = value;
          break;
        case 'ADMIN_CHANNEL_ID':
          config.adminChannelId = value;
          break;
        case 'ADMIN_ROLE_IDS':
          config.permissions.adminRoleIds = value ? value.split(',') : [];
          break;
        case 'MOD_ROLE_IDS':
          config.permissions.modRoleIds = value ? value.split(',') : [];
          break;
      }
      
      console.log(`Updated setting: ${key}=${value}`);
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      throw new Error(`Failed to update setting: ${key}`);
    }
  }

  /**
   * Get a configuration setting
   * @param key The setting key
   * @returns The setting value
   */
  public getSetting(key: string): string | null {
    const database = ServiceRegistry.getDatabaseService();
    return database.getBotSetting(key);
  }

  /**
   * Get all configuration settings
   * @returns Map of all settings
   */
  public getAllSettings(): Map<string, string> {
    const database = ServiceRegistry.getDatabaseService();
    return database.getAllBotSettings();
  }
}

export default ConfigService;
