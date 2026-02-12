import type { LeaseRecord } from "../../domain/lease.js";

export class LeaseConflictError extends Error {
  readonly existingLease: LeaseRecord;

  constructor(existingLease: LeaseRecord) {
    super("LEASE_CONFLICT: document is already leased by another agent");
    this.name = "LeaseConflictError";
    this.existingLease = existingLease;
  }
}

export class LeaseNotFoundError extends Error {
  constructor(message = "LEASE_NOT_FOUND: no active lease found") {
    super(message);
    this.name = "LeaseNotFoundError";
  }
}

export class LeaseValidationError extends Error {
  constructor(message: string) {
    super(`INVALID_INPUT: ${message}`);
    this.name = "LeaseValidationError";
  }
}
