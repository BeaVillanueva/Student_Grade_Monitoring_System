import { apiClient, type ApiTransport } from "./client.ts";
import type {
  CreateInquiryRequest,
  ResolveInquiryRequest,
  StudentQuery,
  RequestOptions,
  GradeInquiry,
  Paginated,
} from "./contracts.ts";
import {
  createInquirySchema,
  resolveInquirySchema,
  studentQuerySchema,
} from "../lib/validation.ts";
import { inquiryResponseSchema, paginatedSchema } from "./response-schemas.ts";
import { execute, validated, recordPath } from "./service-utils.ts";
export function createInquiriesService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: StudentQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<GradeInquiry>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/grade-inquiries",
          query: validated(studentQuerySchema, query),
          ...options,
        },
        paginatedSchema(inquiryResponseSchema),
      ),
    create: (
      input: CreateInquiryRequest,
      options: RequestOptions = {},
    ): Promise<GradeInquiry> =>
      execute(
        transport,
        {
          method: "POST",
          path: "/grade-inquiries",
          body: validated(createInquirySchema, input),
          ...options,
        },
        inquiryResponseSchema,
      ),
    resolve: (
      id: number,
      input: ResolveInquiryRequest,
      options: RequestOptions = {},
    ): Promise<GradeInquiry> =>
      execute(
        transport,
        {
          method: "PATCH",
          path: recordPath("grade-inquiries", id),
          body: validated(resolveInquirySchema, input),
          ...options,
        },
        inquiryResponseSchema,
      ),
  };
}
export const inquiriesService = createInquiriesService();
