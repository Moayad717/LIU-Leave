import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GraduationCap, ShieldX, AlertTriangle } from "lucide-react"
import { signOut } from "@/lib/auth"

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  DomainRestricted: {
    title: "Access Denied",
    description:
      "Only @liu.edu.lb Google accounts are permitted. Please sign in with your LIU institutional email.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to access this application.",
  },
  AccountBlocked: {
    title: "Account Blocked",
    description:
      "Your account has been suspended. Please contact an administrator for assistance.",
  },
  OAuthSignin: {
    title: "Sign-in Error",
    description: "There was a problem initiating the Google sign-in flow. Please try again.",
  },
  OAuthCallback: {
    title: "Authentication Error",
    description: "There was a problem completing the sign-in. Please try again.",
  },
  Default: {
    title: "Authentication Error",
    description: "An unexpected error occurred. Please try again.",
  },
}

interface Props {
  searchParams: { error?: string }
}

export default function AuthErrorPage({ searchParams }: Props) {
  const errorKey = searchParams.error ?? "Default"
  const error = ERROR_MESSAGES[errorKey] ?? ERROR_MESSAGES.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4 pb-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10">
              <ShieldX className="w-9 h-9 text-destructive" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">{error.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center justify-center gap-1">
              <GraduationCap className="w-4 h-4" />
              LIU Leave System
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error.description}</AlertDescription>
          </Alert>

          {errorKey === "AccountBlocked" ? (
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/auth/signin" })
              }}
            >
              <Button type="submit" className="w-full" variant="outline">
                Sign out and try again
              </Button>
            </form>
          ) : (
            <Button asChild className="w-full" variant="outline">
              <Link href="/auth/signin">Back to Sign In</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
