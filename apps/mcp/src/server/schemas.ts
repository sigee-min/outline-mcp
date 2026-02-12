import { z } from "zod";

export const documentStatusEnum = z.enum(["draft", "archived", "published"]);
export const dateFilterEnum = z.enum(["day", "week", "month", "year"]);
export const directionEnum = z.enum(["ASC", "DESC"]);
export const permissionEnum = z.enum(["read", "read_write"]);
export const searchSortEnum = z.enum(["relevance", "createdAt", "updatedAt", "title"]);
export const editModeEnum = z.enum(["append", "prepend", "replace"]);

export const dataAttributesInputSchema = z
  .array(
    z.object({
      data_attribute_id: z.string().min(1),
      value: z.union([z.string(), z.number(), z.boolean()])
    })
  )
  .optional();
