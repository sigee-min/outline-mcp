export type CapabilityState = "available" | "unavailable" | "unknown";

export type CapabilityProbeResult = {
  endpoint: string;
  state: CapabilityState;
  status?: number;
};

export type ServerCapabilities = {
  comments: CapabilityProbeResult;
  revisionInfo: CapabilityProbeResult;
  templatize: CapabilityProbeResult;
  dataAttributes: CapabilityProbeResult;
};

export function shouldEnableCapability(capability: CapabilityProbeResult): boolean {
  return capability.state !== "unavailable";
}
