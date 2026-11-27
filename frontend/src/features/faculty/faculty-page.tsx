import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { BookOpen, Users, GraduationCap, MessageSquare } from "lucide-react";
import type { NavigationKey } from "@/app/navigation";
import type {
  Grade,
  GradeInquiry,
  CreateGradeRequest,
  UpdateGradeRequest,
} from "@/api/contracts";
import { queryFoundation as foundation } from "@/lib/query-client";
import { ApiError, normalizeApiError } from "@/api/errors";
import { useAuth } from "@/auth/auth-provider";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { Card, Alert } from "@/components/ui/display";
import { Select } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import {
  DistributionChart,
  DashboardActions,
  DashboardAction,
  dashboardCardClass,
} from "@/components/shared/dashboard-visuals";
import { SummaryCard } from "@/components/shared/summary-card";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/filters";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/feedback/states";
import { EntityForm } from "../shared/entity-form";
import {
  presentRecord,
  userLabel,
  subjectLabel,
  timestamp,
  type ReferenceMaps,
} from "../shared/record-presentation";
import { resolveInquirySchema } from "@/lib/validation";
import { useFacultyRecords } from "./faculty-queries";
import { useDashboardRefresh } from "../shared/use-dashboard-refresh";
import {
  facultyMetrics,
  gradeForm,
  assertFacultyMutation,
} from "./faculty-data";

type Page = "dashboard" | "subjects" | "students" | "grades" | "inquiries";
const titles: Record<Page, string> = {
  dashboard: "Faculty Dashboard",
  subjects: "My Subjects",
  students: "My Students",
  grades: "Grade Management",
  inquiries: "Grade Inquiries",
};
export default function FacultyPage({ page }: { page: NavigationKey }) {
  return <FacultyWorkspace key={page} page={page as Page} />;
}
function FacultyWorkspace({ page }: { page: Page }) {
  const { query, students, namesPending, namesFailed, refresh } =
    useFacultyRecords();
  const auth = useAuth(),
    notify = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [subjectId, setSubjectId] = useState(""),
    [gradeType, setGradeType] = useState("");
  const [currentPage, setCurrentPage] = useState(1),
    [pageSize, setPageSize] = useState(10);
  const [editor, setEditor] = useState<{ grade: Grade | null } | null>(null),
    [encodeSubject, setEncodeSubject] = useState("");
  const [resolution, setResolution] = useState<GradeInquiry | null>(null),
    [detail, setDetail] = useState<Record<string, string> | null>(null);
  const work = useRef<(() => Promise<unknown>) | null>(null);
  const mutation = useMutation({
    ...foundation.mutation("grades", async () => {
      if (!work.current)
        throw new ApiError("cancelled", "Request cancelled.");
      return work.current();
    }),
    gcTime: 0,
  });
  useDashboardRefresh(
    refresh,
    true,
    query.isFetching ||
      mutation.isPending ||
      namesPending ||
      Boolean(editor) ||
      Boolean(resolution) ||
      Boolean(detail),
  );
  const data = query.data;
  const refs: ReferenceMaps = {
    users: new Map(students),
    subjects: new Map(
      data?.subjects.map((row) => [row.subjectId, row]) ?? [],
    ),
    enrollments: new Map(
      data?.enrollments.map((row) => [row.enrollmentId, row]) ?? [],
    ),
    grades: new Map(data?.grades.map((row) => [row.gradeId, row]) ?? []),
  };
  if (auth.user) refs.users.set(auth.user.userId, auth.user);
  async function save(
    operation: "create" | "update" | "resolve",
    id: number | null,
    values: Record<string, unknown>,
  ) {
    if (!data || work.current || auth.user?.role !== "Faculty")
      throw new ApiError(
        "forbidden",
        "This action is unavailable.",
        "protected",
        403,
      );
    const input = assertFacultyMutation(data, operation, id, values);
    const scope = foundation.getScope();
    work.current = () =>
      operation === "create"
        ? foundation.services.grades.create(input as CreateGradeRequest)
        : operation === "update"
          ? foundation.services.grades.update(
              id!,
              input as UpdateGradeRequest,
            )
          : foundation.services.inquiries.resolve(
              id!,
              input as { resolutionNote: string },
            );
    try {
      await mutation.mutateAsync(undefined);
      if (scope !== foundation.getScope()) return;
      await foundation.invalidateAfterMutation(
        operation === "resolve" ? "inquiries" : "grades",
      );
      setEditor(null);
      setResolution(null);
      notify({
        title: operation === "resolve" ? "Inquiry resolved." : "Grade saved.",
        tone: "success",
      });
      await query.refetch();
    } catch (error) {
      const safe = normalizeApiError(error, "protected");
      if (safe.kind !== "cancelled")
        notify({
          title: "Operation not completed",
          description: safe.message,
          tone: "danger",
        });
      throw safe;
    } finally {
      work.current = null;
    }
  }
  const eligible =
    data?.enrollments.filter((row) => row.status === "Enrolled") ?? [];
  function openCreate() {
    setEncodeSubject(
      String(
        data?.subjects.find((subject) =>
          eligible.some((row) => row.subjectId === subject.subjectId),
        )?.subjectId ?? "",
      ),
    );
    setEditor({ grade: null });
  }
  // An action URL may open the same permitted form, never a mutation by itself.
  const createRequested =
    page === "grades" && params.get("action") === "create";
  const consumeCreate = () => {
    openCreate();
    setParams(
      (current) => {
        current.delete("action");
        return current;
      },
      { replace: true },
    );
  };
  const form =
    editor && data
      ? gradeForm(data, Number(encodeSubject), editor.grade)
      : null;
  if (form && !editor?.grade)
    form.fields[0].options = form.fields[0].options?.map((option) => {
      const enrollment = data?.enrollments.find(
        (row) => row.enrollmentId === option.value,
      );
      return {
        ...option,
        label: enrollment
          ? `${userLabel(enrollment.studentId, refs)} (#${enrollment.studentId}) · Enrollment #${enrollment.enrollmentId} · ${enrollment.semester} · ${enrollment.schoolYear}`
          : option.label,
      };
    });
  const metrics = data ? facultyMetrics(data) : null;
  const filter = (value: string) =>
    value.toLowerCase().includes(search.toLowerCase());
  const subjectRows = (data?.subjects ?? []).filter((row) =>
    filter(`${row.subjectCode} ${row.subjectName} ${row.units}`),
  );
  const enrollmentRows = (data?.enrollments ?? []).filter(
    (row) =>
      (!subjectId || row.subjectId === Number(subjectId)) &&
      filter(
        `${row.studentId} ${userLabel(row.studentId, refs)} ${subjectLabel(row.subjectId, refs)} ${row.semester} ${row.schoolYear} ${row.status}`,
      ) &&
      (page !== "grades" ||
        !gradeType ||
        data?.grades.some(
          (grade) =>
            grade.enrollmentId === row.enrollmentId &&
            grade.gradeType === gradeType,
        )),
  );
  const inquiryRows = (data?.inquiries ?? []).filter((row) => {
    const enrollment = refs.enrollments.get(
      refs.grades.get(row.gradeId)?.enrollmentId ?? -1,
    );
    return (
      (!subjectId || enrollment?.subjectId === Number(subjectId)) &&
      filter(Object.values(presentRecord("inquiries", row, refs)).join(" "))
    );
  });
  const total =
    page === "subjects"
      ? subjectRows.length
      : page === "inquiries"
        ? inquiryRows.length
        : enrollmentRows.length;
  const start = (currentPage - 1) * pageSize;
  const showDetail = (
    resource: "subjects" | "enrollments" | "inquiries",
    row: Parameters<typeof presentRecord>[1],
  ) => setDetail(presentRecord(resource, row, refs));
  const reset = () => setCurrentPage(1);
  const gradeCell = (enrollmentId: number, type: "Midterm" | "Final") => {
    const grade = data?.grades.find(
      (row) => row.enrollmentId === enrollmentId && row.gradeType === type,
    );
    return grade ? (
      <div className="min-w-36 space-y-2">
        <p className="font-semibold tabular-nums">{grade.score}</p>
        <p className="text-xs text-muted-foreground">
          Grade #{grade.gradeId} · {timestamp(grade.dateRecorded)}
        </p>
        <p className="whitespace-pre-wrap break-words text-xs">
          {grade.remarks ?? "No remarks"}
        </p>
        <Button
          size="sm"
          variant="edit"
          disabled={mutation.isPending}
          onClick={() => setEditor({ grade })}
        >
          Edit {type}
        </Button>
      </div>
    ) : (
      <span className="text-muted-foreground">Not recorded</span>
    );
  };
  return (
    <>
      <PageHeader
        title={titles[page]}
        description={
          page === "dashboard"
            ? "Manage your assigned subjects and student grades."
            : page === "grades"
              ? "Record and update grades for assigned enrollments. Missing grades are not zero."
              : "Academic records within your assigned Faculty scope."
        }
        actions={
          <>
            {page === "grades" && (
              <Button
                disabled={
                  !data || eligible.length === 0 || mutation.isPending
                }
                onClick={openCreate}
              >
                Encode Grade
              </Button>
            )}
          </>
        }
      />
      {query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void refresh()}
        />
      ) : !data ? (
        <LoadingState label="Loading your assigned records…" />
      ) : (
        <>
          {namesPending && (
            <p role="status" className="text-xs text-muted-foreground">
              Loading student names...
            </p>
          )}
          {namesFailed && (
            <Alert title="Some Student names are unavailable" tone="warning">
              Student names will be retried automatically.
            </Alert>
          )}
          {page === "dashboard" && metrics ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Total Assigned Subjects", metrics.subjects, BookOpen],
                  ["Total Assigned Students", metrics.students, Users],
                  ["Total Recorded Grades", metrics.grades, GraduationCap],
                  ["Pending Grade Inquiries", metrics.pending, MessageSquare],
                ].map(([label, count, Icon], index) => {
                  const MetricIcon = Icon as typeof Users;
                  return (
                    <SummaryCard
                      key={String(label)}
                      label={String(label)}
                      value={Number(count).toLocaleString()}
                      icon={<MetricIcon />}
                      tone={
                        (["blue", "violet", "teal", "rose"] as const)[index]
                      }
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.students} students across {metrics.enrollments} enrollments.
              </p>
              <div className="grid gap-5 xl:grid-cols-2">
                <Card className={dashboardCardClass}>
                  <h2 className="mb-4 text-base">My assigned subjects</h2>
                  {data.subjects.length ? (
                    <ul className="divide-y">
                      {data.subjects.map((row) => (
                        <li key={row.subjectId} className="py-3 text-sm">
                          <span className="font-medium">
                            {row.subjectCode}
                          </span>{" "}
                          · {row.subjectName}
                          <span className="block text-xs text-muted-foreground">
                            {row.units} units ·{" "}
                            {
                              data.enrollments.filter(
                                (enrollment) =>
                                  enrollment.subjectId === row.subjectId,
                              ).length
                            }{" "}
                            enrollments
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      title="No assigned subjects"
                      description="Assigned subjects will appear here."
                    />
                  )}
                </Card>
                <DashboardActions>
                  {[
                    ["Encode Grades", "/faculty/grades?action=create"],
                    ["View My Students", "/faculty/students"],
                    ["Review Grade Inquiries", "/faculty/grade-inquiries"],
                  ].map(([label, to]) => (
                    <DashboardAction
                      key={to}
                      to={to}
                      icon={
                        label.includes("Students") ? (
                          <Users />
                        ) : label.includes("Inquiries") ? (
                          <MessageSquare />
                        ) : (
                          <GraduationCap />
                        )
                      }
                    >
                      {label}
                    </DashboardAction>
                  ))}
                </DashboardActions>
                <DistributionChart
                  title="Grade type overview"
                  values={metrics.gradeTypes}
                  variant="bars"
                  description="Recorded grades in your assigned subjects."
                />
                <DistributionChart
                  title="Inquiry status"
                  values={metrics.inquiryStates}
                  description="Inquiries linked to your assigned academic records."
                />
              </div>
            </>
          ) : (
            <>
              {createRequested && !editor && (
                <Alert title="Encode a grade" tone="info">
                  {eligible.length ? (
                    <Button onClick={consumeCreate}>Open encode form</Button>
                  ) : (
                    "There are no Enrolled assignments currently available for encoding."
                  )}
                </Alert>
              )}
              {page === "grades" && eligible.length === 0 && (
                <Alert
                  title="No eligible enrollment for new grades"
                  tone="info"
                >
                  Only Enrolled records are offered for creation. Existing
                  historical grades may still be edited.
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <SearchInput
                  value={search}
                  label={`Search assigned ${page}`}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    reset();
                  }}
                />
                {page !== "subjects" && (
                  <FormField
                    label="Subject"
                  >
                    {(a11y) => (
                      <Select
                        {...a11y}
                        value={subjectId}
                        onChange={(event) => {
                          setSubjectId(event.target.value);
                          reset();
                        }}
                      >
                        <option value="">All assigned subjects</option>
                        {data.subjects.map((row) => (
                          <option key={row.subjectId} value={row.subjectId}>
                            {row.subjectCode} · {row.subjectName}
                          </option>
                        ))}
                      </Select>
                    )}
                  </FormField>
                )}
                {page === "grades" && (
                  <FormField
                    label="Grade type"
                  >
                    {(a11y) => (
                      <Select
                        {...a11y}
                        value={gradeType}
                        onChange={(event) => {
                          setGradeType(event.target.value);
                          reset();
                        }}
                      >
                        <option value="">All grade types</option>
                        <option>Midterm</option>
                        <option>Final</option>
                      </Select>
                    )}
                  </FormField>
                )}
              </div>
              {page === "subjects" ? (
                <DataTable
                  caption="Assigned subjects"
                  columns={[
                    {
                      key: "code",
                      header: "Subject Code",
                      cell: (row) => row.subjectCode,
                    },
                    {
                      key: "name",
                      header: "Subject Name",
                      cell: (row) => row.subjectName,
                    },
                    {
                      key: "units",
                      header: "Units",
                      cell: (row) => row.units,
                    },
                    {
                      key: "enrollments",
                      header: "Enrollments",
                      cell: (row) =>
                        data.enrollments.filter(
                          (item) => item.subjectId === row.subjectId,
                        ).length,
                    },
                  ]}
                  rows={subjectRows.slice(start, start + pageSize)}
                  rowKey={(row) => row.subjectId}
                  actions={(row) => (
                    <Button
                      size="sm"
                      variant="view"
                      onClick={() => showDetail("subjects", row)}
                    >
                      View
                    </Button>
                  )}
                />
              ) : page === "inquiries" ? (
                <DataTable
                  caption="Assigned grade inquiries"
                  columns={[
                    "Student",
                    "Grade",
                    "Message",
                    "Status",
                    "Submitted",
                    "Resolution note",
                  ].map((label) => ({
                    key: label,
                    header: label,
                    cell: (row: GradeInquiry) =>
                      label === "Status" ? (
                        <StatusBadge status={row.status} />
                      ) : (
                        <span className="block min-w-28 max-w-xs whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {presentRecord("inquiries", row, refs)[label]}
                        </span>
                      ),
                  }))}
                  rows={inquiryRows.slice(start, start + pageSize)}
                  rowKey={(row) => row.inquiryId}
                  actions={(row) => (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="view"
                        onClick={() => showDetail("inquiries", row)}
                      >
                        View
                      </Button>
                      {row.status === "Pending" && (
                        <Button
                          variant="success"
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() => setResolution(row)}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  )}
                />
              ) : (
                <DataTable
                  caption={
                    page === "grades"
                      ? "Grades by enrollment"
                      : "Assigned enrollment records"
                  }
                  columns={[
                    {
                      key: "student",
                      header: "Student",
                      cell: (row) => (
                        <span className="block min-w-32">
                          {userLabel(row.studentId, refs)}
                          <span className="block text-xs text-muted-foreground">
                            Student #{row.studentId} · Enrollment #
                            {row.enrollmentId}
                          </span>
                        </span>
                      ),
                    },
                    {
                      key: "subject",
                      header: "Subject",
                      cell: (row) => (
                        <span className="block min-w-36 max-w-xs break-words">
                          {subjectLabel(row.subjectId, refs)}
                        </span>
                      ),
                    },
                    {
                      key: "semester",
                      header: "Semester",
                      cell: (row) => row.semester,
                    },
                    {
                      key: "year",
                      header: "School year",
                      cell: (row) => row.schoolYear,
                    },
                    ...(page === "grades"
                      ? (["Midterm", "Final"] as const)
                          .filter((type) => !gradeType || gradeType === type)
                          .map((type) => ({
                            key: type,
                            header: type,
                            cell: (row: (typeof data.enrollments)[number]) =>
                              gradeCell(row.enrollmentId, type),
                          }))
                      : [
                          {
                            key: "status",
                            header: "Status",
                            cell: (
                              row: (typeof data.enrollments)[number],
                            ) => <StatusBadge status={row.status} />,
                          },
                          {
                            key: "date",
                            header: "Enrollment date",
                            cell: (row: (typeof data.enrollments)[number]) =>
                              row.dateEnrolled,
                          },
                        ]),
                  ]}
                  rows={enrollmentRows.slice(start, start + pageSize)}
                  rowKey={(row) => row.enrollmentId}
                  actions={(row) => (
                    <Button
                      size="sm"
                      variant="view"
                      onClick={() => showDetail("enrollments", row)}
                    >
                      View enrollment
                    </Button>
                  )}
                />
              )}
              {page === "students" && (
                <p className="text-xs text-muted-foreground">
                  A student may appear more than once when enrolled in different subjects.
                </p>
              )}
              <Pagination
                page={currentPage}
                pageSize={pageSize}
                total={total}
                disabled={query.isFetching}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  reset();
                }}
              />
            </>
          )}
        </>
      )}
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent
          title="Assigned record details"
          description="Read-only permitted academic values."
        >
          {detail && (
            <dl className="space-y-4">
              {Object.entries(detail).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setEditor(null);
        }}
      >
        <DialogContent
          title={editor?.grade ? "Edit Grade" : "Encode Grade"}
          description={
            editor?.grade
              ? `Grade #${editor.grade.gradeId} · Enrollment #${editor.grade.enrollmentId} · Recorded ${timestamp(editor.grade.dateRecorded)}. Enrollment identity and recording date cannot be changed.`
              : "Record a grade for an eligible assigned enrollment."
          }
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          {editor && !editor.grade && (
            <FormField label="Subject" required>
              {(a11y) => (
                <Select
                  {...a11y}
                  value={encodeSubject}
                  disabled={mutation.isPending}
                  onChange={(event) => setEncodeSubject(event.target.value)}
                >
                  <option value="">Select assigned subject</option>
                  {data?.subjects
                    .filter((row) =>
                      eligible.some(
                        (enrollment) =>
                          enrollment.subjectId === row.subjectId,
                      ),
                    )
                    .map((row) => (
                      <option key={row.subjectId} value={row.subjectId}>
                        {row.subjectCode} · {row.subjectName}
                      </option>
                    ))}
                </Select>
              )}
            </FormField>
          )}
          {form && (
            <EntityForm
              key={editor?.grade?.gradeId ?? encodeSubject}
              {...form}
              confirmation="Save this grade?"
              onSave={(values) =>
                save(
                  editor?.grade ? "update" : "create",
                  editor?.grade?.gradeId ?? null,
                  values,
                )
              }
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={resolution !== null}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setResolution(null);
        }}
      >
        <DialogContent
          title="Resolve Inquiry"
          description="Resolve this Pending assigned inquiry. This does not change the grade."
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          {resolution && (
            <EntityForm
              key={resolution.inquiryId}
              fields={[
                {
                  name: "resolutionNote",
                  label: "Resolution note",
                  type: "textarea",
                  required: true,
                },
              ]}
              defaults={{ resolutionNote: "" }}
              schema={resolveInquirySchema}
              confirmation="Resolve this inquiry? This cannot reopen the inquiry or change its grade."
              onSave={(values) =>
                save("resolve", resolution.inquiryId, values)
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
