import type { NavigationKey } from "@/app/navigation";
import { AdminDashboard } from "./dashboard";
import { ManagementPage } from "./management-page";
export default function AdminPage({ page }: { page: NavigationKey }) {
  if (page === "dashboard") return <AdminDashboard />;
  if (
    ["subjects", "enrollments", "grades", "inquiries", "users"].includes(page)
  )
    return (
      <ManagementPage
        key={page}
        resource={
          page as "subjects" | "enrollments" | "grades" | "inquiries" | "users"
        }
      />
    );
  return null;
}
