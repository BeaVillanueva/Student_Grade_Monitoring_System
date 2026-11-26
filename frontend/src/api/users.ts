import { apiClient, type ApiTransport } from "./client.ts";
import type {
  CreateUserRequest,
  UpdateUserRequest,
  PageQuery,
  RequestOptions,
  UserResponse,
  SafeUser,
  Paginated,
} from "./contracts.ts";
import {
  createUserSchema,
  updateUserSchema,
  pageQuerySchema,
} from "../lib/validation.ts";
import {
  userResponseSchema,
  safeUserSchema,
  paginatedSchema,
} from "./response-schemas.ts";
import { execute, validated, recordPath } from "./service-utils.ts";
export function createUsersService(transport: ApiTransport = apiClient) {
  return {
    list: (
      query: PageQuery = {},
      options: RequestOptions = {},
    ): Promise<Paginated<UserResponse>> =>
      execute(
        transport,
        {
          method: "GET",
          path: "/users",
          query: validated(pageQuerySchema, query),
          ...options,
        },
        paginatedSchema(userResponseSchema),
      ),
    get: (id: number, options: RequestOptions = {}): Promise<UserResponse> =>
      execute(
        transport,
        { method: "GET", path: recordPath("users", id), ...options },
        userResponseSchema,
      ),
    create: (
      input: CreateUserRequest,
      options: RequestOptions = {},
    ): Promise<SafeUser> =>
      execute(
        transport,
        {
          method: "POST",
          path: "/users",
          body: validated(createUserSchema, input),
          ...options,
        },
        safeUserSchema,
      ),
    update: (
      id: number,
      input: UpdateUserRequest,
      options: RequestOptions = {},
    ): Promise<SafeUser> =>
      execute(
        transport,
        {
          method: "PATCH",
          path: recordPath("users", id),
          body: validated(updateUserSchema, input),
          ...options,
        },
        safeUserSchema,
      ),
  };
}
export const usersService = createUsersService();
