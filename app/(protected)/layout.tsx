import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/nav"
import { DailyBriefPopup } from "@/components/daily-brief-popup"
import { canAccessAdmin } from "@/types/enums"
import { ExternalLink } from "lucide-react"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Nav user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      {canAccessAdmin(session.user.role) && <DailyBriefPopup />}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Lebanese International University — School of Engineering</span>
          <a
            href="https://liubeehive.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            BEEhivelab
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  )
}
