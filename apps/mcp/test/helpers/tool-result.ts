export type ToolCallResult = {
  isError?: boolean;
  content?: Array<{ type: string; text?: string }>;
};

export function getToolResultText(result: unknown): string {
  const typed = result as ToolCallResult;
  return String(typed.content?.[0]?.text ?? "");
}

export function parseToolResultJson<T = Record<string, unknown>>(result: unknown): T {
  return JSON.parse(getToolResultText(result)) as T;
}
