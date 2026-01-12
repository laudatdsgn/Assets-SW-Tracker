import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, spaces, assets, software, invoices } from "@/lib/db"
import { eq, and, count } from "drizzle-orm"
import { z } from "zod"

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional().nullable(),
  color: z.string().optional(),
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

    const space = await db.query.spaces.findFirst({
      where: and(eq(spaces.id, params.id), eq(spaces.userId, session.user.id)),
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Get counts
    const [assetCount] = await db
      .select({ count: count() })
      .from(assets)
      .where(eq(assets.spaceId, params.id))

    const [softwareCount] = await db
      .select({ count: count() })
      .from(software)
      .where(eq(software.spaceId, params.id))

    const [invoiceCount] = await db
      .select({ count: count() })
      .from(invoices)
      .where(eq(invoices.spaceId, params.id))

    return NextResponse.json({
      ...space,
      _count: {
        assets: assetCount?.count || 0,
        software: softwareCount?.count || 0,
        invoices: invoiceCount?.count || 0,
      },
    })
  } catch (error) {
    console.error("Error fetching space:", error)
    return NextResponse.json(
      { error: "Failed to fetch space" },
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
    const validatedData = updateSpaceSchema.parse(body)

    // Verify ownership
    const existingSpace = await db.query.spaces.findFirst({
      where: and(eq(spaces.id, params.id), eq(spaces.userId, session.user.id)),
    })

    if (!existingSpace) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    await db
      .update(spaces)
      .set({
        ...validatedData,
        updatedAt: new Date(),
      })
      .where(eq(spaces.id, params.id))

    const updatedSpace = await db.query.spaces.findFirst({
      where: eq(spaces.id, params.id),
    })

    return NextResponse.json(updatedSpace)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating space:", error)
    return NextResponse.json(
      { error: "Failed to update space" },
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
    const existingSpace = await db.query.spaces.findFirst({
      where: and(eq(spaces.id, params.id), eq(spaces.userId, session.user.id)),
    })

    if (!existingSpace) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    await db.delete(spaces).where(eq(spaces.id, params.id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting space:", error)
    return NextResponse.json(
      { error: "Failed to delete space" },
      { status: 500 }
    )
  }
}
