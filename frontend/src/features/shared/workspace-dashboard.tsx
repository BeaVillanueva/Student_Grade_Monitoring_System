import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  GraduationCap,
  MessageSquare,
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
import { useDashboardRefresh } from "./use-dashboard-refresh";
import {
  DistributionChart,
  DashboardActions,
  DashboardAction,
} from "@/components/shared/dashboard-visuals";
import { ErrorState, LoadingState } from "@/components/feedback/states";
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
  const subjects = useQuery(
    repo.page("subjects", { page: 1, pageSize: 100 }),
  );
  const grades = useQuery({
    ...repo.page("grades", { page: 1, pageSize: 100 }),
    enabled: !policy.directoryOnly,
  });
  const completeGrades = useQuery({
    ...repo.complete("grades"),
    enabled: policy.directoryOnly,
  });
  const gradeDataset = policy.directoryOnly
    ? completeGrades.data
    : grades.data;
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
  useDashboardRefresh(refresh, true, busy);
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
      />
      {error ? (
        <ErrorState
          description={error.message}
          onRetry={() => void refresh()}
        />
      ) : !data ? (
        <LoadingState label="Loading dashboard…" />
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
            ].map(([label, value, Icon], index) => {
              const MetricIcon = Icon as typeof Users;
              return (
                <SummaryCard
                  key={String(label)}
                  label={String(label)}
                  value={Number(value).toLocaleString()}
                  icon={<MetricIcon />}
                  tone={
                    (
                      [
                        "blue",
                        "violet",
                        "green",
                        "amber",
                        "teal",
                        "rose",
                      ] as const
                    )[index]
                  }
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {policy.directoryOnly
              ? "Student and faculty totals include all listed accounts."
              : "Student and faculty totals include active and inactive accounts."}
          </p>
          <div
            className={
              policy.directoryOnly
                ? "grid gap-5 xl:grid-cols-3"
                : "grid gap-5 xl:grid-cols-2"
            }
          >
            <DistributionChart
              title="Enrollment status"
              values={data.enrollmentStates}
            />
            <DistributionChart
              title="Inquiry status"
              values={data.inquiryStates}
            />
            {policy.directoryOnly && (
              <DistributionChart
                title="Grade type overview"
                values={gradeStates}
                variant="bars"
              />
            )}
          </div>
        </>
      )}
      <DashboardActions>
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
          <DashboardAction
            key={path}
            to={path}
            icon={
              label.includes("Subject") ? (
                <BookOpen />
              ) : label.includes("Enrollment") ? (
                <ClipboardList />
              ) : label.includes("User") || label.includes("Directory") ? (
                <Users />
              ) : (
                <MessageSquare />
              )
            }
          >
            {label}
          </DashboardAction>
        ))}
      </DashboardActions>
    </>
  );
}
