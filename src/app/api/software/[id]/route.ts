import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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

    const software = await prisma.software.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
      include: {
        invoices: {
          select: {
            id: true,
            fileName: true,
            cloudFileUrl: true,
            supplierName: true,
            totalPrice: true,
            issueDate: true,
          },
          orderBy: { createdAt: "desc" },
        },
        space: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!software) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    return NextResponse.json(software)
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
    const existingSoftware = await prisma.software.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
    })

    if (!existingSoftware) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    const software = await prisma.software.update({
      where: { id: params.id },
      data: validatedData,
    })

    return NextResponse.json(software)
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
    const existingSoftware = await prisma.software.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
    })

    if (!existingSoftware) {
      return NextResponse.json({ error: "Software not found" }, { status: 404 })
    }

    await prisma.software.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting software:", error)
    return NextResponse.json(
      { error: "Failed to delete software" },
      { status: 500 }
    )
  }
}
