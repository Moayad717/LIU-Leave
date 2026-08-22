import Link from "next/link"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { LayoutDashboard, GraduationCap, ArrowRight } from "lucide-react"

interface Props {
  name: string
}

export function AdminRolePicker({ name }: Props) {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back, {name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">How would you like to continue?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin" className="group">
          <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-500 text-white shadow-sm">
                  <LayoutDashboard className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <CardTitle className="text-base mb-1">Admin Panel</CardTitle>
              <CardDescription className="text-sm leading-snug">
                Review submissions, manage users, and configure settings.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard?as=professor" className="group">
          <Card className="h-full cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500 text-white shadow-sm">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
              <CardTitle className="text-base mb-1">Professor View</CardTitle>
              <CardDescription className="text-sm leading-snug">
                Submit or manage your own leave request for this academic year.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
