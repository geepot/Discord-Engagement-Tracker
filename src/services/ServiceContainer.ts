/**
 * Service container for dependency injection
 * This class manages all the services in the application
 */
export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();

  /**
   * Get the singleton instance of the service container
   */
  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * Register a service with the container
   * @param name The name of the service
   * @param service The service instance
   */
  public register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Get a service from the container
   * @param name The name of the service
   * @returns The service instance
   */
  public get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }
    return service as T;
  }

  /**
   * Check if a service exists in the container
   * @param name The name of the service
   * @returns True if the service exists, false otherwise
   */
  public has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Remove a service from the container
   * @param name The name of the service
   */
  public remove(name: string): void {
    this.services.delete(name);
  }

  /**
   * Clear all services from the container
   */
  public clear(): void {
    this.services.clear();
  }
}

export default ServiceContainer;
