import { queryOptions, useQuery, useQueries } from "@tanstack/react-query";
import { queryFoundation as foundation } from "../../lib/query-client";
import {
  workspaceQueries,
  sharedReadBudget,
} from "../shared/workspace-queries";
import { facultyRecords, facultyStudent } from "./faculty-data";
import { ApiError } from "../../api/errors";
import { useAuth } from "../../auth/auth-provider";
export function useFacultyRecords() {
  const auth = useAuth();
  const facultyId = auth.user?.role === "Faculty" ? auth.user.userId : null;
  const query = useQuery(
    queryOptions({
      queryKey: [
        ...foundation.keys.resource("subjects"),
        "faculty-workspace",
        facultyId,
      ],
      enabled: facultyId !== null,
      retry: false,
      queryFn: async ({ signal }) => {
        const scope = foundation.getScope();
        const [subjects, enrollments, grades, inquiries] = await Promise.all([
          foundation.client.fetchQuery(workspaceQueries.complete("subjects")),
          foundation.client.fetchQuery(
            workspaceQueries.complete("enrollments"),
          ),
          foundation.client.fetchQuery(workspaceQueries.complete("grades")),
          foundation.client.fetchQuery(workspaceQueries.complete("inquiries")),
        ]);
        if (
          signal.aborted ||
          scope !== foundation.getScope() ||
          facultyId === null
        )
          throw new ApiError("cancelled", "Request cancelled.");
        return facultyRecords(
          facultyId,
          subjects.rows,
          enrollments.rows,
          grades.rows,
          inquiries.rows,
        );
      },
    }),
  );
  const data = query.data;
  const ids = [...new Set(data?.enrollments.map((row) => row.studentId) ?? [])];
  const names = useQueries({
    queries: ids.map((id) => ({
      queryKey: [...foundation.keys.resource("users"), "faculty-student", id],
      retry: false,
      queryFn: ({ signal }: { signal: AbortSignal }) => {
        const scope = foundation.getScope();
        return sharedReadBudget.run(async () => {
          if (scope !== foundation.getScope() || !data)
            throw new ApiError("cancelled", "Request cancelled.");
          return facultyStudent(
            await foundation.services.directory.get(id, { signal }),
            id,
            data,
          );
        }, signal);
      },
    })),
  });
  return {
    query,
    students: new Map(
      names.flatMap((row, index) =>
        row.data ? [[ids[index], row.data] as const] : [],
      ),
    ),
    namesPending: names.some((row) => row.isPending),
    namesFailed: names.some((row) => row.isError),
    refresh: async () => {
      await foundation.invalidateAfterMutation("users");
      await Promise.all([
        query.refetch(),
        ...names.map((row) => row.refetch()),
      ]);
    },
  };
}
