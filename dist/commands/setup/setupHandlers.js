"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConfiguration = exports.showModRoleSetup = exports.showAdminRoleSetup = exports.showRoleSetup = exports.showPrefixSetup = exports.showAdminChannelSetup = exports.showChannelSetup = exports.showSetupWelcome = void 0;
exports.setShowSetupWelcome = setShowSetupWelcome;
exports.setShowChannelSetup = setShowChannelSetup;
exports.setShowAdminChannelSetup = setShowAdminChannelSetup;
exports.setShowPrefixSetup = setShowPrefixSetup;
exports.setShowRoleSetup = setShowRoleSetup;
exports.setShowAdminRoleSetup = setShowAdminRoleSetup;
exports.setShowModRoleSetup = setShowModRoleSetup;
exports.setTestConfiguration = setTestConfiguration;
// Set handlers from their respective modules
function setShowSetupWelcome(handler) {
    exports.showSetupWelcome = handler;
}
function setShowChannelSetup(handler) {
    exports.showChannelSetup = handler;
}
function setShowAdminChannelSetup(handler) {
    exports.showAdminChannelSetup = handler;
}
function setShowPrefixSetup(handler) {
    exports.showPrefixSetup = handler;
}
function setShowRoleSetup(handler) {
    exports.showRoleSetup = handler;
}
function setShowAdminRoleSetup(handler) {
    exports.showAdminRoleSetup = handler;
}
function setShowModRoleSetup(handler) {
    exports.showModRoleSetup = handler;
}
function setTestConfiguration(handler) {
    exports.testConfiguration = handler;
}
