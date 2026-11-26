import axios, { type AxiosAdapter } from "axios";
import { API_BASE_URL } from "./config.ts";
import { ApiError, normalizeApiError } from "./errors.ts";
import type { AuthenticationAdapter } from "../auth/integration.ts";

export interface ApiRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, number | undefined>;
  body?: unknown;
  signal?: AbortSignal;
  access?: "public" | "protected";
}
export interface ApiTransport {
  request<T>(request: ApiRequest): Promise<T>;
  configureAuthentication(adapter: AuthenticationAdapter | null): void;
  cancelPending(): void;
}
/** Adapter injection is for isolated offline tests; application uses the fetch adapter. */
export function createApiClient(
  options: { adapter?: AxiosAdapter } = {},
): ApiTransport {
  const http = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15_000,
    adapter: options.adapter ?? "fetch",
    withCredentials: false,
    responseType: "json",
    fetchOptions: { redirect: "error", credentials: "omit" },
    transitional: { silentJSONParsing: false, clarifyTimeoutError: true },
    headers: { Accept: "application/json" },
  });
  let authentication: AuthenticationAdapter | null = null;
  let generation = 0;
  let controller = new AbortController();
  function cancelPending() {
    generation++;
    controller.abort();
    controller = new AbortController();
  }
  return {
    configureAuthentication(adapter) {
      cancelPending();
      authentication = adapter;
    },
    cancelPending,
    async request<T>({
      method,
      path,
      query,
      body,
      signal,
      access = "protected",
    }: ApiRequest): Promise<T> {
      const context = access === "public" ? "login" : "protected";
      // No schemes, authorities, backslashes, dot segments, encoding, query or hash
      // in paths. The Axios instance and base URL are never exposed to callers.
      if (
        !/^\/(?:auth\/(?:login|me)|(?:subjects|enrollments|grades|grade-inquiries|users)(?:\/[1-9]\d*)?)$/.test(
          path,
        ) ||
        (access === "public" &&
          !(method === "POST" && path === "/auth/login")) ||
        (path === "/auth/login" && access !== "public")
      ) {
        throw new ApiError(
          "configuration",
          "The API request is not permitted.",
          context,
        );
      }
      const revision = generation;
      const adapter = authentication;
      const combinedSignal = signal
        ? AbortSignal.any([signal, controller.signal])
        : controller.signal;
      try {
        if (combinedSignal.aborted)
          throw new ApiError("cancelled", "Request cancelled.", context);
        const token = access === "protected" ? adapter?.getAccessToken() : null;
        const response = await http.request<T>({
          method,
          url: path,
          params: query,
          data: body,
          signal: combinedSignal,
          headers: {
            Authorization: token ? `Bearer ${token}` : undefined,
            ...(body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          },
        });
        if (revision !== generation)
          throw new ApiError("cancelled", "Request cancelled.", context);
        if (response.status === 204) return undefined as T;
        if (typeof response.data !== "object" || response.data === null)
          throw new ApiError(
            "response",
            "The server returned an unexpected response.",
            context,
          );
        return response.data;
      } catch (error) {
        if (revision !== generation)
          throw new ApiError("cancelled", "Request cancelled.", context);
        const safe = normalizeApiError(error, context);
        if (safe.status === 401 && access === "protected") {
          try {
            await adapter?.onProtectedUnauthorized?.();
          } catch {
            /* Session hooks must never replace the safe API error. */
          }
        }
        throw safe;
      }
    },
  };
}
export const apiClient = createApiClient();
