// This file is used to break circular dependencies between setup components
import { SetupContext } from './types';

// Forward declarations of setup handlers
export let showSetupWelcome: (context: SetupContext) => Promise<void>;
export let showChannelSetup: (context: SetupContext) => Promise<void>;
export let showAdminChannelSetup: (context: SetupContext) => Promise<void>;
export let showPrefixSetup: (context: SetupContext) => Promise<void>;
export let showRoleSetup: (context: SetupContext) => Promise<void>;
export let showAdminRoleSetup: (context: SetupContext) => Promise<void>;
export let showModRoleSetup: (context: SetupContext) => Promise<void>;
export let testConfiguration: (context: SetupContext) => Promise<void>;

// Set handlers from their respective modules
export function setShowSetupWelcome(handler: (context: SetupContext) => Promise<void>): void {
    showSetupWelcome = handler;
}

export function setShowChannelSetup(handler: (context: SetupContext) => Promise<void>): void {
    showChannelSetup = handler;
}

export function setShowAdminChannelSetup(handler: (context: SetupContext) => Promise<void>): void {
    showAdminChannelSetup = handler;
}

export function setShowPrefixSetup(handler: (context: SetupContext) => Promise<void>): void {
    showPrefixSetup = handler;
}

export function setShowRoleSetup(handler: (context: SetupContext) => Promise<void>): void {
    showRoleSetup = handler;
}

export function setShowAdminRoleSetup(handler: (context: SetupContext) => Promise<void>): void {
    showAdminRoleSetup = handler;
}

export function setShowModRoleSetup(handler: (context: SetupContext) => Promise<void>): void {
    showModRoleSetup = handler;
}

export function setTestConfiguration(handler: (context: SetupContext) => Promise<void>): void {
    testConfiguration = handler;
}
