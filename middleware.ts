import NextAuth from "next-auth"
import { authConfig } from "@/auth.config"
import { NextResponse } from "next/server"

const { auth } = NextAuth(authConfig)

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth
  const isLoggedIn = !!session?.user

  const isApiAuth = nextUrl.pathname.startsWith("/api/auth")
  const isAuthPage = nextUrl.pathname.startsWith("/auth")

  if (isApiAuth) return NextResponse.next()

  if (isAuthPage) {
    if (isLoggedIn) return NextResponse.redirect(new URL("/dashboard", nextUrl))
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", nextUrl))
  }

  // session.user is guaranteed non-null here
  const user = session!.user
  const isAdmin = user.role === "ADMIN"
  const hasOnboarded = !!user.campusId

  if (!hasOnboarded && nextUrl.pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", nextUrl))
  }

  if (hasOnboarded && nextUrl.pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  if (nextUrl.pathname.startsWith("/admin") && !isAdmin) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
}
