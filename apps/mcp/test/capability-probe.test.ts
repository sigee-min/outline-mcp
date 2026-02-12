import { describe, expect, it } from "vitest";

import { probeServerCapabilities } from "../src/services/capabilities/probe.js";

describe("probeServerCapabilities", () => {
  it("marks 403/404 responses as unavailable", async () => {
    const statuses: Record<string, number> = {
      "comments.list": 404,
      "revisions.info": 403,
      "documents.templatize": 400,
      "dataAttributes.list": 400
    };

    const client = {
      probeEndpoint: async (endpoint: string) => ({
        status: statuses[endpoint] ?? null
      })
    };

    const capabilities = await probeServerCapabilities(client as never);

    expect(capabilities.comments.state).toBe("unavailable");
    expect(capabilities.revisionInfo.state).toBe("unavailable");
    expect(capabilities.templatize.state).toBe("available");
  });

  it("marks 4xx validation responses as available", async () => {
    const client = {
      probeEndpoint: async () => ({ status: 400 })
    };

    const capabilities = await probeServerCapabilities(client as never);

    expect(capabilities.comments.state).toBe("available");
    expect(capabilities.revisionInfo.state).toBe("available");
    expect(capabilities.templatize.state).toBe("available");
    expect(capabilities.dataAttributes.state).toBe("available");
  });

  it("marks unreachable probes as unknown", async () => {
    const client = {
      probeEndpoint: async () => ({ status: null })
    };

    const capabilities = await probeServerCapabilities(client as never);

    expect(capabilities.comments.state).toBe("unknown");
    expect(capabilities.revisionInfo.state).toBe("unknown");
  });
});
