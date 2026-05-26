import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/nav"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Nav user={session.user} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
      <footer className="border-t bg-white/60 backdrop-blur-sm mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} <span className="font-medium text-foreground">BEEhivelab</span>, School of Engineering — Lebanese International University</span>
          <span className="hidden sm:block">All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
