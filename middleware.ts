import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"
import { canAccessAdmin } from "@/types/enums"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user

  const isApiAuth = nextUrl.pathname.startsWith("/api/auth")
  const isAuthPage = nextUrl.pathname.startsWith("/auth")

  if (isApiAuth) return NextResponse.next()

  // Redirect blocked users everywhere except the error page (avoid redirect loop)
  if (isLoggedIn && session!.user.blocked && !nextUrl.pathname.startsWith("/auth/error")) {
    return NextResponse.redirect(new URL("/auth/error?error=AccountBlocked", nextUrl))
  }

  if (isAuthPage) {
    // Blocked users must stay on the error page so they can sign out and re-authenticate
    if (isLoggedIn && !session!.user.blocked) return NextResponse.redirect(new URL("/dashboard", nextUrl))
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }

  const user = session!.user
  const userCanAdmin = canAccessAdmin(user.role)
  const hasOnboarded = !!user.campusId

  if (!hasOnboarded && nextUrl.pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", nextUrl))
  }

  if (hasOnboarded && nextUrl.pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  if (nextUrl.pathname.startsWith("/admin") && !userCanAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
}
