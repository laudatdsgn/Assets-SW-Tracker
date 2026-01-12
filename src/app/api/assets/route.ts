import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, assets, spaces, invoices } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { z } from "zod"
import { randomUUID } from "crypto"
import { calculateDepreciationEndDate } from "@/lib/utils"

const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.enum([
    "COMPUTER",
    "MONITOR",
    "PHONE",
    "CAMERA",
    "EQUIPMENT",
    "FURNITURE",
    "SOFTWARE_LICENSE",
    "VEHICLE",
    "OTHER",
  ]),
  purchaseDate: z.string().transform((str) => new Date(str)),
  price: z.number().positive(),
  currency: z.string().default("CZK"),
  depreciationType: z.enum(["NONE", "TAX_DEPRECIATION"]).default("NONE"),
  depreciationYears: z.number().int().positive().optional().nullable(),
  status: z.enum(["ACTIVE", "FULLY_DEPRECIATED", "ARCHIVED"]).default("ACTIVE"),
  spaceId: z.string(),
  invoiceId: z.string().optional().nullable(),
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

    // Build query conditions
    const conditions = []
    if (spaceId) {
      conditions.push(eq(assets.spaceId, spaceId))
    }
    if (status) {
      conditions.push(eq(assets.status, status))
    }

    const userAssets = await db.query.assets.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        space: true,
        invoice: true,
      },
      orderBy: [desc(assets.createdAt)],
    })

    // Filter by user ownership through space
    const filteredAssets = userAssets.filter(
      (asset) => asset.space.userId === session.user.id
    )

    return NextResponse.json(filteredAssets)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json(
      { error: "Failed to fetch assets" },
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
    const validatedData = createAssetSchema.parse(body)

    // Verify space ownership
    const space = await db.query.spaces.findFirst({
      where: and(
        eq(spaces.id, validatedData.spaceId),
        eq(spaces.userId, session.user.id)
      ),
    })
    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // Calculate depreciation end date if applicable
    let depreciationEndDate: Date | null = null
    if (
      validatedData.depreciationType === "TAX_DEPRECIATION" &&
      validatedData.depreciationYears
    ) {
      depreciationEndDate = calculateDepreciationEndDate(
        validatedData.purchaseDate,
        validatedData.depreciationYears
      )
    }

    const newAsset = {
      id: randomUUID(),
      name: validatedData.name,
      description: validatedData.description || null,
      category: validatedData.category,
      purchaseDate: validatedData.purchaseDate,
      price: validatedData.price,
      currency: validatedData.currency,
      depreciationType: validatedData.depreciationType,
      depreciationYears: validatedData.depreciationYears || null,
      depreciationEndDate,
      status: validatedData.status,
      spaceId: validatedData.spaceId,
      invoiceId: validatedData.invoiceId || null,
    }

    await db.insert(assets).values(newAsset)

    return NextResponse.json(newAsset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error creating asset:", error)
    return NextResponse.json(
      { error: "Failed to create asset" },
      { status: 500 }
    )
  }
}
