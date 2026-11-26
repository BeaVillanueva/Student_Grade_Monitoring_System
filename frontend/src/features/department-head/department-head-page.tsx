import type { NavigationKey } from "@/app/navigation";
import { WorkspaceDashboard } from "../shared/workspace-dashboard";
import { ManagementPage } from "../shared/management-page";
export default function DepartmentHeadPage({ page }: { page: NavigationKey }) {
  if (page === "dashboard")
    return <WorkspaceDashboard role="Department Head" />;
  if (
    ["subjects", "enrollments", "grades", "inquiries", "users"].includes(page)
  )
    return (
      <ManagementPage
        key={page}
        role="Department Head"
        resource={
          page as "subjects" | "enrollments" | "grades" | "inquiries" | "users"
        }
      />
    );
  return null;
}
