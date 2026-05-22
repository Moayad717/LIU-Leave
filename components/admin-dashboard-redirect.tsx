import Link from "next/link"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { ClipboardList, BarChart3, Users, Settings, ArrowRight } from "lucide-react"

export function AdminDashboard() {
  const cards = [
    {
      href: "/admin/submissions",
      icon: ClipboardList,
      title: "Submissions",
      description: "Review and process professor leave requests.",
      color: "bg-blue-500",
    },
    {
      href: "/admin/stats",
      icon: BarChart3,
      title: "Statistics",
      description: "Calendar heatmap, campus breakdowns, and overlap alerts.",
      color: "bg-violet-500",
    },
    {
      href: "/admin/users",
      icon: Users,
      title: "Users",
      description: "Manage roles and campus assignments.",
      color: "bg-emerald-500",
    },
    {
      href: "/admin/settings",
      icon: Settings,
      title: "Settings",
      description: "Control submission availability and holiday dates.",
      color: "bg-amber-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 px-6 py-5">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-0.5">
          Manage leave requests and monitor campus availability.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ href, icon: Icon, title, description, color }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${color} text-white shadow-sm`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <CardTitle className="text-base mb-1">{title}</CardTitle>
                <CardDescription className="text-sm leading-snug">{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
