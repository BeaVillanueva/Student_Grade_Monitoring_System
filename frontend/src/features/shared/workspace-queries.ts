import { queryOptions } from "@tanstack/react-query";
import type {
  PageQuery,
  StudentQuery,
  Paginated,
} from "../../api/contracts.ts";
import {
  queryFoundation,
  type createQueryFoundation,
} from "../../lib/query-client.ts";
import { ApiError } from "../../api/errors.ts";
import {
  collectComplete,
  recordId,
  type WorkspaceRecords,
  type WorkspaceResource,
} from "./workspace-data.ts";
import { createReadBudget } from "./read-budget.ts";
export function createWorkspaceQueries(
  foundation: ReturnType<typeof createQueryFoundation>,
  budget = createReadBudget(),
  directoryOnly = false,
) {
  const read = <R extends WorkspaceResource>(
    resource: R,
    query: PageQuery | StudentQuery,
    signal: AbortSignal,
  ) =>
    (directoryOnly && resource === "users"
      ? foundation.services.directory.list(query, { signal })
      : foundation.services[resource].list(query, { signal })) as Promise<
      Paginated<WorkspaceRecords[R]>
    >;
  function page<R extends WorkspaceResource>(
    resource: R,
    query: PageQuery | StudentQuery = {},
  ) {
    const scope = foundation.getScope();
    return queryOptions({
      queryKey: foundation.keys.list(resource, query),
      queryFn: ({ signal }) =>
        budget.run(async () => {
          if (scope !== foundation.getScope())
            throw new ApiError("cancelled", "Request cancelled.");
          return read(resource, query, signal);
        }, signal),
    });
  }
  function complete<R extends WorkspaceResource>(resource: R) {
    return queryOptions({
      queryKey: [...foundation.keys.resource(resource), "complete"] as const,
      retry: false,
      queryFn: ({ signal }) =>
        collectComplete(
          async (number) => {
            const options = page(resource, { page: number, pageSize: 100 });
            return foundation.client.fetchQuery({
              ...options,
              queryFn: ({ signal: child }) =>
                budget.run(async () => {
                  if (options.queryKey[1] !== foundation.getScope())
                    throw new ApiError("cancelled", "Request cancelled.");
                  return read(
                    resource,
                    { page: number, pageSize: 100 },
                    // Canonical pages can be shared by multiple aggregate
                    // consumers. Only their own query/session cancellation
                    // may abort them; a remounted consumer must not inherit
                    // another aggregate's already-aborted parent signal.
                    child,
                  );
                }, child),
            });
          },
          recordId,
          signal,
        ),
    });
  }
  return { page, complete };
}
export const sharedReadBudget = createReadBudget();
export const workspaceQueries = createWorkspaceQueries(
  queryFoundation,
  sharedReadBudget,
);
export const departmentWorkspaceQueries = createWorkspaceQueries(
  queryFoundation,
  sharedReadBudget,
  true,
);
