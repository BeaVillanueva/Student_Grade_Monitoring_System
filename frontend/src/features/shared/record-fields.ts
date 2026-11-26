import { z } from "zod";
import type {
  Enrollment,
  SafeUser,
  Subject,
  UserResponse,
} from "../../api/contracts.ts";
import { USER_ROLES } from "../../api/contracts.ts";
import {
  createSubjectSchema,
  createEnrollmentSchema,
  replaceEnrollmentSchema,
  createUserSchema,
  updateUserSchema,
  resolveInquirySchema,
} from "../../lib/validation.ts";
import type { FieldDefinition } from "./entity-form.tsx";
import { assignmentUsers, userUpdatePayload } from "./workspace-data.ts";
import {
  managementCapabilities,
  type ManagementRole,
} from "../../auth/policies.ts";
import { ApiError } from "../../api/errors.ts";
export type EditableResource =
  "subjects" | "enrollments" | "users" | "inquiries";
export function recordForm(
  resource: EditableResource,
  existing: Subject | Enrollment | SafeUser | null,
  users: UserResponse[],
  subjects: Subject[],
  role: ManagementRole = "Admin",
) {
  const policy = managementCapabilities(role);
  if (
    (resource === "users" && !policy.canManageUsers) ||
    (resource === "inquiries" && !policy.canResolveInquiries)
  )
    throw new ApiError(
      "forbidden",
      "You do not have permission to perform this action.",
      "protected",
      403,
    );
  const editing = existing !== null;
  const userOptions = (role: "Faculty" | "Student") =>
    assignmentUsers(users, role, policy.directoryOnly).map((user) => ({
      value: user.userId,
      label: `${user.firstName} ${user.lastName} (#${user.userId})`,
    }));
  const number = (name: string, label: string): FieldDefinition => ({
    name,
    label,
    type: "number",
    required: true,
  });
  if (resource === "subjects") {
    const row = existing as Subject | null;
    return {
      schema: createSubjectSchema.refine(
        (value) =>
          assignmentUsers(users, "Faculty", policy.directoryOnly).some(
            (user) => user.userId === value.facultyId,
          ),
        {
          path: ["facultyId"],
          message: policy.directoryOnly
            ? "Choose a Faculty directory entry."
            : "Choose an Active Faculty account.",
        },
      ),
      fields: [
        { name: "subjectCode", label: "Subject code", required: true },
        { name: "subjectName", label: "Subject name", required: true },
        number("units", "Units"),
        {
          name: "facultyId",
          label: "Assigned Faculty",
          type: "select",
          required: true,
          options: userOptions("Faculty"),
          description: policy.directoryOnly
            ? "The directory does not expose account status. The backend validates whether this assignment is allowed."
            : "Only Active Faculty accounts can be assigned.",
        },
      ] as FieldDefinition[],
      defaults: {
        subjectCode: row?.subjectCode ?? "",
        subjectName: row?.subjectName ?? "",
        units: row?.units ?? "",
        facultyId: row?.facultyId ?? "",
      },
    };
  }
  if (resource === "enrollments") {
    const row = existing as Enrollment | null;
    const students = userOptions("Student");
    if (row && !students.some((option) => option.value === row.studentId)) {
      const current = users.find((user) => user.userId === row.studentId);
      students.push({
        value: row.studentId,
        label: `${current ? `${current.firstName} ${current.lastName}` : `Student #${row.studentId}`} (current assignment)`,
      });
    }
    const defaults = {
      studentId: row?.studentId ?? "",
      subjectId: row?.subjectId ?? "",
      semester: row?.semester ?? "",
      schoolYear: row?.schoolYear ?? "",
      status: row?.status ?? "Enrolled",
      ...(!editing ? { dateEnrolled: "" } : {}),
    };
    return {
      schema: (editing ? replaceEnrollmentSchema : createEnrollmentSchema)
        .refine(
          (value) =>
            value.studentId === row?.studentId ||
            assignmentUsers(users, "Student", policy.directoryOnly).some(
              (user) => user.userId === value.studentId,
            ),
          {
            path: ["studentId"],
            message: policy.directoryOnly
              ? "Choose a Student directory entry."
              : "Choose an Active Student account.",
          },
        )
        .refine(
          (value) =>
            subjects.some((subject) => subject.subjectId === value.subjectId),
          { path: ["subjectId"], message: "Choose an available Subject." },
        ),
      fields: [
        {
          name: "studentId",
          label: "Student",
          type: "select",
          required: true,
          options: students,
          description: policy.directoryOnly
            ? "Account status is not available here. The backend validates new assignments; an unchanged historical assignment may be retained."
            : "New assignments require an Active Student. An unchanged historical assignment may be retained.",
        },
        {
          name: "subjectId",
          label: "Subject",
          type: "select",
          required: true,
          options: subjects.map((subject) => ({
            value: subject.subjectId,
            label: `${subject.subjectCode} — ${subject.subjectName}`,
          })),
        },
        { name: "semester", label: "Semester", required: true },
        {
          name: "schoolYear",
          label: "School year",
          description: "YYYY-YYYY with consecutive years.",
          required: true,
        },
        ...(!editing
          ? [
              {
                name: "dateEnrolled",
                label: "Enrollment date",
                type: "date",
                required: true,
              },
            ]
          : []),
        {
          name: "status",
          label: "Enrollment status",
          type: "select",
          required: true,
          options: ["Enrolled", "Dropped", "Completed"].map((value) => ({
            value,
            label: value,
          })),
        },
      ] as FieldDefinition[],
      defaults,
    };
  }
  if (resource === "inquiries")
    return {
      schema: resolveInquirySchema,
      fields: [
        {
          name: "resolutionNote",
          label: "Resolution note",
          type: "textarea",
          required: true,
          description:
            "Explain the resolution. This does not modify the recorded grade.",
        },
      ] as FieldDefinition[],
      defaults: { resolutionNote: "" },
    };
  const row = existing as SafeUser | null;
  return {
    schema: row
      ? z.preprocess(
          (value) => userUpdatePayload(value as Record<string, unknown>, row),
          updateUserSchema,
        )
      : createUserSchema,
    fields: [
      { name: "firstName", label: "First name", required: true },
      { name: "lastName", label: "Last name", required: true },
      { name: "email", label: "Email address", type: "email", required: true },
      {
        name: "password",
        label: row ? "New password (optional)" : "Password",
        type: "password",
        required: !row,
        description: row
          ? "Leave blank to keep the existing password. Existing passwords are never retrieved."
          : "At least 8 characters, up to 72 UTF-8 bytes.",
      },
      {
        name: "role",
        label: "Role",
        type: "select",
        required: true,
        options: USER_ROLES.map((value) => ({ value, label: value })),
      },
      {
        name: "accountStatus",
        label: "Account status",
        type: "select",
        required: true,
        options: ["Active", "Inactive"].map((value) => ({
          value,
          label: value,
        })),
      },
    ] as FieldDefinition[],
    defaults: {
      firstName: row?.firstName ?? "",
      lastName: row?.lastName ?? "",
      email: row?.email ?? "",
      password: "",
      role: row?.role ?? "Student",
      accountStatus: row?.accountStatus ?? "Active",
    },
  };
}
