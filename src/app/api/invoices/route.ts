import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateInvoiceSchema = z.object({
  supplierName: z.string().optional(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().transform((str) => new Date(str)).optional(),
  taxableSupplyDate: z.string().transform((str) => new Date(str)).optional(),
  totalPrice: z.number().optional(),
  currency: z.string().optional(),
  hasVat: z.boolean().optional(),
  status: z.enum(["NEW", "PROCESSING", "PROCESSED", "IGNORED", "ERROR"]).optional(),
  spaceId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const spaceId = searchParams.get("spaceId")

    const invoices = await prisma.invoice.findMany({
      where: {
        OR: [
          { spaceId: null },
          { space: { userId: session.user.id } },
        ],
        cloudStorage: { userId: session.user.id },
        ...(status && { status: status as any }),
        ...(spaceId && { spaceId }),
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
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}
