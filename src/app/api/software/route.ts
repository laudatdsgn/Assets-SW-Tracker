import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, software, spaces } from "@/lib/db"
import { eq, and, desc, inArray } from "drizzle-orm"
import { z } from "zod"
import { randomUUID } from "crypto"

const createSoftwareSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum([
    "SAAS",
    "HOSTING",
    "DOMAIN",
    "AI_TOOLS",
    "DEVELOPMENT",
    "DESIGN",
    "PRODUCTIVITY",
    "COMMUNICATION",
    "STORAGE",
    "SECURITY",
    "OTHER",
  ]),
  url: z.string().url().optional().nullable(),
  price: z.number().positive(),
  currency: z.string().default("CZK"),
  billingPeriod: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  startDate: z.string().transform((str) => new Date(str)),
  nextPaymentDate: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .nullable(),
  status: z.enum(["ACTIVE", "CANCELLED", "ARCHIVED"]).default("ACTIVE"),
  spaceId: z.string(),
  primaryInvoiceId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get("spaceId")
    const status = searchParams.get("status")

    // Verify space ownership
    if (spaceId) {
      const space = await db.query.spaces.findFirst({
        where: and(eq(spaces.id, spaceId), eq(spaces.userId, session.user.id)),
      })
      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 })
      }
    }

    // Get user's space IDs for filtering
    const userSpaces = await db.query.spaces.findMany({
      where: eq(spaces.userId, session.user.id),
      columns: { id: true },
    })
    const userSpaceIds = userSpaces.map(s => s.id)

    // Build filter conditions
    let whereConditions = inArray(software.spaceId, userSpaceIds)

    if (spaceId) {
      whereConditions = eq(software.spaceId, spaceId)
    }

    if (status) {
      whereConditions = and(whereConditions, eq(software.status, status as any))!
    }

    const softwareList = await db.query.software.findMany({
      where: whereConditions,
      with: {
        space: true,
      },
      orderBy: desc(software.createdAt),
    })

    return NextResponse.json(softwareList)
  } catch (error) {
    console.error("Error fetching software:", error)
    return NextResponse.json(
      { error: "Failed to fetch software" },
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
    const validatedData = createSoftwareSchema.parse(body)

    // Verify space ownership
    const space = await db.query.spaces.findFirst({
      where: and(eq(spaces.id, validatedData.spaceId), eq(spaces.userId, session.user.id)),
    })
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Calculate next payment date if not provided
    let nextPaymentDate = validatedData.nextPaymentDate
    if (!nextPaymentDate && validatedData.billingPeriod !== "ONE_TIME") {
      nextPaymentDate = new Date(validatedData.startDate)
      if (validatedData.billingPeriod === "MONTHLY") {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1)
      } else {
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1)
      }
    }

    const [sw] = await db.insert(software).values({
      id: randomUUID(),
      name: validatedData.name,
      description: validatedData.description,
      category: validatedData.category,
      url: validatedData.url,
      price: validatedData.price,
      currency: validatedData.currency,
      billingPeriod: validatedData.billingPeriod,
      startDate: validatedData.startDate,
      nextPaymentDate,
      status: validatedData.status,
      spaceId: validatedData.spaceId,
    }).returning()

    return NextResponse.json(sw, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating software:", error)
    return NextResponse.json(
      { error: "Failed to create software" },
      { status: 500 }
    )
  }
}
