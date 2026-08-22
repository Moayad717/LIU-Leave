import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/nav"
import { DailyBriefPopup } from "@/components/daily-brief-popup"
import { canAccessAdmin } from "@/types/enums"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      {canAccessAdmin(session.user.role) && <DailyBriefPopup />}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Lebanese International University — School of Engineering
        </div>
      </footer>
    </div>
  )
}
