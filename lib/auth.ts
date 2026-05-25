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
    async jwt({ token, user, trigger }) {
      if (user) {
        // Ensure bootstrap email always gets SUPERADMIN (handles race with createUser event)
        if (process.env.ADMIN_BOOTSTRAP_EMAIL && user.email === process.env.ADMIN_BOOTSTRAP_EMAIL) {
          await db.user.update({
            where: { id: user.id },
            data: { role: Role.SUPERADMIN },
          })
        }
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

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
})
