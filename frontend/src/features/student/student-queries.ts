import { useQuery } from "@tanstack/react-query";
import { queryFoundation as foundation } from "../../lib/query-client";
import { workspaceQueries } from "../shared/workspace-queries";
import { useAuth } from "../../auth/auth-provider";
import { ApiError } from "../../api/errors";
import { studentRecords } from "./student-data";
export function useStudentRecords() {
  const auth = useAuth();
  const studentId = auth.user?.role === "Student" ? auth.user.userId : null;
  const query = useQuery({
    queryKey: [
      ...foundation.keys.resource("inquiries"),
      "student-workspace",
      studentId,
    ],
    enabled: studentId !== null,
    retry: false,
    queryFn: async ({ signal }) => {
      const scope = foundation.getScope();
      const [enrollments, subjects, grades, inquiries] = await Promise.all([
        foundation.client.fetchQuery(workspaceQueries.complete("enrollments")),
        foundation.client.fetchQuery(workspaceQueries.complete("subjects")),
        foundation.client.fetchQuery(workspaceQueries.complete("grades")),
        foundation.client.fetchQuery(workspaceQueries.complete("inquiries")),
      ]);
      if (
        signal.aborted ||
        scope !== foundation.getScope() ||
        studentId === null
      )
        throw new ApiError("cancelled", "Request cancelled.");
      return studentRecords(
        studentId,
        subjects.rows,
        enrollments.rows,
        grades.rows,
        inquiries.rows,
      );
    },
  });
  return {
    query,
    refresh: async () => {
      await foundation.invalidateAfterMutation("users");
      await query.refetch();
    },
  };
}
