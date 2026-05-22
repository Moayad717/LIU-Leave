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
      // TODO: re-enable for production
      // if (!user.email?.endsWith("@liu.edu.lb")) {
      //   return "/auth/error?error=DomainRestricted"
      // }
      return true
    },

    async jwt({ token, user, trigger }) {
      // On first sign-in, hydrate token from DB user
      if (user) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { id: true, role: true, campusId: true },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.campusId = dbUser.campusId
          token.lastRefreshed = Date.now()
        }
      }

      // Refresh stale token data (every 15 min) or when explicitly updated
      const shouldRefresh =
        trigger === "update" ||
        !token.lastRefreshed ||
        Date.now() - (token.lastRefreshed as number) > 15 * 60 * 1000

      if (shouldRefresh && token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, campusId: true },
        })
        if (dbUser) {
          token.role = dbUser.role
          token.campusId = dbUser.campusId
          token.lastRefreshed = Date.now()
        }
      }

      return token
    },

    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.campusId = (token.campusId as string | null) ?? null
      return session
    },
  },

  events: {
    async createUser({ user }) {
      // Auto-promote bootstrap admin on first login
      if (
        process.env.ADMIN_BOOTSTRAP_EMAIL &&
        user.email === process.env.ADMIN_BOOTSTRAP_EMAIL
      ) {
        await db.user.update({
          where: { id: user.id },
          data: { role: Role.ADMIN },
        })
      }
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})
