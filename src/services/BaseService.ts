/**
 * Base service interface
 * All services should implement this interface
 */
export interface BaseService {
  /**
   * Initialize the service
   * This method is called when the service is registered with the container
   */
  initialize(): Promise<void>;

  /**
   * Shutdown the service
   * This method is called when the application is shutting down
   */
  shutdown(): Promise<void>;
}

/**
 * Abstract base service class
 * Services can extend this class to get basic functionality
 */
export abstract class AbstractBaseService implements BaseService {
  /**
   * Initialize the service
   * This method is called when the service is registered with the container
   */
  public async initialize(): Promise<void> {
    // Default implementation does nothing
  }

  /**
   * Shutdown the service
   * This method is called when the application is shutting down
   */
  public async shutdown(): Promise<void> {
    // Default implementation does nothing
  }
}
