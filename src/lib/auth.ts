import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db, users, spaces, userSettings } from "@/lib/db"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

export const authOptions: NextAuthOptions = {
  // Note: Not using adapter with CredentialsProvider to avoid session conflicts
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Email is required")
        }

        try {
          // Check if user exists
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, credentials.email),
          })

          if (existingUser) {
            return {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
            }
          }

          // Create new user
          const userId = randomUUID()
          await db.insert(users).values({
            id: userId,
            email: credentials.email,
            name: credentials.email.split("@")[0],
          })

          // Create default spaces
          await db.insert(spaces).values([
            {
              id: randomUUID(),
              name: "OSVČ",
              description: "Sole trader (freelance) business",
              color: "#6366f1",
              userId: userId,
            },
            {
              id: randomUUID(),
              name: "s.r.o.",
              description: "Limited company",
              color: "#8b5cf6",
              userId: userId,
            },
          ])

          // Create default settings
          await db.insert(userSettings).values({
            id: randomUUID(),
            userId: userId,
            defaultCurrency: "CZK",
            scanFrequency: 60,
          })

          return {
            id: userId,
            email: credentials.email,
            name: credentials.email.split("@")[0],
          }
        } catch (error) {
          console.error("Auth error:", error)
          throw new Error("Authentication failed")
        }
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === "development",
}
