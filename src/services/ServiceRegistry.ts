import ServiceContainer from './ServiceContainer';
import ConfigService from './ConfigService';
import DatabaseService from './DatabaseService';
import MessageTrackerService from './MessageTrackerService';
import EngagementStatsService from './EngagementStatsService';
import ReportSchedulerService from './ReportSchedulerService';
import InteractionHandlerService from './InteractionHandlerService';
import { BaseService } from './BaseService';

/**
 * Service registry
 * This class manages the registration of services with the container
 */
export class ServiceRegistry {
  private static container = ServiceContainer.getInstance();
  private static initialized = false;

  /**
   * Initialize all services
   */
  public static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Register services
    this.registerService('config', new ConfigService());
    this.registerService('database', new DatabaseService());
    this.registerService('messageTracker', new MessageTrackerService());
    this.registerService('engagementStats', new EngagementStatsService());
    this.registerService('reportScheduler', new ReportSchedulerService());
    this.registerService('interactionHandler', new InteractionHandlerService());

    // Initialize all services
    await this.initializeServices();

    this.initialized = true;
    console.log('Service registry initialized');
  }

  /**
   * Register a service with the container
   * @param name The name of the service
   * @param service The service instance
   */
  public static registerService<T extends BaseService>(name: string, service: T): void {
    this.container.register(name, service);
  }

  /**
   * Get a service from the container
   * @param name The name of the service
   * @returns The service instance
   */
  public static getService<T>(name: string): T {
    return this.container.get<T>(name);
  }

  /**
   * Initialize all registered services
   */
  private static async initializeServices(): Promise<void> {
    const services = this.getAllServices();
    for (const service of services) {
      await service.initialize();
    }
  }

  /**
   * Shutdown all registered services
   * Services are shut down in reverse order of registration
   * to ensure dependencies are available during shutdown
   */
  public static async shutdown(): Promise<void> {
    const services = this.getAllServices();
    // Reverse the order to shut down in reverse order of registration
    // This ensures that the database service is shut down last
    for (let i = services.length - 1; i >= 0; i--) {
      await services[i].shutdown();
    }
  }

  /**
   * Get all registered services
   * @returns Array of all services
   */
  private static getAllServices(): BaseService[] {
    const services: BaseService[] = [];
    const serviceNames = ['config', 'database', 'messageTracker', 'engagementStats', 'reportScheduler', 'interactionHandler'];
    
    for (const name of serviceNames) {
      if (this.container.has(name)) {
        services.push(this.container.get<BaseService>(name));
      }
    }
    
    return services;
  }

  /**
   * Get the config service
   * @returns The config service
   */
  public static getConfigService(): ConfigService {
    return this.getService<ConfigService>('config');
  }

  /**
   * Get the database service
   * @returns The database service
   */
  public static getDatabaseService(): DatabaseService {
    return this.getService<DatabaseService>('database');
  }

  /**
   * Get the message tracker service
   * @returns The message tracker service
   */
  public static getMessageTrackerService(): MessageTrackerService {
    return this.getService<MessageTrackerService>('messageTracker');
  }

  /**
   * Get the engagement stats service
   * @returns The engagement stats service
   */
  public static getEngagementStatsService(): EngagementStatsService {
    return this.getService<EngagementStatsService>('engagementStats');
  }

  /**
   * Get the report scheduler service
   * @returns The report scheduler service
   */
  public static getReportSchedulerService(): ReportSchedulerService {
    return this.getService<ReportSchedulerService>('reportScheduler');
  }

  /**
   * Get the interaction handler service
   * @returns The interaction handler service
   */
  public static getInteractionHandlerService(): InteractionHandlerService {
    return this.getService<InteractionHandlerService>('interactionHandler');
  }
}

export default ServiceRegistry;
