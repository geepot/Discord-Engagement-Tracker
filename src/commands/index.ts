import { registerCommand } from '../utils/slashCommands';
import CommandController from './controller/CommandController';
import CheckEngagementCommand from './implementations/CheckEngagementCommand';
import ActivityRankingCommand from './implementations/ActivityRankingCommand';
import ScheduleReportCommand from './implementations/ScheduleReportCommand';
import SetupCommand from './implementations/SetupCommand';

/**
 * Register all commands with the CommandController and Discord API
 */
export function registerCommands(): void {
  // Create command instances
  const checkEngagementCommand = new CheckEngagementCommand();
  const activityRankingCommand = new ActivityRankingCommand();
  const scheduleReportCommand = new ScheduleReportCommand();
  const setupCommand = new SetupCommand();
  
  // Register with CommandController
  CommandController.registerCommand('check-engagement', checkEngagementCommand);
  CommandController.registerCommand('most-active', activityRankingCommand);
  CommandController.registerCommand('most-inactive', activityRankingCommand);
  CommandController.registerCommand('schedule-report', scheduleReportCommand);
  CommandController.registerCommand('setup', setupCommand);
  
  // Register command definitions with Discord API
  registerCommand({ data: CheckEngagementCommand.getDefinition() });
  registerCommand({ data: ActivityRankingCommand.getMostActiveDefinition() });
  registerCommand({ data: ActivityRankingCommand.getMostInactiveDefinition() });
  registerCommand({ data: ScheduleReportCommand.getDefinition() });
  registerCommand({ data: SetupCommand.getDefinition() });
  
  console.log('Commands registered with CommandController');
}

export default registerCommands;
