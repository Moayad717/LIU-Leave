import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { Role } from "@/types/enums"
import { db } from "./db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.id) return false

      const dbUser = await db.user.findUnique({
        where: { id: user.id },
        select: { blocked: true },
      })
      if (dbUser?.blocked) return "/auth/error?error=AccountBlocked"
      if (!user.email?.endsWith("@liu.edu.lb")) return "/auth/error?error=DomainRestricted"
      return true
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, campusId: true, departmentId: true, blocked: true },
        })
        // Bootstrap: promote to SUPER_ADMIN only if no other SUPER_ADMIN exists yet.
        if (
          process.env.ADMIN_BOOTSTRAP_EMAIL &&
          user.email === process.env.ADMIN_BOOTSTRAP_EMAIL &&
          dbUser?.role !== Role.SUPER_ADMIN
        ) {
          const otherSuperAdmin = await db.user.findFirst({
            where: { role: Role.SUPER_ADMIN, id: { not: user.id! } },
            select: { id: true },
          })
          if (!otherSuperAdmin) {
            await db.user.update({ where: { id: user.id }, data: { role: Role.SUPER_ADMIN } })
            if (dbUser) dbUser.role = Role.SUPER_ADMIN
          }
        }
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.campusId = dbUser.campusId
          token.departmentId = dbUser.departmentId
          token.blocked = dbUser.blocked
          token.lastRefreshed = Date.now()
        }
      }

      const shouldRefresh =
        trigger === "update" ||
        !token.lastRefreshed ||
        Date.now() - (token.lastRefreshed as number) > 15 * 60 * 1000

      if (shouldRefresh && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, campusId: true, departmentId: true, blocked: true },
        })
        if (!dbUser) return null  // account deleted — invalidate session immediately
        token.role = dbUser.role
        token.campusId = dbUser.campusId
        token.departmentId = dbUser.departmentId
        token.blocked = dbUser.blocked
        token.lastRefreshed = Date.now()
      }

      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.campusId = (token.campusId as string | null) ?? null
      session.user.departmentId = (token.departmentId as string | null) ?? null
      session.user.blocked = (token.blocked as boolean | undefined) ?? false
      return session
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})
