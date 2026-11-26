import {
  QueryClient,
  queryOptions,
  mutationOptions,
} from "@tanstack/react-query";
import { apiClient, type ApiTransport } from "../api/client.ts";
import { ApiError } from "../api/errors.ts";
import { createServices } from "../api/services.ts";
import type { PageQuery, StudentQuery } from "../api/contracts.ts";
import type { AuthenticationAdapter } from "../auth/integration.ts";
import { createQueryKeys, type Resource } from "./query-keys.ts";

export function shouldRetryQuery(
  failureCount: number,
  error: unknown,
): boolean {
  return (
    failureCount < 1 &&
    error instanceof ApiError &&
    (error.kind === "network" ||
      (error.kind === "server" &&
        (error.status ?? 0) >= 500 &&
        (error.status ?? 0) <= 599))
  );
}
const affectedResources: Record<Resource, Resource[]> = {
  auth: ["auth"],
  subjects: ["subjects", "enrollments", "grades", "inquiries"],
  enrollments: ["enrollments", "grades", "inquiries", "users"],
  grades: ["grades", "inquiries"],
  inquiries: ["inquiries"],
  users: ["auth", "users", "subjects", "enrollments", "grades", "inquiries"],
};
export function createQueryFoundation(transport: ApiTransport = apiClient) {
  let sequence = 0;
  let scope = "anonymous:0";
  let authentication: AuthenticationAdapter | null = null;
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 300_000,
        retry: shouldRetryQuery,
        retryDelay: 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
      },
      mutations: { retry: false },
    },
  });
  const keys = createQueryKeys(() => scope);
  const services = createServices(transport);
  const scoped = <T>(
    queryKey: readonly unknown[],
    fetcher: (signal: AbortSignal) => Promise<T>,
  ) =>
    queryOptions({
      queryKey,
      enabled: () => Boolean(authentication?.getAccessToken()),
      queryFn: ({ signal }) => {
        if (queryKey[1] !== scope)
          throw new ApiError("cancelled", "Request cancelled.");
        return fetcher(signal);
      },
    });
  async function invalidateAfterMutation(
    resource: Resource,
    capturedScope = scope,
  ) {
    if (capturedScope !== scope) return;
    // Mark stale, without a refetch burst. Screens may explicitly refresh the
    // relevant visible query; stale queries refresh on their next mount.
    await Promise.all(
      affectedResources[resource].map((resource) =>
        client.invalidateQueries({
          queryKey: keys.resource(resource),
          refetchType: "none",
        }),
      ),
    );
  }
  async function configureSession(adapter: AuthenticationAdapter | null) {
    scope = `${adapter ? "session" : "anonymous"}:${++sequence}`;
    authentication = adapter;
    transport.configureAuthentication(adapter);
    await client.cancelQueries();
    client.clear();
  }
  return {
    client,
    keys,
    services,
    getScope: () => scope,
    configureSession,
    clearPrivateCache: () => configureSession(null),
    invalidateAfterMutation,
    mutation: <TData, TVariables>(
      resource: Resource,
      mutate: (variables: TVariables) => Promise<TData>,
    ) => {
      const capturedScope = scope;
      return mutationOptions({
        mutationKey: keys.resource(resource),
        retry: false,
        mutationFn: (variables: TVariables) => {
          if (capturedScope !== scope)
            throw new ApiError("cancelled", "Request cancelled.");
          return mutate(variables);
        },
        onSuccess: () => invalidateAfterMutation(resource, capturedScope),
      });
    },
    queries: {
      me: () => scoped(keys.me(), (signal) => services.auth.me({ signal })),
      subjects: (query: PageQuery = {}) =>
        scoped(keys.list("subjects", query), (signal) =>
          services.subjects.list(query, { signal }),
        ),
      subject: (id: number) =>
        scoped(keys.detail("subjects", id), (signal) =>
          services.subjects.get(id, { signal }),
        ),
      enrollments: (query: StudentQuery = {}) =>
        scoped(keys.list("enrollments", query), (signal) =>
          services.enrollments.list(query, { signal }),
        ),
      enrollment: (id: number) =>
        scoped(keys.detail("enrollments", id), (signal) =>
          services.enrollments.get(id, { signal }),
        ),
      grades: (query: StudentQuery = {}) =>
        scoped(keys.list("grades", query), (signal) =>
          services.grades.list(query, { signal }),
        ),
      inquiries: (query: StudentQuery = {}) =>
        scoped(keys.list("inquiries", query), (signal) =>
          services.inquiries.list(query, { signal }),
        ),
      users: (query: PageQuery = {}) =>
        scoped(keys.list("users", query), (signal) =>
          services.users.list(query, { signal }),
        ),
      user: (id: number) =>
        scoped(keys.detail("users", id), (signal) =>
          services.users.get(id, { signal }),
        ),
    },
  };
}
export const queryFoundation = createQueryFoundation();
