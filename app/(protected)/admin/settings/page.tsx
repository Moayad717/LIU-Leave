import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canManageUsers } from "@/types/enums"
import { SettingsPanel } from "@/components/settings-panel"
import { Settings } from "lucide-react"

export default async function SettingsPage() {
  const session = await auth()
  if (!session || !canManageUsers(session.user.role)) redirect("/admin")

  const [settings, holidays] = await Promise.all([
    db.appSettings.findUnique({ where: { id: "global" } }),
    db.holiday.findMany({ orderBy: { date: "asc" } }),
  ])

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Control submission availability and holiday dates.
        </p>
      </div>
      <SettingsPanel
        submissionsOpen={settings?.submissionsOpen ?? true}
        holidays={holidays}
        maxLeaveDays={settings?.maxLeaveDays ?? 22}
        campusOverlapThreshold={settings?.campusOverlapThreshold ?? 3}
        deptOverlapEnabled={settings?.deptOverlapEnabled ?? true}
        deptOverlapThreshold={settings?.deptOverlapThreshold ?? 2}
      />
    </div>
  )
}
