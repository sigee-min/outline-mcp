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

  it("marks 5xx probe responses as unknown", async () => {
    const client = {
      probeEndpoint: async () => ({ status: 503 })
    };

    const capabilities = await probeServerCapabilities(client as never);

    expect(capabilities.comments.state).toBe("unknown");
    expect(capabilities.templatize.state).toBe("unknown");
  });

  it("preserves endpoint and status on probe result", async () => {
    const statuses: Record<string, number | null> = {
      "comments.list": 404,
      "revisions.info": 200,
      "documents.templatize": 400,
      "dataAttributes.list": null
    };
    const client = {
      probeEndpoint: async (endpoint: string) => ({ status: statuses[endpoint] ?? null })
    };

    const capabilities = await probeServerCapabilities(client as never);

    expect(capabilities.comments.endpoint).toBe("comments.list");
    expect(capabilities.comments.status).toBe(404);
    expect(capabilities.revisionInfo.endpoint).toBe("revisions.info");
    expect(capabilities.revisionInfo.status).toBe(200);
    expect(capabilities.templatize.endpoint).toBe("documents.templatize");
    expect(capabilities.templatize.status).toBe(400);
    expect(capabilities.dataAttributes.endpoint).toBe("dataAttributes.list");
    expect(capabilities.dataAttributes.status).toBeUndefined();
  });
});
