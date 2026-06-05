import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProfileForm } from "@/components/profile-form"
import { UserCircle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/auth/signin")

  const [user, campuses, departments] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      include: { campus: true, department: true },
    }),
    db.campus.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ])

  if (!user) redirect("/auth/signin")

  const initials = user.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="w-6 h-6" />
          Profile
        </h1>
        <p className="text-muted-foreground mt-1">Campus &amp; department</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.image ?? ""} alt={user.name ?? ""} />
              <AvatarFallback className="text-base">{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-1 min-w-0">
              <p className="font-semibold truncate">{user.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <Badge variant={user.role === "PROFESSOR" ? "secondary" : "default"} className="text-xs capitalize">
                {user.role.replace(/_/g, " ").toLowerCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <ProfileForm
        campuses={campuses}
        departments={departments}
        currentCampusId={user.campusId ?? ""}
        currentDepartmentId={user.departmentId ?? ""}
      />
    </div>
  )
}
