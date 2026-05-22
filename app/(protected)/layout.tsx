import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Nav } from "@/components/nav"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  return (
    <div className="min-h-screen bg-muted/30">
      <Nav user={session.user} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  )
}
