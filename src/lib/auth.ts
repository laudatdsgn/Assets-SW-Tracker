import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { randomUUID } from "crypto"

export const authOptions: NextAuthOptions = {
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
          console.error("No email provided")
          return null
        }

        console.log("Attempting to authenticate:", credentials.email)

        try {
          // Dynamic import to avoid issues with database initialization
          const { db, users, spaces, userSettings } = await import("@/lib/db")
          const { eq } = await import("drizzle-orm")

          // Check if user exists
          console.log("Checking for existing user...")
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, credentials.email),
          })

          if (existingUser) {
            console.log("User found:", existingUser.id)
            return {
              id: existingUser.id,
              email: existingUser.email,
              name: existingUser.name,
            }
          }

          // Create new user
          console.log("Creating new user...")
          const userId = randomUUID()

          await db.insert(users).values({
            id: userId,
            email: credentials.email,
            name: credentials.email.split("@")[0],
          })
          console.log("User created:", userId)

          // Create default spaces
          console.log("Creating default spaces...")
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
          console.log("Creating default settings...")
          await db.insert(userSettings).values({
            id: randomUUID(),
            userId: userId,
            defaultCurrency: "CZK",
            scanFrequency: 60,
          })

          console.log("User setup complete")
          return {
            id: userId,
            email: credentials.email,
            name: credentials.email.split("@")[0],
          }
        } catch (error) {
          console.error("=== AUTH ERROR ===")
          console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error)
          console.error("Error message:", error instanceof Error ? error.message : String(error))
          console.error("Full error:", error)
          console.error("==================")
          return null
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
  debug: true,
}
