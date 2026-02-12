import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppConfig } from "../src/config.js";
import { OutlineApiError, OutlineClient } from "../src/outline/client.js";

function createClient(retryCount = 1): OutlineClient {
  const config: AppConfig = {
    apiKey: "test-api-key",
    baseUrl: "https://outline.example.com",
    allowedActions: new Set(["read", "write", "delete"]),
    requestTimeoutMs: 1000,
    retryCount,
    capabilityProbeEnabled: true,
    lease: {
      strategy: "memory",
      defaultTtlSeconds: 600,
      maxTtlSeconds: 7200
    }
  };

  return new OutlineClient(config);
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

describe("OutlineClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  function getFetchCall(index: number): [unknown, RequestInit | undefined] {
    const call = fetchMock.mock.calls[index];
    expect(call, `fetch call at index ${index} should exist`).toBeDefined();
    const [url, init] = call as [unknown, RequestInit | undefined];
    return [url, init];
  }

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to documents.list when documents.archived is unavailable", async () => {
    const client = createClient(0);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: false, error: "not found" }, 404))
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          data: [{ id: "doc-1", title: "Archived Doc" }],
          pagination: { offset: 0, limit: 25, total: 1 }
        })
      );

    const result = await client.listArchivedDocuments({ limit: 25, offset: 0 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [archivedUrl] = getFetchCall(0);
    const [fallbackUrl, fallbackInit] = getFetchCall(1);

    expect(String(archivedUrl)).toContain("/api/documents.archived");
    expect(String(fallbackUrl)).toContain("/api/documents.list");

    const fallbackBody = JSON.parse(String(fallbackInit?.body ?? "{}"));
    expect(fallbackBody).toMatchObject({
      statusFilter: ["archived"],
      limit: 25,
      offset: 0
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.id).toBe("doc-1");
  });

  it("uses documents.archived response directly when available", async () => {
    const client = createClient(0);

    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        ok: true,
        data: [{ id: "doc-archived", title: "Archived Direct" }]
      })
    );

    const result = await client.listArchivedDocuments();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [archivedUrl] = getFetchCall(0);
    expect(String(archivedUrl)).toContain("/api/documents.archived");
    expect(result.data[0]?.id).toBe("doc-archived");
  });

  it("does not fallback for archived lookup errors other than 400/404", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "forbidden" }, 403));

    await expect(client.listArchivedDocuments()).rejects.toMatchObject({
      status: 403,
      code: "UPSTREAM_ERROR"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("parses exported markdown when API returns string payload", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: "# Exported" }));

    await expect(client.exportDocument({ id: "doc-1" })).resolves.toBe("# Exported");
  });

  it("parses exported markdown when API returns object payload", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: { markdown: "# Object markdown" } }));

    await expect(client.exportDocument({ id: "doc-2" })).resolves.toBe("# Object markdown");
  });

  it("throws upstream error when exported markdown payload is invalid", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: { unknown: true } }));

    await expect(client.exportDocument({ id: "doc-3" })).rejects.toBeInstanceOf(OutlineApiError);
  });

  it("passes backlinkDocumentId to documents.list for backlink lookup", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, data: [] }));

    await client.listDocumentBacklinks({
      documentId: "doc-target",
      limit: 10,
      offset: 0
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body ?? "{}"));
    expect(body).toMatchObject({
      backlinkDocumentId: "doc-target",
      limit: 10,
      offset: 0
    });
  });

  it("returns empty answer payload when documents.answerQuestion returns no data", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }));

    const result = await client.askAiAboutDocuments({
      query: "What changed?"
    });

    expect(result.data).toEqual({});
  });

  it("retries once for retryable status and then succeeds", async () => {
    const client = createClient(1);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "busy" }, 503))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: [{ id: "c-1", name: "Main" }] }));

    const result = await client.listCollections({ limit: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data[0]?.id).toBe("c-1");
  });

  it("retries when response envelope is ok=false with retryable status and then succeeds", async () => {
    const client = createClient(1);

    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: false, status: 503, error: "busy" }, 200))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: [{ id: "c-2", name: "Fallback" }] }));

    const result = await client.listCollections({ limit: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.data[0]?.id).toBe("c-2");
  });

  it("throws rate-limited error on 429 responses", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "Too many requests" }, 429));

    await expect(client.listCollections({ limit: 1 })).rejects.toMatchObject({
      code: "RATE_LIMITED",
      status: 429
    });
  });

  it("throws invalid JSON response error when upstream returns non-JSON body", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(
      new Response("not-json", {
        status: 200,
        headers: {
          "Content-Type": "text/plain"
        }
      })
    );

    await expect(client.listCollections({ limit: 1 })).rejects.toMatchObject({
      code: "UPSTREAM_ERROR",
      status: 502
    });
  });

  it("returns redirect url and status for file operation downloads", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: "https://download.example.com/file.zip"
        }
      })
    );

    const redirect = await client.getFileOperationRedirectUrl({ id: "op-1" });

    expect(redirect).toEqual({
      url: "https://download.example.com/file.zip",
      status: 302
    });
  });

  it("throws rate-limited error from raw request for file operation downloads", async () => {
    const client = createClient(0);
    fetchMock.mockResolvedValueOnce(
      new Response(null, {
        status: 429
      })
    );

    await expect(client.getFileOperationRedirectUrl({ id: "op-2" })).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED"
    });
  });

  it("returns null status from probeEndpoint when network call fails", async () => {
    const client = createClient(0);
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(client.probeEndpoint("comments.list", {})).resolves.toEqual({
      status: null
    });
  });

  it("retries probeEndpoint on retryable status and returns final status", async () => {
    const client = createClient(1);
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 400 }));

    await expect(client.probeEndpoint("comments.list", {})).resolves.toEqual({
      status: 400
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
