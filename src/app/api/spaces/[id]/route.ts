import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSpaceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().optional(),
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

    const space = await prisma.space.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        _count: {
          select: {
            assets: true,
            software: true,
            invoices: true,
          },
        },
      },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    return NextResponse.json(space)
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
    const existingSpace = await prisma.space.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingSpace) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    const space = await prisma.space.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json(space)
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
    const existingSpace = await prisma.space.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingSpace) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    await prisma.space.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting space:", error)
    return NextResponse.json(
      { error: "Failed to delete space" },
      { status: 500 }
    )
  }
}
