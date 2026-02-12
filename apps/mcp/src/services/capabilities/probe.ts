import type { OutlineClient } from "../../outline/client.js";
import type { CapabilityProbeResult, CapabilityState, ServerCapabilities } from "../../server/capabilities.js";

type ProbeTarget = {
  key: keyof ServerCapabilities;
  endpoint: string;
};

const probeTargets: ProbeTarget[] = [
  { key: "comments", endpoint: "comments.list" },
  { key: "revisionInfo", endpoint: "revisions.info" },
  { key: "templatize", endpoint: "documents.templatize" },
  { key: "dataAttributes", endpoint: "dataAttributes.list" }
];

function toCapabilityState(status: number | null): CapabilityState {
  if (status === null) {
    return "unknown";
  }

  if (status === 403 || status === 404) {
    return "unavailable";
  }

  if (status >= 200 && status < 300) {
    return "available";
  }

  if (status >= 400 && status < 500) {
    return "available";
  }

  return "unknown";
}

function makeResult(endpoint: string, status: number | null): CapabilityProbeResult {
  const state = toCapabilityState(status);
  return {
    endpoint,
    state,
    status: status ?? undefined
  };
}

export function createDefaultCapabilities(): ServerCapabilities {
  return {
    comments: { endpoint: "comments.list", state: "unknown" },
    revisionInfo: { endpoint: "revisions.info", state: "unknown" },
    templatize: { endpoint: "documents.templatize", state: "unknown" },
    dataAttributes: { endpoint: "dataAttributes.list", state: "unknown" }
  };
}

export async function probeServerCapabilities(client: OutlineClient): Promise<ServerCapabilities> {
  const results = await Promise.all(
    probeTargets.map(async (target) => {
      const probe = await client.probeEndpoint(target.endpoint, {});
      return [target.key, makeResult(target.endpoint, probe.status)] as const;
    })
  );

  const initial = createDefaultCapabilities();
  for (const [key, result] of results) {
    initial[key] = result;
  }

  return initial;
}
