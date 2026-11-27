import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, queryOptions } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Plus } from "lucide-react";
import { useDashboardRefresh } from "./use-dashboard-refresh";
import type {
  CreateEnrollmentRequest,
  CreateSubjectRequest,
  CreateUserRequest,
  Enrollment,
  GradeInquiry,
  SafeUser,
  Subject,
  UpdateUserRequest,
} from "@/api/contracts";
import { useAuth } from "@/auth/auth-provider";
import { queryFoundation as foundation } from "@/lib/query-client";
import { normalizeApiError, ApiError } from "@/api/errors";
import { PageHeader } from "@/components/layout/headers";
import { Alert } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { useToast } from "@/components/ui/toast";
import { LoadingState, ErrorState } from "@/components/feedback/states";
import { DataTable } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import { SearchInput } from "@/components/shared/filters";
import { FormField } from "@/components/shared/form-field";
import { Select } from "@/components/ui/form-controls";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { EntityForm } from "./entity-form";
import { recordForm, type EditableResource } from "./record-fields";
import {
  recordId,
  assignmentUsers,
  isSafeUser,
  type WorkspaceRecords,
  type WorkspaceResource,
} from "./workspace-data";
import {
  presentRecord,
  tableFields,
  userLabel,
  type ReferenceMaps,
} from "./record-presentation";
import {
  workspaceQueries,
  departmentWorkspaceQueries,
} from "./workspace-queries";
import {
  managementCapabilities,
  type ManagementRole,
} from "../../auth/policies";

type Row = WorkspaceRecords[WorkspaceResource];
const headings: Record<WorkspaceResource, string> = {
  subjects: "Subject Management",
  enrollments: "Enrollment Management",
  grades: "Grades Monitoring",
  inquiries: "Grade Inquiries",
  users: "User Management",
};
const singular: Record<WorkspaceResource, string> = {
  subjects: "Subject",
  enrollments: "Enrollment",
  grades: "Grade",
  inquiries: "Inquiry",
  users: "User",
};
const restrictions: Partial<Record<WorkspaceResource, string>> = {
  subjects:
    "Subjects with enrollments cannot be deleted. Graded records restrict Faculty reassignment.",
  enrollments:
    "Grades protect enrollment identity and term fields and prevent deletion. The original enrollment date is immutable.",
  grades:
    "Admin access is read-only. Grade entry and corrections belong to assigned Faculty.",
  inquiries:
    "Only Pending inquiries can be resolved. Resolution does not change a grade. Resolved inquiries cannot be reopened or deleted.",
  users:
    "The last active Admin cannot be deactivated. Existing passwords are not shown.",
};
export function ManagementPage({
  resource,
  role = "Admin",
}: {
  resource: WorkspaceResource;
  role?: ManagementRole;
}) {
  const policy = managementCapabilities(role);
  const repo = policy.directoryOnly
    ? departmentWorkspaceQueries
    : workspaceQueries;
  const directory = resource === "users" && policy.directoryOnly;
  const heading = directory
    ? "Student & Faculty Directory"
    : headings[resource];
  const description = directory
    ? "Read-only directory of Students and Faculty."
    : resource === "inquiries" && !policy.canResolveInquiries
      ? "Read-only inquiry monitoring. This role cannot resolve, edit, delete, or reopen inquiries."
      : resource === "grades"
        ? "Read-only grade monitoring. Grade entry and corrections belong to assigned Faculty."
        : restrictions[resource];
  const canEdit =
    (resource === "subjects" && policy.canManageSubjects) ||
    (resource === "enrollments" && policy.canManageEnrollments) ||
    (resource === "users" && policy.canManageUsers);
  const canWrite =
    canEdit || (resource === "inquiries" && policy.canResolveInquiries);
  const auth = useAuth();
  const notify = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [directoryRole, setDirectoryRole] = useState("all");
  const [studentId, setStudentId] = useState<number | undefined>();
  const [view, setView] = useState<Row | null>(null);
  const [editor, setEditor] = useState<{ row: Row | null } | null>(null);
  const [opening, setOpening] = useState(false);
  const query = useQuery(
    repo.page(resource, {
      page,
      pageSize,
      ...(["grades", "inquiries", "enrollments"].includes(resource) &&
      studentId
        ? { studentId }
        : {}),
    }),
  );
  const userRefs = useQuery({
    ...repo.complete("users"),
    enabled: resource !== "users",
  });
  const subjectRefs = useQuery({
    ...repo.complete("subjects"),
    enabled: ["enrollments", "grades", "inquiries"].includes(resource),
  });
  const enrollmentRefs = useQuery({
    ...repo.complete("enrollments"),
    enabled: ["grades", "inquiries"].includes(resource),
  });
  const gradeRefs = useQuery({
    ...repo.complete("grades"),
    enabled: resource === "inquiries",
  });
  const refQueries = [
    resource !== "users" ? userRefs : null,
    ["enrollments", "grades", "inquiries"].includes(resource)
      ? subjectRefs
      : null,
    ["grades", "inquiries"].includes(resource) ? enrollmentRefs : null,
    resource === "inquiries" ? gradeRefs : null,
  ].filter((item) => item !== null);
  const refsReady = refQueries.every(
    (item) => Boolean(item.data) && !item.error,
  );
  const refError = refQueries.find((item) => item.error)?.error;
  const users = userRefs.data?.rows ?? [];
  const subjects = subjectRefs.data?.rows ?? [];
  const refs: ReferenceMaps = useMemo(
    () => ({
      users: new Map(users.map((user) => [user.userId, user])),
      subjects: new Map(
        subjects.map((subject) => [subject.subjectId, subject]),
      ),
      enrollments: new Map(
        (enrollmentRefs.data?.rows ?? []).map((row) => [
          row.enrollmentId,
          row,
        ]),
      ),
      grades: new Map(
        (gradeRefs.data?.rows ?? []).map((row) => [row.gradeId, row]),
      ),
    }),
    [userRefs.data, subjectRefs.data, enrollmentRefs.data, gradeRefs.data],
  );
  const work = useRef<(() => Promise<unknown>) | null>(null);
  const mutation = useMutation({
    ...foundation.mutation(resource, async () => {
      if (!work.current)
        throw new ApiError("configuration", "No operation is pending.");
      return work.current();
    }),
    gcTime: 0,
  });
  const canCreate =
    (resource === "users" && policy.canManageUsers) ||
    (resource === "subjects" &&
      refsReady &&
      assignmentUsers(users, "Faculty", policy.directoryOnly).length > 0) ||
    (resource === "enrollments" &&
      refsReady &&
      assignmentUsers(users, "Student", policy.directoryOnly).length > 0 &&
      subjects.length > 0);
  useEffect(() => {
    if (params.get("action") === "create" && canCreate) {
      setEditor({ row: null });
      setParams(
        (current) => {
          current.delete("action");
          return current;
        },
        { replace: true },
      );
    }
  }, [params, canCreate, setParams]);
  useEffect(() => {
    if (query.data && page > Math.max(1, query.data.totalPages))
      setPage(Math.max(1, query.data.totalPages));
  }, [query.data, page]);
  const refresh = async () => {
    await foundation.invalidateAfterMutation("users");
    await Promise.all([
      query.refetch(),
      ...refQueries.map((item) => item.refetch()),
    ]);
  };
  useDashboardRefresh(
    refresh,
    true,
    query.isFetching ||
      mutation.isPending ||
      opening ||
      Boolean(editor) ||
      Boolean(view) ||
      refQueries.some((item) => item.isFetching),
  );
  const perform = async (
    operation: () => Promise<unknown>,
    message: string,
    targetUser?: number,
  ) => {
    if (!canWrite)
      throw new ApiError(
        "forbidden",
        "You do not have permission to perform this action.",
        "protected",
        403,
      );
    if (work.current)
      throw new ApiError(
        "validation",
        "A request is already being processed.",
      );
    const scope = foundation.getScope();
    work.current = operation;
    try {
      await mutation.mutateAsync(undefined);
      if (scope !== foundation.getScope()) return;
      if (resource === "users" && targetUser === auth.user?.userId)
        await auth.refreshIdentity(true);
      if (scope !== foundation.getScope()) return;
      notify({ title: message, tone: "success" });
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
  };
  const detailOptions = (row: Row) =>
    queryOptions({
      queryKey: [
        ...foundation.keys.resource(resource),
        "detail",
        recordId(row),
      ],
      queryFn: ({ signal }) =>
        resource === "subjects"
          ? foundation.services.subjects.get(recordId(row), { signal })
          : resource === "enrollments"
            ? foundation.services.enrollments.get(recordId(row), { signal })
            : resource === "users"
              ? (policy.directoryOnly
                  ? foundation.services.directory
                  : foundation.services.users
                ).get(recordId(row), { signal })
              : Promise.resolve(row),
    });
  const details = useQuery({
    ...(view
      ? detailOptions(view)
      : {
          queryKey: [...foundation.keys.resource(resource), "no-selection"],
          queryFn: async (): Promise<Row> => {
            throw new ApiError("configuration", "Select a record first.");
          },
        }),
    enabled: view !== null,
  });
  const edit = async (row: Row) => {
    setOpening(true);
    try {
      const latest = ["subjects", "enrollments", "users"].includes(resource)
        ? await foundation.client.fetchQuery({
            ...detailOptions(row),
            staleTime: 0,
          })
        : row;
      setEditor({ row: latest });
    } catch (error) {
      notify({
        title: "Unable to open record",
        description: normalizeApiError(error, "protected").message,
        tone: "danger",
      });
    } finally {
      setOpening(false);
    }
  };
  const save = async (values: Record<string, unknown>) => {
    const row = editor?.row;
    const id = row ? recordId(row) : undefined;
    if (resource === "subjects")
      await perform(
        () =>
          id
            ? foundation.services.subjects.replace(
                id,
                values as unknown as CreateSubjectRequest,
              )
            : foundation.services.subjects.create(
                values as unknown as CreateSubjectRequest,
              ),
        `Subject ${id ? "updated" : "created"}.`,
      );
    if (resource === "enrollments")
      await perform(
        () =>
          id
            ? foundation.services.enrollments.replace(
                id,
                values as unknown as CreateEnrollmentRequest,
              )
            : foundation.services.enrollments.create(
                values as unknown as CreateEnrollmentRequest,
              ),
        `Enrollment ${id ? "updated" : "created"}.`,
      );
    if (resource === "users")
      await perform(
        () =>
          id
            ? foundation.services.users.update(
                id,
                values as UpdateUserRequest,
              )
            : foundation.services.users.create(
                values as unknown as CreateUserRequest,
              ),
        `User ${id ? "updated" : "created"}.`,
        id,
      );
    if (resource === "inquiries" && id)
      await perform(
        () =>
          foundation.services.inquiries.resolve(id, {
            resolutionNote: String(values.resolutionNote),
          }),
        "Inquiry resolved.",
      );
    setEditor(null);
  };
  const rows = (query.data?.data ?? []).filter(
    (row) =>
      Object.values(presentRecord(resource, row, refs, policy.directoryOnly))
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!directory ||
        directoryRole === "all" ||
        (row as import("../../api/contracts").DirectoryUser).role ===
          directoryRole),
  );
  const form =
    editor && canWrite
      ? recordForm(
          resource as EditableResource,
          resource === "inquiries"
            ? null
            : (editor.row as Subject | Enrollment | SafeUser | null),
          users,
          subjects,
          role,
        )
      : null;
  return (
    <>
      <PageHeader title={heading} description={description} />
      {refError ? (
        <Alert tone="warning" title="Reference data unavailable">
          {refError.message} Records retain their IDs where names cannot be
          resolved. Automatic refresh will retry.
        </Alert>
      ) : (
        !refsReady && (
          <LoadingState label="Loading selection and reference data…" />
        )
      )}
      {["subjects", "enrollments"].includes(resource) &&
        refsReady &&
        !canCreate && (
          <Alert tone="info" title="Creation requires available assignments">
            {policy.directoryOnly
              ? "Choose an eligible account. Contact an administrator if none is available."
              : resource === "subjects"
                ? "Create or activate a Faculty account before adding a subject."
                : "An Active Student and an existing Subject are required."}
          </Alert>
        )}
      {policy.directoryOnly &&
        ["subjects", "enrollments"].includes(resource) && (
          <Alert title="Assignment validation" tone="info">
            Assignments require an eligible account. Contact an administrator if an assignment is rejected.
          </Alert>
        )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2 [&_label]:block">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            label={`Search ${directory ? "directory" : resource} on this page`}
          />
          {directory && (
            <FormField
              label="Role (this page)"
            >
              {(a11y) => (
                <Select
                  {...a11y}
                  value={directoryRole}
                  onChange={(event) => setDirectoryRole(event.target.value)}
                >
                  <option value="all">All directory roles</option>
                  <option value="Student">Student</option>
                  <option value="Faculty">Faculty</option>
                </Select>
              )}
            </FormField>
          )}
          {["grades", "inquiries", "enrollments"].includes(resource) && (
            <FormField
              label="Student filter"
            >
              {(a11y) => (
                <Select
                  {...a11y}
                  value={studentId ?? ""}
                  onChange={(event) => {
                    setStudentId(
                      event.target.value
                        ? Number(event.target.value)
                        : undefined,
                    );
                    setPage(1);
                  }}
                >
                  <option value="">All Students</option>
                  {users
                    .filter((user) => user.role === "Student")
                    .map((user) => (
                      <option key={user.userId} value={user.userId}>
                        {user.firstName} {user.lastName} (#{user.userId})
                      </option>
                    ))}
                </Select>
              )}
            </FormField>
          )}
        </div>
        {canEdit && (
          <Button
            className="w-full shrink-0 self-start sm:mt-7 sm:w-auto"
            disabled={!canCreate || mutation.isPending}
            onClick={() => setEditor({ row: null })}
          >
            <Plus aria-hidden="true" />
            Add {singular[resource]}
          </Button>
        )}
      </div>
      <DataTable<Row>
        caption={heading}
        columns={(directory
          ? ["User ID", "First name", "Last name", "Role"]
          : tableFields[resource]
        ).map((label) => ({
          key: label,
          header: label,
          cell: (row) => {
            const value =
              presentRecord(resource, row, refs, policy.directoryOnly)[
                label
              ] ?? "Unavailable";
            return label === "Status" ? (
              <StatusBadge status={value} />
            ) : (
              <span className="block min-w-28 max-w-xs break-words [overflow-wrap:anywhere]">
                {label === "Message" || label === "Resolution note" ? (
                  <span className="line-clamp-3 whitespace-pre-wrap">
                    {value}
                  </span>
                ) : (
                  value
                )}
              </span>
            );
          },
        }))}
        rows={rows}
        rowKey={recordId}
        loading={query.isPending}
        error={query.error?.message}
        onRetry={() => void query.refetch()}
        emptyMessage={
          search || (directory && directoryRole !== "all")
            ? "No matches on this page. Clear the search or filters, or try another page."
            : "No records were returned."
        }
        actions={(row) => (
          <div className="inline-flex w-max flex-nowrap items-center gap-2 [&>button]:h-9 [&>button]:whitespace-nowrap">
            <Button variant="view" size="sm" onClick={() => setView(row)}>
              View
            </Button>
            {canEdit && (
              <Button
                variant="edit"
                size="sm"
                disabled={
                  opening ||
                  mutation.isPending ||
                  (resource !== "users" && !refsReady)
                }
                onClick={() => void edit(row)}
              >
                Edit
              </Button>
            )}
            {["subjects", "enrollments"].includes(resource) && (
              <ConfirmationDialog
                trigger={
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={mutation.isPending}
                  >
                    Delete
                  </Button>
                }
                title={`Delete ${singular[resource]}?`}
                description="This permanently removes an unreferenced record. Academic-history restrictions still apply."
                confirmLabel="Delete record"
                destructive
                onConfirm={() =>
                  perform(
                    () =>
                      resource === "subjects"
                        ? foundation.services.subjects.remove(recordId(row))
                        : foundation.services.enrollments.remove(
                            recordId(row),
                          ),
                    `${singular[resource]} deleted.`,
                  )
                }
              />
            )}
            {policy.canResolveInquiries &&
              resource === "inquiries" &&
              (row as GradeInquiry).status === "Pending" && (
                <Button
                  variant="success"
                  size="sm"
                  disabled={mutation.isPending || !refsReady}
                  onClick={() => setEditor({ row })}
                >
                  Resolve
                </Button>
              )}
            {policy.canManageUsers &&
              resource === "users" &&
              isSafeUser(row as SafeUser) && (
                <ConfirmationDialog
                  trigger={
                    <Button
                      variant={
                        (row as SafeUser).accountStatus === "Active"
                          ? "destructive"
                          : "success"
                      }
                      className="w-26"
                      size="sm"
                      disabled={mutation.isPending}
                    >
                      {(row as SafeUser).accountStatus === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </Button>
                  }
                  title="Change account status?"
                  description="This changes account access. Deactivating your own account signs you out. Academic and last-Admin restrictions still apply."
                  confirmLabel="Confirm status change"
                  onConfirm={() =>
                    perform(
                      () =>
                        foundation.services.users.update(recordId(row), {
                          accountStatus:
                            (row as SafeUser).accountStatus === "Active"
                              ? "Inactive"
                              : "Active",
                        }),
                      "Account status updated.",
                      recordId(row),
                    )
                  }
                />
              )}
          </div>
        )}
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={query.data?.total ?? 0}
        disabled={query.isFetching}
        onPageChange={(next) => {
          setPage(next);
          setSearch("");
        }}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
          setSearch("");
        }}
      />
      <Dialog
        open={view !== null}
        onOpenChange={(open) => {
          if (!open) setView(null);
        }}
      >
        <DialogContent
          title={`${singular[resource]} details`}
          description="View record details."
        >
          {details.isPending ? (
            <LoadingState />
          ) : details.error ? (
            <ErrorState
              description={details.error.message}
              onRetry={() => void details.refetch()}
            />
          ) : (
            details.data && (
              <dl className="space-y-4">
                {Object.entries(
                  presentRecord(
                    resource,
                    details.data,
                    refs,
                    policy.directoryOnly,
                  ),
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )
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
          title={
            resource === "inquiries"
              ? "Resolve Inquiry"
              : `${editor?.row ? "Edit" : "Add"} ${singular[resource]}`
          }
          description={
            restrictions[resource] ??
            "Review and confirm your changes before saving."
          }
          onEscapeKeyDown={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (mutation.isPending) event.preventDefault();
          }}
        >
          {form && (
            <EntityForm
              key={editor?.row ? recordId(editor.row) : "new"}
              {...form}
              confirmation={
                resource === "users"
                  ? "Confirm this account change. Changes to your own role or status may change your access or sign you out."
                  : resource === "inquiries"
                    ? "Resolve this inquiry with the supplied note? This cannot reopen the inquiry or change its grade."
                    : "Save these changes?"
              }
              onSave={save}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
