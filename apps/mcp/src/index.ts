import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { loadConfig } from "./config.js";
import { OutlineClient } from "./outline/client.js";
import { shouldEnableCapability } from "./server/capabilities.js";
import type { ServerCapabilities } from "./server/capabilities.js";
import { registerAllTools } from "./server/registrars/index.js";
import { formatError } from "./server/tool-responses.js";
import { createDefaultCapabilities, probeServerCapabilities } from "./services/capabilities/probe.js";
import { createLeaseService } from "./services/lease/factory.js";

function logUnavailableCapabilities(capabilities: ServerCapabilities): void {
  const unavailable = Object.entries(capabilities).filter(([, value]) => value.state === "unavailable");
  if (unavailable.length === 0) {
    return;
  }

  const message = unavailable
    .map(([name, value]) => `${name}(${value.endpoint}, status=${value.status ?? "n/a"})`)
    .join(", ");
  process.stderr.write(`Capability probe disabled these features: ${message}\n`);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new OutlineClient(config);
  const capabilities = config.capabilityProbeEnabled
    ? await probeServerCapabilities(client)
    : createDefaultCapabilities();
  if (config.capabilityProbeEnabled) {
    logUnavailableCapabilities(capabilities);
  }
  if (config.lease.strategy === "data_attribute" && !shouldEnableCapability(capabilities.dataAttributes)) {
    process.stderr.write(
      "Lease backend fell back to memory because data attribute capability is unavailable\n"
    );
  }
  const leaseService = createLeaseService(config, client, capabilities);

  const server = new McpServer({
    name: "outline-mcp",
    version: "0.1.0"
  });

  registerAllTools(server, {
    config,
    client,
    leaseService,
    capabilities
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`Failed to start outline-mcp server: ${formatError(error)}\n`);
  process.exit(1);
});
