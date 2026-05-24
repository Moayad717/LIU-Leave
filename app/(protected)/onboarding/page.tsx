import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap } from "lucide-react"
import { db } from "@/lib/db"
import { OnboardingForm } from "@/components/onboarding-form"

export default async function OnboardingPage() {
  const [campuses, departments] = await Promise.all([
    db.campus.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ orderBy: { name: "asc" } }),
  ])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-md">
              <GraduationCap className="w-7 h-7" />
            </div>
          </div>
          <div>
            <CardTitle className="text-xl">Welcome to LIU Leave</CardTitle>
            <CardDescription>
              Please select your campus and department to continue.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <OnboardingForm campuses={campuses} departments={departments} />
        </CardContent>
      </Card>
    </div>
  )
}
