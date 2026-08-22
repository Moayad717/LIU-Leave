import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canAccessAdmin, canManageUsers, type Role } from "@/types/enums"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { UsersTable } from "@/components/users-table"
import { Users, Download } from "lucide-react"

export default async function UsersPage() {
  const session = await auth()
  if (!session || !canAccessAdmin(session.user.role)) redirect("/dashboard")

  const [users, campuses, departments] = await Promise.all([
    db.user.findMany({
      include: { campus: true, department: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.campus.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage roles and campus assignments.</p>
        </div>
        {canManageUsers(session.user.role) && (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <a href="/api/admin/users-export" download>
              <Download className="w-4 h-4" />
              Export Users
            </a>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Registered Users
          </CardTitle>
          <CardDescription>{users.length} users total</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <UsersTable
            users={users}
            currentUserId={session.user.id}
            currentUserRole={session.user.role as Role}
            campuses={campuses}
            departments={departments}
          />
        </CardContent>
      </Card>
    </div>
  )
}
