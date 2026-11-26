import { apiClient, type ApiTransport } from "./client.ts";
import type {
  CreateEnrollmentRequest,
  ReplaceEnrollmentRequest,
  StudentQuery,
  RequestOptions,
  Enrollment,
  Paginated,
} from "./contracts.ts";
import {
  createEnrollmentSchema,
  replaceEnrollmentSchema,
  studentQuerySchema,
} from "../lib/validation.ts";
import {
  enrollmentResponseSchema,
  paginatedSchema,
} from "./response-schemas.ts";
import { execute, validated, recordPath } from "./service-utils.ts";
export function createEnrollmentsService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: StudentQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<Enrollment>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/enrollments",
          query: validated(studentQuerySchema, query),
          ...options,
        },
        paginatedSchema(enrollmentResponseSchema),
      ),
    get: (id: number, options: RequestOptions = {}): Promise<Enrollment> =>
      execute(
        transport,
        { method: "GET", path: recordPath("enrollments", id), ...options },
        enrollmentResponseSchema,
      ),
    create: (
      input: CreateEnrollmentRequest,
      options: RequestOptions = {},
    ): Promise<Enrollment> =>
      execute(
        transport,
        {
          method: "POST",
          path: "/enrollments",
          body: validated(createEnrollmentSchema, input),
          ...options,
        },
        enrollmentResponseSchema,
      ),
    replace: (
      id: number,
      input: ReplaceEnrollmentRequest,
      options: RequestOptions = {},
    ): Promise<Enrollment> =>
      execute(
        transport,
        {
          method: "PUT",
          path: recordPath("enrollments", id),
          body: validated(replaceEnrollmentSchema, input),
          ...options,
        },
        enrollmentResponseSchema,
      ),
    remove: async (id: number, options: RequestOptions = {}): Promise<void> => {
      await transport.request<void>({
        method: "DELETE",
        path: recordPath("enrollments", id),
        ...options,
      });
    },
  };
}
export const enrollmentsService = createEnrollmentsService();
