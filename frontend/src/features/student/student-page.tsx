import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";
import { BookOpen, GraduationCap, MessageSquare } from "lucide-react";
import type { NavigationKey } from "@/app/navigation";
import type { Grade, GradeInquiry, Enrollment } from "@/api/contracts";
import { useAuth } from "@/auth/auth-provider";
import { queryFoundation as foundation } from "@/lib/query-client";
import { ApiError, normalizeApiError } from "@/api/errors";
import { createInquirySchema } from "@/lib/validation";
import { PageHeader } from "@/components/layout/headers";
import { Button } from "@/components/ui/button";
import { Card, Alert } from "@/components/ui/display";
import { Select } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/filters";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  DistributionChart,
  GradeComparisonChart,
  DashboardActions,
  DashboardAction,
} from "@/components/shared/dashboard-visuals";
import { gradeComparisonRows } from "../shared/dashboard-chart-data";
import { SummaryCard } from "@/components/shared/summary-card";
import { LoadingState, ErrorState } from "@/components/feedback/states";
import { EntityForm } from "../shared/entity-form";
import {
  presentRecord,
  subjectLabel,
  timestamp,
  type ReferenceMaps,
} from "../shared/record-presentation";
import { useStudentRecords } from "./student-queries";
import { useDashboardRefresh } from "../shared/use-dashboard-refresh";
import { studentMetrics, ownInquiry } from "./student-data";
type Page = "dashboard" | "subjects" | "grades" | "inquiries";
const titles: Record<Page, string> = {
  dashboard: "Student Dashboard",
  subjects: "My Subjects",
  grades: "My Grades",
  inquiries: "My Grade Inquiries",
};
export default function StudentPage({ page }: { page: NavigationKey }) {
  return <StudentWorkspace key={page} page={page as Page} />;
}
function StudentWorkspace({ page }: { page: Page }) {
  const { query, refresh } = useStudentRecords(),
    auth = useAuth(),
    notify = useToast();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(""),
    [schoolYear, setSchoolYear] = useState(""),
    [semester, setSemester] = useState(""),
    [subjectId, setSubjectId] = useState(""),
    [gradeType, setGradeType] = useState(""),
    [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [formOpen, setFormOpen] = useState(false),
    [formSubject, setFormSubject] = useState(""),
    [selectedGrade, setSelectedGrade] = useState<number | null>(null),
    [detail, setDetail] = useState<Record<string, string> | null>(null);
  const work = useRef<(() => Promise<unknown>) | null>(null);
  const mutation = useMutation({
    ...foundation.mutation("inquiries", async () => {
      if (!work.current)
        throw new ApiError("cancelled", "Request cancelled.");
      return work.current();
    }),
    gcTime: 0,
  });
  useDashboardRefresh(
    refresh,
    true,
    query.isFetching || mutation.isPending || formOpen || Boolean(detail),
  );
  const data = query.data,
    metrics = data ? studentMetrics(data) : null;
  const refs: ReferenceMaps = {
    users: new Map(auth.user ? [[auth.user.userId, auth.user]] : []),
    subjects: new Map(
      data?.subjects.map((row) => [row.subjectId, row]) ?? [],
    ),
    enrollments: new Map(
      data?.enrollments.map((row) => [row.enrollmentId, row]) ?? [],
    ),
    grades: new Map(data?.grades.map((row) => [row.gradeId, row]) ?? []),
  };
  const openForm = (grade?: Grade) => {
    setSelectedGrade(grade?.gradeId ?? null);
    setFormSubject(
      String(
        grade
          ? (refs.enrollments.get(grade.enrollmentId)?.subjectId ?? "")
          : (data?.subjects.find((subject) =>
              data.grades.some(
                (record) =>
                  refs.enrollments.get(record.enrollmentId)?.subjectId ===
                  subject.subjectId,
              ),
            )?.subjectId ?? ""),
      ),
    );
    setFormOpen(true);
  };
  async function submit(values: Record<string, unknown>) {
    if (!data || auth.user?.role !== "Student" || work.current)
      throw new ApiError(
        "forbidden",
        "This action is unavailable.",
        "protected",
        403,
      );
    const input = ownInquiry(data, values),
      scope = foundation.getScope();
    work.current = () => foundation.services.inquiries.create(input);
    try {
      await mutation.mutateAsync(undefined);
      if (scope !== foundation.getScope()) return;
      setFormOpen(false);
      notify({ title: "Grade inquiry submitted.", tone: "success" });
      await query.refetch();
    } catch (error) {
      const safe = normalizeApiError(error, "protected");
      if (safe.kind !== "cancelled")
        notify({
          title: "Inquiry not submitted",
          description: safe.message,
          tone: "danger",
        });
      throw safe;
    } finally {
      work.current = null;
    }
  }
  const filter = (value: string) =>
    value.toLowerCase().includes(search.toLowerCase());
  const academicRows = (data?.enrollments ?? []).filter(
    (row) =>
      (!schoolYear || row.schoolYear === schoolYear) &&
      (!semester || row.semester === semester) &&
      (!subjectId || row.subjectId === Number(subjectId)) &&
      filter(
        `${subjectLabel(row.subjectId, refs)} ${row.semester} ${row.schoolYear} ${row.status}`,
      ) &&
      (!gradeType ||
        data?.grades.some(
          (grade) =>
            grade.enrollmentId === row.enrollmentId &&
            grade.gradeType === gradeType,
        )),
  );
  const inquiryRows = (data?.inquiries ?? []).filter(
    (row) =>
      (!status || row.status === status) &&
      filter(Object.values(presentRecord("inquiries", row, refs)).join(" ")),
  );
  const total =
      page === "inquiries" ? inquiryRows.length : academicRows.length,
    safePage = Math.min(
      currentPage,
      Math.max(1, Math.ceil(total / pageSize)),
    ),
    start = (safePage - 1) * pageSize;
  const reset = () => setCurrentPage(1);
  const gradeDetails = (grade: Grade) => {
    const enrollment = refs.enrollments.get(grade.enrollmentId);
    setDetail({
      "Grade ID": String(grade.gradeId),
      "Enrollment ID": String(grade.enrollmentId),
      ...presentRecord("grades", grade, refs),
      Semester: enrollment?.semester ?? "Unavailable",
      "School year": enrollment?.schoolYear ?? "Unavailable",
    });
  };
  const gradeCell = (enrollmentId: number, type: "Midterm" | "Final") => {
    const grade = data?.grades.find(
      (row) => row.enrollmentId === enrollmentId && row.gradeType === type,
    );
    return grade ? (
      <div className="min-w-40 max-w-xs space-y-2">
        <p className="font-semibold tabular-nums">{grade.score}</p>
        <p className="text-xs text-muted-foreground">
          Grade #{grade.gradeId} · {timestamp(grade.dateRecorded)}
        </p>
        <p className="whitespace-pre-wrap break-words text-xs">
          {grade.remarks ?? "No remarks"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="view"
            onClick={() => gradeDetails(grade)}
          >
            View {type}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openForm(grade)}
          >
            Inquire {type}
          </Button>
        </div>
      </div>
    ) : (
      <span className="text-muted-foreground">Not recorded</span>
    );
  };
  const formGrades = (data?.grades ?? []).filter(
    (grade) =>
      refs.enrollments.get(grade.enrollmentId)?.subjectId ===
      Number(formSubject),
  );
  const enrollmentColumns = [
    {
      key: "subject",
      header: "Subject",
      cell: (row: Enrollment) => (
        <span className="block min-w-40 max-w-xs break-words">
          {subjectLabel(row.subjectId, refs)}
          <span className="block text-xs text-muted-foreground">
            Enrollment #{row.enrollmentId}
          </span>
        </span>
      ),
    },
    {
      key: "semester",
      header: "Semester",
      cell: (row: Enrollment) => row.semester,
    },
    {
      key: "year",
      header: "School year",
      cell: (row: Enrollment) => row.schoolYear,
    },
  ];
  return (
    <>
      <PageHeader
        title={titles[page]}
        description="Stay updated on your own academic records and grade inquiries."
      />
      {query.error ? (
        <ErrorState
          description={query.error.message}
          onRetry={() => void refresh()}
        />
      ) : !data ? (
        <LoadingState label="Loading your academic records…" />
      ) : (
        <>
          {page === "dashboard" && metrics && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["My Subjects", metrics.subjects, BookOpen],
                  ["Recorded Grades", metrics.grades, GraduationCap],
                  ["Pending Grade Inquiries", metrics.pending, MessageSquare],
                ].map(([label, count, Icon], index) => {
                  const MetricIcon = Icon as typeof BookOpen;
                  return (
                    <SummaryCard
                      key={String(label)}
                      label={String(label)}
                      value={Number(count).toLocaleString()}
                      icon={<MetricIcon />}
                      tone={(["blue", "teal", "rose"] as const)[index]}
                    />
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.subjects} subjects across {metrics.enrollments} enrollments.
              </p>
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                <GradeComparisonChart
                  rows={gradeComparisonRows(
                    data.enrollments,
                    data.grades,
                    data.subjects,
                  )}
                />
                <div className="grid min-w-0 gap-5">
                  <DistributionChart
                    title="Grade record overview"
                    values={{
                      Midterm: metrics.midterm,
                      Final: metrics.final,
                    }}
                    variant="bars"
                  />
                  <DistributionChart
                    title="My inquiry status"
                    values={{
                      Pending: metrics.pending,
                      Resolved: metrics.resolved,
                    }}
                  />
                </div>
              </div>
              <DashboardActions>
                <DashboardAction
                  to="/student/grades"
                  icon={<GraduationCap />}
                >
                  View My Grades
                </DashboardAction>
                <DashboardAction
                  to="/student/grade-inquiries?action=create"
                  icon={<MessageSquare />}
                >
                  Submit Grade Inquiry
                </DashboardAction>
                <DashboardAction to="/student/subjects" icon={<BookOpen />}>
                  View My Subjects
                </DashboardAction>
              </DashboardActions>
            </>
          )}
          {page === "inquiries" &&
            params.get("action") === "create" &&
            !formOpen && (
              <Alert title="Submit a grade inquiry" tone="info">
                {data.grades.length ? (
                  <Button
                    onClick={() => {
                      openForm();
                      setParams(
                        (current) => {
                          current.delete("action");
                          return current;
                        },
                        { replace: true },
                      );
                    }}
                  >
                    Open inquiry form
                  </Button>
                ) : (
                  "An existing recorded grade is required before you can submit an inquiry."
                )}
              </Alert>
            )}
          {page !== "dashboard" && (
            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start">
              <div
                className={`grid min-w-0 flex-1 gap-4 sm:grid-cols-2 [&_label]:block ${
                  page === "inquiries"
                    ? ""
                    : page === "grades"
                      ? "xl:grid-cols-5"
                      : "xl:grid-cols-4"
                }`}
              >
                <SearchInput
                  value={search}
                  label={`Search my ${page}`}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    reset();
                  }}
                />
                {page === "inquiries" ? (
                  <FormField
                    label="Inquiry status"
                  >
                    {(a11y) => (
                      <Select
                        {...a11y}
                        value={status}
                        onChange={(event) => {
                          setStatus(event.target.value);
                          reset();
                        }}
                      >
                        <option value="">All statuses</option>
                        <option>Pending</option>
                        <option>Resolved</option>
                      </Select>
                    )}
                  </FormField>
                ) : (
                  <>
                    {[
                      [
                        "School year",
                        schoolYear,
                        setSchoolYear,
                        [
                          ...new Set(
                            data.enrollments.map((row) => row.schoolYear),
                          ),
                        ],
                      ],
                      [
                        "Semester",
                        semester,
                        setSemester,
                        [
                          ...new Set(
                            data.enrollments.map((row) => row.semester),
                          ),
                        ],
                      ],
                    ].map(([label, value, setter, options]) => (
                      <FormField
                        key={String(label)}
                        label={String(label)}
                      >
                        {(a11y) => (
                          <Select
                            {...a11y}
                            value={value as string}
                            onChange={(event) => {
                              (setter as (value: string) => void)(
                                event.target.value,
                              );
                              reset();
                            }}
                          >
                            <option value="">
                              All {String(label).toLowerCase()} values
                            </option>
                            {(options as string[]).map((option) => (
                              <option key={option}>{option}</option>
                            ))}
                          </Select>
                        )}
                      </FormField>
                    ))}
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
                          <option value="">All my subjects</option>
                          {data.subjects.map((row) => (
                            <option key={row.subjectId} value={row.subjectId}>
                              {row.subjectCode} · {row.subjectName}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormField>
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
                  </>
                )}
              </div>
              {page === "inquiries" && (
                <Button
                  className="w-full shrink-0 self-start lg:mt-7 lg:w-auto"
                  disabled={!data.grades.length || mutation.isPending}
                  onClick={() => openForm()}
                >
                  Submit Grade Inquiry
                </Button>
              )}
            </div>
          )}
          {page === "inquiries" ? (
            <DataTable
              caption="My grade inquiries"
              columns={[
                "Grade",
                "Message",
                "Status",
                "Submitted",
                "Resolved by",
                "Resolution note",
                "Resolved on",
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
                <Button
                  size="sm"
                  variant="view"
                  onClick={() =>
                    setDetail({
                      "Inquiry ID": String(row.inquiryId),
                      ...presentRecord("inquiries", row, refs),
                    })
                  }
                >
                  View
                </Button>
              )}
            />
          ) : page === "subjects" ? (
            <DataTable
              caption="My subject enrollments"
              columns={[
                ...enrollmentColumns,
                {
                  key: "units",
                  header: "Units",
                  cell: (row) =>
                    refs.subjects.get(row.subjectId)?.units ?? "Unavailable",
                },
                {
                  key: "faculty",
                  header: "Faculty",
                  cell: (row) => {
                    const faculty = refs.subjects.get(
                      row.subjectId,
                    )?.facultyId;
                    return faculty ? `Faculty #${faculty}` : "Unavailable";
                  },
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: "date",
                  header: "Enrollment date",
                  cell: (row) => row.dateEnrolled,
                },
              ]}
              rows={academicRows.slice(start, start + pageSize)}
              rowKey={(row) => row.enrollmentId}
              actions={(row) => (
                <Button
                  size="sm"
                  variant="view"
                  onClick={() =>
                    setDetail({
                      "Enrollment ID": String(row.enrollmentId),
                      ...presentRecord("enrollments", row, refs),
                      Units: String(
                        refs.subjects.get(row.subjectId)?.units ??
                          "Unavailable",
                      ),
                    })
                  }
                >
                  View
                </Button>
              )}
            />
          ) : (
            <DataTable
              caption={
                page === "dashboard"
                  ? "My academic grades"
                  : "My grades by enrollment"
              }
              columns={[
                ...enrollmentColumns,
                ...(["Midterm", "Final"] as const)
                  .filter((type) => !gradeType || gradeType === type)
                  .map((type) => ({
                    key: type,
                    header: type,
                    cell: (row: Enrollment) =>
                      gradeCell(row.enrollmentId, type),
                  })),
              ]}
              rows={academicRows.slice(start, start + pageSize)}
              rowKey={(row) => row.enrollmentId}
            />
          )}
          <p className="text-xs text-muted-foreground">
            Missing grades are shown as “Not recorded”.
          </p>
          <Pagination
            page={safePage}
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
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <DialogContent
          title="My academic record details"
          description="Read-only values from your permitted records."
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
        open={formOpen}
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) setFormOpen(false);
        }}
      >
        <DialogContent
          title="Submit Grade Inquiry"
          description="Ask about an existing own grade. This does not change the grade."
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          <FormField label="Subject" required>
            {(a11y) => (
              <Select
                {...a11y}
                value={formSubject}
                disabled={mutation.isPending}
                onChange={(event) => {
                  setFormSubject(event.target.value);
                  setSelectedGrade(null);
                }}
              >
                <option value="">Select my subject</option>
                {data?.subjects
                  .filter((subject) =>
                    data.grades.some(
                      (grade) =>
                        refs.enrollments.get(grade.enrollmentId)
                          ?.subjectId === subject.subjectId,
                    ),
                  )
                  .map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.subjectCode} · {subject.subjectName}
                    </option>
                  ))}
              </Select>
            )}
          </FormField>
          {data && (
            <EntityForm
              key={`${formSubject}:${selectedGrade ?? "new"}`}
              schema={createInquirySchema.refine(
                (value) =>
                  formGrades.some((grade) => grade.gradeId === value.gradeId),
                {
                  path: ["gradeId"],
                  message: "Choose an existing grade for this subject.",
                },
              )}
              fields={[
                {
                  name: "gradeId",
                  label: "Grade record",
                  type: "select",
                  required: true,
                  options: formGrades.map((grade) => {
                    const enrollment = refs.enrollments.get(
                      grade.enrollmentId,
                    );
                    return {
                      value: grade.gradeId,
                      label: `${grade.gradeType} · ${grade.score} · Grade #${grade.gradeId} · Enrollment #${grade.enrollmentId} · ${enrollment?.semester} · ${enrollment?.schoolYear}`,
                    };
                  }),
                },
                {
                  name: "message",
                  label: "Inquiry message",
                  type: "textarea",
                  required: true,
                  description:
                    "1–4000 characters, at most 16000 UTF-8 bytes. NUL characters are not allowed.",
                },
              ]}
              defaults={{ gradeId: selectedGrade ?? "", message: "" }}
              confirmation="Submit this inquiry about the selected recorded grade? The grade itself will remain unchanged."
              onSave={submit}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
