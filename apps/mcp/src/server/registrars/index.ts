import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { ToolContext } from "../context.js";
import { registerCommentTools } from "./comments-registrar.js";
import { registerCoreTools } from "./core-registrar.js";
import { registerExportTools } from "./export-registrar.js";
import { registerLeaseTools } from "./lease-registrar.js";
import { registerMembershipTools } from "./membership-registrar.js";

export function registerAllTools(server: McpServer, context: ToolContext): void {
  registerCoreTools(server, context);
  registerCommentTools(server, context);
  registerLeaseTools(server, context);
  registerMembershipTools(server, context);
  registerExportTools(server, context);
}
