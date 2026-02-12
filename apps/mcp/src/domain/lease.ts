export type LeaseRecord = {
  documentId: string;
  agentId: string;
  leaseToken: string;
  reason?: string;
  acquiredAt: string;
  expiresAt: string;
  backend: "memory" | "data_attribute";
};

export type AcquireLeaseInput = {
  documentId: string;
  agentId: string;
  ttlSeconds: number;
  reason?: string;
};

export type RenewLeaseInput = {
  documentId: string;
  leaseToken: string;
  ttlSeconds: number;
};

export type ReleaseLeaseInput = {
  documentId: string;
  leaseToken: string;
};
