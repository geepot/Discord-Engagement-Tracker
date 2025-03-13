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

/**
 * Common setup context shared between setup components
 */
export interface SetupContext {
    message: Message;
    setupMessage: Message;
    initiatorId?: string; // ID of the user who initiated the setup
}

/**
 * Function signature for setup component handlers
 */
export type SetupHandler = (context: SetupContext) => Promise<void>;
