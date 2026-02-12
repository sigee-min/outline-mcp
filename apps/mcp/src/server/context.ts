import type { AppConfig } from "../config.js";
import type { OutlineClient } from "../outline/client.js";
import type { LeaseService } from "../services/lease/lease-service.js";
import type { ServerCapabilities } from "./capabilities.js";

export type ToolContext = {
  config: AppConfig;
  client: OutlineClient;
  leaseService: LeaseService;
  capabilities: ServerCapabilities;
};
