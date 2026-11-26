import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageSquare,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  workspaceQueries,
  departmentWorkspaceQueries,
} from "./workspace-queries";
import {
  managementCapabilities,
  type ManagementRole,
} from "../../auth/policies";
import { dashboardMetrics } from "./workspace-data";
import { queryFoundation } from "@/lib/query-client";
import { PageHeader } from "@/components/layout/headers";
import { SummaryCard } from "@/components/shared/summary-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/states";
export function WorkspaceDashboard({
  role = "Admin",
}: {
  role?: ManagementRole;
}) {
  const policy = managementCapabilities(role);
  const repo = policy.directoryOnly
    ? departmentWorkspaceQueries
    : workspaceQueries;
  const users = useQuery(repo.complete("users"));
  const enrollments = useQuery(repo.complete("enrollments"));
  const inquiries = useQuery(repo.complete("inquiries"));
  const subjects = useQuery(repo.page("subjects", { page: 1, pageSize: 100 }));
  const grades = useQuery({
    ...repo.page("grades", { page: 1, pageSize: 100 }),
    enabled: !policy.directoryOnly,
  });
  const completeGrades = useQuery({
    ...repo.complete("grades"),
    enabled: policy.directoryOnly,
  });
  const gradeDataset = policy.directoryOnly ? completeGrades.data : grades.data;
  const gradeStates = { Midterm: 0, Final: 0 };
  for (const grade of completeGrades.data?.rows ?? [])
    gradeStates[grade.gradeType]++;
  const queries = [
    users,
    enrollments,
    inquiries,
    subjects,
    policy.directoryOnly ? completeGrades : grades,
  ];
  const busy = queries.some((query) => query.isFetching);
  const error = queries.find((query) => query.isError)?.error;
  const refresh = async () => {
    await queryFoundation.invalidateAfterMutation("users");
    await Promise.all(queries.map((query) => query.refetch()));
  };
  const data =
    !error &&
    users.data &&
    enrollments.data &&
    inquiries.data &&
    subjects.data &&
    gradeDataset
      ? dashboardMetrics(
          users.data,
          enrollments.data,
          inquiries.data,
          subjects.data.total,
          gradeDataset.total,
        )
      : null;
  return (
    <>
      <PageHeader
        title={policy.directoryOnly ? "Academic Dashboard" : "Dashboard"}
        description={
          policy.directoryOnly
            ? "Monitor academic records and departmental activities."
            : "Monitor and manage your academic workspace."
        }
        actions={
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => void refresh()}
          >
            <RefreshCw aria-hidden="true" />
            Refresh dashboard
          </Button>
        }
      />
      {error ? (
        <ErrorState
          description={error.message}
          onRetry={() => void refresh()}
        />
      ) : !data ? (
        <LoadingState label="Loading complete statistics. Large datasets may wait for the shared request budget…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Total Students", data.students, Users],
              ["Total Faculty", data.faculty, GraduationCap],
              ["Total Subjects", data.subjects, BookOpen],
              ["Total Enrollments", data.enrollments, ClipboardList],
              ["Total Recorded Grades", data.grades, GraduationCap],
              ["Pending Grade Inquiries", data.pending, MessageSquare],
            ].map(([label, value, Icon]) => {
              const MetricIcon = Icon as typeof Users;
              return (
                <SummaryCard
                  key={String(label)}
                  label={String(label)}
                  value={Number(value).toLocaleString()}
                  icon={<MetricIcon />}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {policy.directoryOnly
              ? "Student and Faculty totals count permitted directory entries. Account status is not exposed, so these are not active-account counts."
              : "Student and Faculty counts include Active and Inactive accounts."}{" "}
            Status distributions use complete datasets, not a single page.
          </p>
          <div className="grid gap-5 xl:grid-cols-2">
            <Distribution
              title="Enrollment overview"
              values={data.enrollmentStates}
            />
            <Distribution
              title="Inquiry status overview"
              values={data.inquiryStates}
            />
            {policy.directoryOnly && (
              <Distribution title="Grade type overview" values={gradeStates} />
            )}
          </div>
        </>
      )}
      <Card>
        <h2 className="mb-4 text-base">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(policy.directoryOnly
            ? [
                ["Add Subject", `${policy.basePath}/subjects?action=create`],
                [
                  "Create Enrollment",
                  `${policy.basePath}/enrollments?action=create`,
                ],
                [
                  "View Student & Faculty Directory",
                  `${policy.basePath}/directory`,
                ],
              ]
            : [
                ["Add Subject", "/admin/subjects?action=create"],
                ["Create Enrollment", "/admin/enrollments?action=create"],
                ["Add User", "/admin/users?action=create"],
                ["Review Grade Inquiries", "/admin/grade-inquiries"],
              ]
          ).map(([label, path]) => (
            <Link
              key={path}
              to={path}
              className="flex min-h-control items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm font-medium text-primary hover:bg-secondary"
            >
              {label}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}
function Distribution({
  title,
  values,
}: {
  title: string;
  values: Record<string, number>;
}) {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  return (
    <Card>
      <h2 className="text-base">{title}</h2>
      {total === 0 ? (
        <EmptyState
          title="No records yet"
          description="There are no status records to summarize."
        />
      ) : (
        <dl className="mt-5 space-y-4">
          {Object.entries(values).map(([status, count]) => (
            <div key={status}>
              <div className="mb-2 flex justify-between gap-3 text-sm">
                <dt>{status}</dt>
                <dd>
                  {count.toLocaleString()}{" "}
                  <span className="text-muted-foreground">
                    ({Math.round((count / total) * 100)}%)
                  </span>
                </dd>
              </div>
              <div className="h-2 rounded-full bg-secondary" aria-hidden="true">
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}
