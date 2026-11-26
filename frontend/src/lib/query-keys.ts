import type { PageQuery, StudentQuery } from "../api/contracts.ts";
import { pageQuerySchema, studentQuerySchema } from "./validation.ts";
export type Resource =
  "auth" | "subjects" | "enrollments" | "grades" | "inquiries" | "users";
export function createQueryKeys(getScope: () => string) {
  return {
    root: () => ["sgms", getScope()] as const,
    resource: (resource: Resource) => ["sgms", getScope(), resource] as const,
    me: () => ["sgms", getScope(), "auth", "me"] as const,
    list: (
      resource: Exclude<Resource, "auth">,
      query: PageQuery | StudentQuery = {},
    ) =>
      [
        "sgms",
        getScope(),
        resource,
        "list",
        (["enrollments", "grades", "inquiries"].includes(resource)
          ? studentQuerySchema
          : pageQuerySchema
        ).parse(query),
      ] as const,
    detail: (resource: "subjects" | "enrollments" | "users", id: number) =>
      ["sgms", getScope(), resource, "detail", id] as const,
  };
}
