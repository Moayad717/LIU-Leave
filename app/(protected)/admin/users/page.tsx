import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { isAdmin, type Role } from "@/types/enums"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UsersTable } from "@/components/users-table"
import { Users } from "lucide-react"

export default async function UsersPage() {
  const session = await auth()
  if (!session || !isAdmin(session.user.role)) redirect("/dashboard")

  const users = await db.user.findMany({
    include: { campus: true, department: true },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage roles and campus assignments.</p>
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
          <UsersTable users={users} currentUserId={session.user.id} currentUserRole={session.user.role as Role} />
        </CardContent>
      </Card>
    </div>
  )
}
