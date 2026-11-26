import { apiClient, type ApiTransport } from "./client.ts";
import type {
  LoginRequest,
  LoginResponse,
  RequestOptions,
  SafeUser,
} from "./contracts.ts";
import { loginSchema } from "../lib/validation.ts";
import { loginResponseSchema, safeUserSchema } from "./response-schemas.ts";
import { execute, validated } from "./service-utils.ts";
import { ApiError } from "./errors.ts";
export function createAuthService(transport: ApiTransport = apiClient) {
  return {
    login: (
      input: LoginRequest,
      options: RequestOptions = {},
    ): Promise<LoginResponse> => {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success)
        throw new ApiError(
          "validation",
          "Invalid request. Check the entered values.",
          "login",
          400,
        );
      return execute(
        transport,
        {
          method: "POST",
          path: "/auth/login",
          body: validated(loginSchema, parsed.data),
          access: "public",
          ...options,
        },
        loginResponseSchema,
      );
    },
    me: (options: RequestOptions = {}): Promise<SafeUser> =>
      execute(
        transport,
        { method: "GET", path: "/auth/me", ...options },
        safeUserSchema,
      ),
  };
}
export const authService = createAuthService();
