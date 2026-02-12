import type {
  AcquireLeaseInput,
  LeaseRecord,
  ReleaseLeaseInput,
  RenewLeaseInput
} from "../../domain/lease.js";

export interface LeaseStore {
  readonly backend: LeaseRecord["backend"];
  acquire(input: AcquireLeaseInput): Promise<LeaseRecord>;
  renew(input: RenewLeaseInput): Promise<LeaseRecord>;
  release(input: ReleaseLeaseInput): Promise<LeaseRecord>;
  getActive(documentId: string): Promise<LeaseRecord | null>;
}
