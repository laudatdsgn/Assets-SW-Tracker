import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, spaces } from "@/lib/db"
import { eq, asc } from "drizzle-orm"
import { z } from "zod"
import { randomUUID } from "crypto"

const createSpaceSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userSpaces = await db.query.spaces.findMany({
      where: eq(spaces.userId, session.user.id),
      orderBy: [asc(spaces.createdAt)],
    })

    return NextResponse.json(userSpaces)
  } catch (error) {
    console.error("Error fetching spaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch spaces" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createSpaceSchema.parse(body)

    const newSpace = {
      id: randomUUID(),
      name: validatedData.name,
      description: validatedData.description || null,
      color: validatedData.color || "#6366f1",
      userId: session.user.id,
    }

    await db.insert(spaces).values(newSpace)

    return NextResponse.json(newSpace, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating space:", error)
    return NextResponse.json(
      { error: "Failed to create space" },
      { status: 500 }
    )
  }
}
