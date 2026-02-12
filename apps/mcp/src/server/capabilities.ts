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

export type PublicCapabilityProbeResult = {
  endpoint: string;
  state: CapabilityState;
};

export type PublicServerCapabilities = {
  comments: PublicCapabilityProbeResult;
  revisionInfo: PublicCapabilityProbeResult;
  templatize: PublicCapabilityProbeResult;
  dataAttributes: PublicCapabilityProbeResult;
};

export function toPublicCapabilities(capabilities: ServerCapabilities): PublicServerCapabilities {
  return {
    comments: {
      endpoint: capabilities.comments.endpoint,
      state: capabilities.comments.state
    },
    revisionInfo: {
      endpoint: capabilities.revisionInfo.endpoint,
      state: capabilities.revisionInfo.state
    },
    templatize: {
      endpoint: capabilities.templatize.endpoint,
      state: capabilities.templatize.state
    },
    dataAttributes: {
      endpoint: capabilities.dataAttributes.endpoint,
      state: capabilities.dataAttributes.state
    }
  };
}

export function shouldEnableCapability(capability: CapabilityProbeResult): boolean {
  return capability.state !== "unavailable";
}
