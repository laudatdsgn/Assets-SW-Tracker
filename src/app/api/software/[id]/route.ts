import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, software } from "@/lib/db"
import { eq } from "drizzle-orm"
import { z } from "zod"

const updateSoftwareSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z
    .enum([
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
    ])
    .optional(),
  url: z.string().url().optional().nullable(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  billingPeriod: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]).optional(),
  startDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  nextPaymentDate: z
    .string()
    .transform((str) => new Date(str))
    .optional()
    .nullable(),
  status: z.enum(["ACTIVE", "CANCELLED", "ARCHIVED"]).optional(),
  primaryInvoiceId: z.string().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sw = await db.query.software.findFirst({
      where: eq(software.id, params.id),
      with: {
        space: true,
      },
    })

    if (!sw) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    // Verify ownership through space
    if (sw.space.userId !== session.user.id) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    return NextResponse.json(sw)
  } catch (error) {
    console.error("Error fetching software:", error)
    return NextResponse.json(
      { error: "Failed to fetch software" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSoftwareSchema.parse(body)

    // Verify ownership
    const existingSoftware = await db.query.software.findFirst({
      where: eq(software.id, params.id),
      with: {
        space: true,
      },
    })

    if (!existingSoftware || existingSoftware.space.userId !== session.user.id) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    await db.update(software).set({
      ...validatedData,
      updatedAt: new Date(),
    }).where(eq(software.id, params.id))

    const sw = await db.query.software.findFirst({
      where: eq(software.id, params.id),
    })

    return NextResponse.json(sw)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating software:", error)
    return NextResponse.json(
      { error: "Failed to update software" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify ownership
    const existingSoftware = await db.query.software.findFirst({
      where: eq(software.id, params.id),
      with: {
        space: true,
      },
    })

    if (!existingSoftware || existingSoftware.space.userId !== session.user.id) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    await db.delete(software).where(eq(software.id, params.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting software:", error)
    return NextResponse.json(
      { error: "Failed to delete software" },
      { status: 500 }
    )
  }
}
