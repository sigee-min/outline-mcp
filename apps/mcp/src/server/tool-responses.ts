import { OutlineApiError } from "../outline/client.js";
import {
  LeaseConflictError,
  LeaseNotFoundError,
  LeaseValidationError
} from "../services/lease/errors.js";

export function formatError(error: unknown): string {
  if (error instanceof OutlineApiError) {
    return `${error.code}: ${error.message}`;
  }

  if (error instanceof LeaseConflictError) {
    return JSON.stringify(
      {
        ok: false,
        error: "LEASE_CONFLICT",
        message: error.message,
        existingLease: error.existingLease
      },
      null,
      2
    );
  }

  if (error instanceof LeaseNotFoundError || error instanceof LeaseValidationError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

export function asJsonText(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function successResult(value: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: asJsonText(value) }]
  };
}

export function errorResult(error: unknown): {
  isError: true;
  content: Array<{ type: "text"; text: string }>;
} {
  return {
    isError: true,
    content: [{ type: "text", text: formatError(error) }]
  };
}
