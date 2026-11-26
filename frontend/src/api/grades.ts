import { apiClient, type ApiTransport } from "./client.ts";
import type {
  CreateGradeRequest,
  UpdateGradeRequest,
  StudentQuery,
  RequestOptions,
  Grade,
  Paginated,
} from "./contracts.ts";
import {
  createGradeSchema,
  updateGradeSchema,
  studentQuerySchema,
} from "../lib/validation.ts";
import { gradeResponseSchema, paginatedSchema } from "./response-schemas.ts";
import { execute, validated, recordPath } from "./service-utils.ts";
export function createGradesService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: StudentQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<Grade>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/grades",
          query: validated(studentQuerySchema, query),
          ...options,
        },
        paginatedSchema(gradeResponseSchema),
      ),
    create: (
      input: CreateGradeRequest,
      options: RequestOptions = {},
    ): Promise<Grade> =>
      execute(
        transport,
        {
          method: "POST",
          path: "/grades",
          body: validated(createGradeSchema, input),
          ...options,
        },
        gradeResponseSchema,
      ),
    update: (
      id: number,
      input: UpdateGradeRequest,
      options: RequestOptions = {},
    ): Promise<Grade> =>
      execute(
        transport,
        {
          method: "PATCH",
          path: recordPath("grades", id),
          body: validated(updateGradeSchema, input),
          ...options,
        },
        gradeResponseSchema,
      ),
  };
}
export const gradesService = createGradesService();
