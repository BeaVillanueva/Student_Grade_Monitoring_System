import { apiClient, type ApiTransport } from "./client.ts";
import type {
  CreateSubjectRequest,
  ReplaceSubjectRequest,
  PageQuery,
  RequestOptions,
  Subject,
  Paginated,
} from "./contracts.ts";
import {
  createSubjectSchema,
  replaceSubjectSchema,
  pageQuerySchema,
} from "../lib/validation.ts";
import { subjectResponseSchema, paginatedSchema } from "./response-schemas.ts";
import { execute, validated, recordPath } from "./service-utils.ts";
export function createSubjectsService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: PageQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<Subject>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/subjects",
          query: validated(pageQuerySchema, query),
          ...options,
        },
        paginatedSchema(subjectResponseSchema),
      ),
    get: (id: number, options: RequestOptions = {}): Promise<Subject> =>
      execute(
        transport,
        { method: "GET", path: recordPath("subjects", id), ...options },
        subjectResponseSchema,
      ),
    create: (
      input: CreateSubjectRequest,
      options: RequestOptions = {},
    ): Promise<Subject> =>
      execute(
        transport,
        {
          method: "POST",
          path: "/subjects",
          body: validated(createSubjectSchema, input),
          ...options,
        },
        subjectResponseSchema,
      ),
    replace: (
      id: number,
      input: ReplaceSubjectRequest,
      options: RequestOptions = {},
    ): Promise<Subject> =>
      execute(
        transport,
        {
          method: "PUT",
          path: recordPath("subjects", id),
          body: validated(replaceSubjectSchema, input),
          ...options,
        },
        subjectResponseSchema,
      ),
    remove: async (id: number, options: RequestOptions = {}): Promise<void> => {
      await transport.request<void>({
        method: "DELETE",
        path: recordPath("subjects", id),
        ...options,
      });
    },
  };
}
export const subjectsService = createSubjectsService();
