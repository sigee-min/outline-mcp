import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ToolContext } from "../context.js";
import { registerBatchTools } from "./batch-registrar.js";
import { registerCommentTools } from "./comments-registrar.js";
import { registerCoreTools } from "./core-registrar.js";
import { registerExportTools } from "./export-registrar.js";
import { registerLeaseTools } from "./lease-registrar.js";
import { registerLifecycleTools } from "./lifecycle-registrar.js";
import { registerMembershipTools } from "./membership-registrar.js";
import { registerOutlineResources } from "./resources-registrar.js";

export function registerAllTools(server: McpServer, context: ToolContext): void {
  registerCoreTools(server, context);
  registerCommentTools(server, context);
  registerLifecycleTools(server, context);
  registerBatchTools(server, context);
  registerLeaseTools(server, context);
  registerMembershipTools(server, context);
  registerExportTools(server, context);
  registerOutlineResources(server, context);
}
