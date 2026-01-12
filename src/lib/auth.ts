import { NextAuthOptions } from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db, users, spaces, userSettings } from "@/lib/db"
import { eq } from "drizzle-orm"
import { randomUUID } from "crypto"

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db) as any,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  providers: [
    // Credentials provider for easy development login
    CredentialsProvider({
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "test@example.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

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

        // Create new user for development
        const userId = randomUUID()
        await db.insert(users).values({
          id: userId,
          email: credentials.email,
          name: credentials.email.split("@")[0],
        })

        // Create default spaces
        const spaceId1 = randomUUID()
        const spaceId2 = randomUUID()
        await db.insert(spaces).values([
          {
            id: spaceId1,
            name: "OSVČ",
            description: "Sole trader (freelance) business",
            color: "#6366f1",
            userId: userId,
          },
          {
            id: spaceId2,
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
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  events: {
    async createUser({ user }) {
      // Create default spaces for new users (OAuth login)
      if (user.id) {
        const existingSpaces = await db.query.spaces.findFirst({
          where: eq(spaces.userId, user.id),
        })

        if (!existingSpaces) {
          await db.insert(spaces).values([
            {
              id: randomUUID(),
              name: "OSVČ",
              description: "Sole trader (freelance) business",
              color: "#6366f1",
              userId: user.id,
            },
            {
              id: randomUUID(),
              name: "s.r.o.",
              description: "Limited company",
              color: "#8b5cf6",
              userId: user.id,
            },
          ])

          await db.insert(userSettings).values({
            id: randomUUID(),
            userId: user.id,
            defaultCurrency: "CZK",
            scanFrequency: 60,
          })
        }
      }
    },
  },
}
