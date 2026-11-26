import { useAuth } from "@/auth/auth-provider";
import { PageHeader } from "@/components/layout/headers";
import { Avatar, Card } from "@/components/ui/display";
import { StatusBadge } from "@/components/shared/status-badge";
import { userInitials } from "@/app/navigation";
export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;
  const name = `${user.firstName} ${user.lastName}`;
  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your verified account information. Contact your administrator if a correction is needed."
      />
      <Card className="max-w-3xl">
        <div className="mb-6 flex min-w-0 items-center gap-4">
          <Avatar
            name={name}
            initials={userInitials(user.firstName, user.lastName)}
            className="size-14 text-lg font-semibold"
          />
          <div className="min-w-0">
            <h2 className="break-words">{name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.role}</p>
          </div>
        </div>
        <dl className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-6 border-t pt-6 sm:grid-cols-2 [&>div]:min-w-0">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Full name
            </dt>
            <dd className="mt-2 text-sm [overflow-wrap:anywhere]">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Email address
            </dt>
            <dd className="mt-2 break-all text-sm">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">Role</dt>
            <dd className="mt-2 text-sm">{user.role}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              Account status
            </dt>
            <dd className="mt-2">
              <StatusBadge status={user.accountStatus} />
            </dd>
          </div>
          {user.createdAt && (
            <div>
              <dt className="text-xs font-medium text-muted-foreground">
                Account created
              </dt>
              <dd className="mt-2 text-sm">
                <time dateTime={user.createdAt}>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "long",
                  }).format(new Date(user.createdAt))}
                </time>
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-7 border-t pt-5 text-xs leading-5 text-muted-foreground">
          This profile is read-only. Account dates use your browser’s local
          timezone.
        </p>
      </Card>
    </>
  );
}
