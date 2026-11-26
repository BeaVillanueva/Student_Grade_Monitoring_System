import { z } from "zod";
import { apiClient, type ApiTransport } from "./client.ts";
import { directoryUserSchema, paginatedSchema } from "./response-schemas.ts";
import { pageQuerySchema } from "../lib/validation.ts";
import { execute, recordPath, validated } from "./service-utils.ts";
import type {
  DirectoryUser,
  PageQuery,
  Paginated,
  RequestOptions,
} from "./contracts.ts";
// Reject unexpected full profiles and forbidden account roles before caching.
export const limitedDirectorySchema = directoryUserSchema.extend({
  role: z.enum(["Student", "Faculty"]),
});
export function createDirectoryService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: PageQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<DirectoryUser>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/users",
          query: validated(pageQuerySchema, query),
          ...options,
        },
        paginatedSchema(limitedDirectorySchema),
      ),
    get: (id: number, options: RequestOptions = {}): Promise<DirectoryUser> =>
      execute(
        transport,
        { method: "GET", path: recordPath("users", id), ...options },
        limitedDirectorySchema,
      ),
  };
}
