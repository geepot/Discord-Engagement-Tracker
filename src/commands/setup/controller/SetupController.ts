import { 
  Message, 
  TextChannel, 
  ButtonInteraction, 
  ModalSubmitInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageCreateOptions,
  InteractionEditReplyOptions,
  ChatInputCommandInteraction
} from 'discord.js';
import config from '../../../config';
import ConfigService from '../../../services/ConfigService';
import ServiceRegistry from '../../../services/ServiceRegistry';

/**
 * Setup page interface
 * Each page in the setup wizard implements this interface
 */
export interface SetupPage {
  render(controller: SetupController): Promise<MessageCreateOptions>;
  handleInteraction?(controller: SetupController, interaction: ButtonInteraction | ModalSubmitInteraction): Promise<void>;
}

/**
 * Setup state interface
 * Stores the current state of the setup wizard
 */
export interface SetupState {
  initiatorId: string;
  setupMessageId: string;
  currentPage: string;
  [key: string]: any; // Additional state properties
}

/**
 * Setup controller class
 * Manages the setup wizard flow and state
 */
export class SetupController {
  private state: SetupState;
  private pages: Map<string, SetupPage> = new Map();
  private interaction: ChatInputCommandInteraction;
  private channel: TextChannel;
  
  /**
   * Create a new setup controller
   * @param interaction The slash command interaction that initiated setup
   */
  constructor(interaction: ChatInputCommandInteraction) {
    console.log('Creating new SetupController instance');
    if (!(interaction.channel instanceof TextChannel)) {
      throw new Error('Setup can only be used in text channels');
    }
    
    this.interaction = interaction;
    this.channel = interaction.channel;
    
    // Initialize state
    this.state = {
      initiatorId: interaction.user.id,
      setupMessageId: '',
      currentPage: 'welcome'
    };
    
    // Register interaction handlers
    this.registerInteractionHandlers();
  }
  
  /**
   * Register a page in the setup wizard
   * @param pageId The page identifier
   * @param page The page component
   */
  public registerPage(pageId: string, page: SetupPage): void {
    console.log(`Registering setup page: ${pageId}`);
    this.pages.set(pageId, page);
  }
  
  /**
   * Start the setup wizard
   */
  public async start(): Promise<void> {
    try {
      console.log('Starting setup wizard');
      // Defer the reply to give us time to prepare the setup wizard
      await this.interaction.deferReply();
      
      // Send initial message that will be edited by the setup wizard
      const setupMessage = await this.interaction.editReply({
        content: 'Loading setup wizard...',
        embeds: [],
        components: []
      });
      
      // Store the setup message ID
      this.state.setupMessageId = setupMessage.id;
      console.log(`Setup message ID: ${setupMessage.id}`);
      
      // Navigate to the welcome page
      await this.navigateToPage('welcome');
    } catch (error) {
      console.error('Error starting setup wizard:', error);
      
      if (this.interaction.replied || this.interaction.deferred) {
        await this.interaction.editReply('An error occurred during setup. Please try again later.');
      } else {
        await this.interaction.reply({
          content: 'An error occurred during setup. Please try again later.',
          ephemeral: true
        });
      }
    }
  }
  
  /**
   * Navigate to a specific page in the setup wizard
   * @param pageId The page identifier
   */
  public async navigateToPage(pageId: string): Promise<void> {
    try {
      console.log(`Navigating to page: ${pageId}`);
      const page = this.pages.get(pageId);
      if (!page) {
        throw new Error(`Page not found: ${pageId}`);
      }
      
      // Update state
      this.state.currentPage = pageId;
      
      // Render the page
      const messageOptions = await page.render(this);
      
      // Update the setup message
      await this.updateSetupMessage(messageOptions);
    } catch (error) {
      console.error(`Error navigating to page ${pageId}:`, error);
      await this.handleError(`Failed to navigate to ${pageId} page`);
    }
  }
  
  /**
   * Update the setup message with new content
   * @param options The message options
   */
  private async updateSetupMessage(options: MessageCreateOptions): Promise<void> {
    try {
      // Convert MessageCreateOptions to InteractionEditReplyOptions
      const replyOptions: InteractionEditReplyOptions = {
        content: options.content,
        embeds: options.embeds,
        components: options.components
      };
      
      // Update the message
      await this.interaction.editReply(replyOptions);
      console.log('Setup message updated successfully');
    } catch (error) {
      console.error('Error updating setup message:', error);
      throw new Error('Failed to update setup message');
    }
  }
  
  /**
   * Register interaction handlers for the setup wizard
   */
  private registerInteractionHandlers(): void {
    try {
      console.log('Registering setup interaction handlers');
      // Register a prefix handler for setup buttons
      const interactionHandler = ServiceRegistry.getInteractionHandlerService();
      
      if (!interactionHandler) {
        console.error('Failed to get InteractionHandlerService - service not available');
        return;
      }
      
      console.log('Registering setup button prefix handler');
      interactionHandler.registerPrefixHandler('setup_', this.handleButtonInteraction.bind(this));
      console.log('Successfully registered setup button prefix handler');
      
      // Register modal prefix handler for setup modals
      console.log('Registering setup modal prefix handler');
      interactionHandler.registerModalPrefixHandler('setup_modal_', this.handleModalSubmission.bind(this));
      console.log('Successfully registered setup modal prefix handler');
    } catch (error) {
      console.error('Error registering interaction handlers:', error);
    }
  }
  
  /**
   * Handle button interactions
   * @param interaction The button interaction
   */
  private async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
    try {
      console.log(`Received button interaction: ${interaction.customId}`);
      // Verify the user is the one who initiated setup
      if (interaction.user.id !== this.state.initiatorId) {
        await interaction.reply({
          content: 'Only the person who initiated setup can use these buttons.',
          ephemeral: true
        });
        return;
      }
      
      // Get the current page
      const currentPage = this.pages.get(this.state.currentPage);
      if (!currentPage) {
        throw new Error(`Current page not found: ${this.state.currentPage}`);
      }
      
      // If the page has a custom interaction handler, use it
      if (currentPage.handleInteraction) {
        console.log(`Delegating button interaction to page handler: ${this.state.currentPage}`);
        await currentPage.handleInteraction(this, interaction);
        return;
      }
      
      // Default handling based on the button ID
      const buttonId = interaction.customId;
      console.log(`Processing button with ID: ${buttonId}`);
      
      // Handle navigation buttons
      if (buttonId === 'setup_back_to_main') {
        await interaction.deferUpdate();
        await this.navigateToPage('welcome');
      } else if (buttonId === 'setup_back') {
        await interaction.deferUpdate();
        await this.navigateToPage('welcome');
      } else if (buttonId.startsWith('setup_nav_')) {
        const targetPage = buttonId.replace('setup_nav_', '');
        console.log(`Navigation button clicked, target page: ${targetPage}`);
        await interaction.deferUpdate();
        await this.navigateToPage(targetPage);
      } else {
        // Unknown button, defer to the page
        await interaction.deferUpdate();
        console.warn(`Unknown button ID: ${buttonId}`);
      }
    } catch (error) {
      console.error('Error handling button interaction:', error);
      await this.handleError('An error occurred while processing your interaction');
    }
  }
  
  /**
   * Handle modal submissions
   * @param interaction The modal submission interaction
   */
  private async handleModalSubmission(interaction: ModalSubmitInteraction): Promise<void> {
    try {
      console.log(`Received modal submission: ${interaction.customId}`);
      // Verify the user is the one who initiated setup
      if (interaction.user.id !== this.state.initiatorId) {
        await interaction.reply({
          content: 'Only the person who initiated setup can use this modal.',
          ephemeral: true
        });
        return;
      }
      
      // Get the current page
      const currentPage = this.pages.get(this.state.currentPage);
      if (!currentPage) {
        throw new Error(`Current page not found: ${this.state.currentPage}`);
      }
      
      // If the page has a custom interaction handler, use it
      if (currentPage.handleInteraction) {
        console.log(`Delegating modal submission to page handler: ${this.state.currentPage}`);
        await currentPage.handleInteraction(this, interaction);
        return;
      }
      
      // Default handling - just acknowledge the submission
      await interaction.reply({
        content: 'Your submission was received, but no handler was found for this modal.',
        ephemeral: true
      });
    } catch (error) {
      console.error('Error handling modal submission:', error);
      await this.handleError('An error occurred while processing your submission');
    }
  }
  
  /**
   * Handle errors in the setup wizard
   * @param message The error message
   */
  private async handleError(message: string): Promise<void> {
    try {
      console.error(`Setup error: ${message}`);
      // Send an ephemeral error message
      await this.interaction.followUp({
        content: `❌ ${message}. Please try again or restart the setup command.`,
        ephemeral: true
      });
    } catch (error) {
      console.error('Error sending error message:', error);
    }
  }
  
  /**
   * Create a modal for user input
   * @param id The modal ID
   * @param title The modal title
   * @param inputs The input fields
   */
  public createModal(
    id: string,
    title: string,
    inputs: {
      id: string;
      label: string;
      style?: TextInputStyle;
      placeholder?: string;
      value?: string;
      required?: boolean;
      minLength?: number;
      maxLength?: number;
    }[]
  ): ModalBuilder {
    console.log(`Creating modal: ${id}`);
    const modal = new ModalBuilder()
      .setCustomId(`setup_modal_${id}`)
      .setTitle(title);
    
    // Add inputs to the modal
    for (const input of inputs) {
      const textInput = new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style || TextInputStyle.Short);
      
      if (input.placeholder) textInput.setPlaceholder(input.placeholder);
      if (input.value) textInput.setValue(input.value);
      if (input.required !== undefined) textInput.setRequired(input.required);
      if (input.minLength) textInput.setMinLength(input.minLength);
      if (input.maxLength) textInput.setMaxLength(input.maxLength);
      
      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(textInput);
      modal.addComponents(row);
    }
    
    return modal;
  }
  
  /**
   * Get the current state
   */
  public getState(): SetupState {
    return this.state;
  }
  
  /**
   * Update the state
   * @param updates The state updates
   */
  public updateState(updates: Partial<SetupState>): void {
    this.state = { ...this.state, ...updates };
    console.log('Setup state updated:', this.state);
  }
  
  /**
   * Get the channel
   */
  public getChannel(): TextChannel {
    return this.channel;
  }
  
  /**
   * Get the interaction
   */
  public getInteraction(): ChatInputCommandInteraction {
    return this.interaction;
  }
}

export default SetupController;
