import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type { ToolContext } from "../context.js";
import { assertAllowedAction } from "../permissions.js";
import { errorResult, successResult } from "../tool-responses.js";

export function registerLeaseTools(server: McpServer, context: ToolContext): void {
  const { leaseService, config } = context;

  server.tool(
    "acquire_document_lease",
    "Acquire an exclusive lease for multi-agent document coordination",
    {
      document_id: z.string().min(1),
      agent_id: z.string().min(1),
      ttl_seconds: z.number().int().positive().optional(),
      reason: z.string().optional()
    },
    async ({ document_id, agent_id, ttl_seconds, reason }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const lease = await leaseService.acquire({
          documentId: document_id,
          agentId: agent_id,
          ttlSeconds: ttl_seconds,
          reason
        });

        return successResult({
          ok: true,
          tool: "acquire_document_lease",
          lease
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "renew_document_lease",
    "Renew an existing lease using lease token",
    {
      document_id: z.string().min(1),
      lease_token: z.string().min(1),
      ttl_seconds: z.number().int().positive().optional()
    },
    async ({ document_id, lease_token, ttl_seconds }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const lease = await leaseService.renew({
          documentId: document_id,
          leaseToken: lease_token,
          ttlSeconds: ttl_seconds
        });

        return successResult({
          ok: true,
          tool: "renew_document_lease",
          lease
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "release_document_lease",
    "Release an existing lease",
    {
      document_id: z.string().min(1),
      lease_token: z.string().min(1)
    },
    async ({ document_id, lease_token }) => {
      try {
        assertAllowedAction(config.allowedActions, "write");

        const lease = await leaseService.release({
          documentId: document_id,
          leaseToken: lease_token
        });

        return successResult({
          ok: true,
          tool: "release_document_lease",
          lease
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    "get_active_document_lease",
    "Retrieve active lease metadata for a document",
    {
      document_id: z.string().min(1)
    },
    async ({ document_id }) => {
      try {
        assertAllowedAction(config.allowedActions, "read");

        const lease = await leaseService.getActive(document_id);

        return successResult({
          ok: true,
          tool: "get_active_document_lease",
          lease
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
