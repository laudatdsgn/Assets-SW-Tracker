import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, invoices, cloudStorages, spaces } from "@/lib/db"
import { eq, and, or, isNull, desc, inArray } from "drizzle-orm"
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

    // Get user's cloud storage IDs
    const userCloudStorages = await db.query.cloudStorages.findMany({
      where: eq(cloudStorages.userId, session.user.id),
      columns: { id: true },
    })
    const userCloudStorageIds = userCloudStorages.map(cs => cs.id)

    // Get user's space IDs
    const userSpaces = await db.query.spaces.findMany({
      where: eq(spaces.userId, session.user.id),
      columns: { id: true },
    })
    const userSpaceIds = userSpaces.map(s => s.id)

    // Build base filter: invoices from user's cloud storage
    let whereConditions = inArray(invoices.cloudStorageId, userCloudStorageIds)

    // Add status filter if provided
    if (status) {
      whereConditions = and(whereConditions, eq(invoices.status, status as any))!
    }

    // Add spaceId filter if provided
    if (spaceId) {
      whereConditions = and(whereConditions, eq(invoices.spaceId, spaceId))!
    }

    const invoiceList = await db.query.invoices.findMany({
      where: whereConditions,
      with: {
        space: true,
        cloudStorage: true,
      },
      orderBy: desc(invoices.createdAt),
    })

    // Filter to only include invoices with null spaceId or spaceId owned by user
    const filteredInvoices = invoiceList.filter(inv =>
      inv.spaceId === null || userSpaceIds.includes(inv.spaceId)
    )

    return NextResponse.json(filteredInvoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    )
  }
}
