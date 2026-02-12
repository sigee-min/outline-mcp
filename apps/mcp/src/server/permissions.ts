import type { AllowedAction } from "../config.js";

export function assertAllowedAction(allowedActions: Set<AllowedAction>, action: AllowedAction): void {
  if (!allowedActions.has(action)) {
    throw new Error(`PERMISSION_DENIED: action \"${action}\" is not enabled`);
  }
}
