import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateInvoiceSchema = z.object({
  supplierName: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  issueDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  taxableSupplyDate: z.string().transform((str) => new Date(str)).optional().nullable(),
  totalPrice: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  hasVat: z.boolean().optional().nullable(),
  status: z.enum(["NEW", "PROCESSING", "PROCESSED", "IGNORED", "ERROR"]).optional(),
  spaceId: z.string().optional().nullable(),
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

    const invoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        cloudStorage: { userId: session.user.id },
      },
      include: {
        space: {
          select: {
            id: true,
            name: true,
          },
        },
        cloudStorage: {
          select: {
            id: true,
            name: true,
            provider: true,
          },
        },
        assets: {
          select: {
            id: true,
            name: true,
          },
        },
        software: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error fetching invoice:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
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
    const validatedData = updateInvoiceSchema.parse(body)

    // Verify ownership
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        cloudStorage: { userId: session.user.id },
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    // If setting a spaceId, verify ownership
    if (validatedData.spaceId) {
      const space = await prisma.space.findFirst({
        where: { id: validatedData.spaceId, userId: session.user.id },
      })
      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 })
      }
    }

    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        processedAt: validatedData.status === "PROCESSED" ? new Date() : undefined,
      },
    })

    return NextResponse.json(invoice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating invoice:", error)
    return NextResponse.json(
      { error: "Failed to update invoice" },
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
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        id: params.id,
        cloudStorage: { userId: session.user.id },
      },
    })

    if (!existingInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    await prisma.invoice.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice:", error)
    return NextResponse.json(
      { error: "Failed to delete invoice" },
      { status: 500 }
    )
  }
}
