type ToolHandler = (args: Record<string, unknown>) => unknown | Promise<unknown>;

type ToolRegistration = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  handler: ToolHandler;
};

type ResourceHandler = (
  uri: URL,
  variables: Record<string, string | string[]>,
  extra: Record<string, never>
) => unknown | Promise<unknown>;

type ResourceRegistration = {
  name: string;
  uriTemplate: string;
  metadata?: Record<string, unknown>;
  handler: ResourceHandler;
};

function toUriTemplate(uriOrTemplate: string | { uriTemplate?: { toString(): string } }): string {
  if (typeof uriOrTemplate === "string") {
    return uriOrTemplate;
  }

  if (uriOrTemplate && uriOrTemplate.uriTemplate) {
    return uriOrTemplate.uriTemplate.toString();
  }

  throw new Error("INVALID_RESOURCE_TEMPLATE");
}

export class FakeMcpServer {
  private readonly toolMap = new Map<string, ToolRegistration>();
  private readonly resourceMap = new Map<string, ResourceRegistration>();

  tool(
    name: string,
    descriptionOrCallback:
      | string
      | ToolHandler
      | Record<string, unknown>,
    inputSchemaOrCallback?: ToolHandler | Record<string, unknown>,
    callback?: ToolHandler
  ): Record<string, never> {
    let description: string | undefined;
    let inputSchema: Record<string, unknown> | undefined;
    let handler: ToolHandler | undefined;

    if (typeof descriptionOrCallback === "function") {
      handler = descriptionOrCallback;
    } else if (typeof inputSchemaOrCallback === "function") {
      description = typeof descriptionOrCallback === "string" ? descriptionOrCallback : undefined;
      handler = inputSchemaOrCallback;
    } else {
      description = typeof descriptionOrCallback === "string" ? descriptionOrCallback : undefined;
      inputSchema =
        typeof inputSchemaOrCallback === "object" && inputSchemaOrCallback !== null
          ? (inputSchemaOrCallback as Record<string, unknown>)
          : undefined;
      handler = callback;
    }

    if (!handler) {
      throw new Error(`Missing tool handler for ${name}`);
    }

    this.toolMap.set(name, {
      name,
      description,
      inputSchema,
      handler
    });

    return {};
  }

  registerResource(
    name: string,
    uriOrTemplate: string | { uriTemplate?: { toString(): string } },
    metadata: Record<string, unknown>,
    handler: ResourceHandler
  ): Record<string, never> {
    this.resourceMap.set(name, {
      name,
      uriTemplate: toUriTemplate(uriOrTemplate),
      metadata,
      handler
    });

    return {};
  }

  listToolNames(): string[] {
    return [...this.toolMap.keys()].sort();
  }

  listResourceTemplates(): string[] {
    return [...this.resourceMap.values()]
      .map((resource) => resource.uriTemplate)
      .sort();
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const tool = this.toolMap.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.handler(args);
  }

  async readResource(
    name: string,
    uri: string,
    variables: Record<string, string | string[]> = {}
  ): Promise<unknown> {
    const resource = this.resourceMap.get(name);
    if (!resource) {
      throw new Error(`Unknown resource: ${name}`);
    }
    return resource.handler(new URL(uri), variables, {});
  }
}
