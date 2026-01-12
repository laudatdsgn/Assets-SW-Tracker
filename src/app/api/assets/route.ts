import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateDepreciationEndDate } from "@/lib/utils"

const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
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
  depreciationYears: z.number().int().positive().optional(),
  status: z.enum(["ACTIVE", "FULLY_DEPRECIATED", "ARCHIVED"]).default("ACTIVE"),
  spaceId: z.string(),
  invoiceId: z.string().optional(),
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
      const space = await prisma.space.findFirst({
        where: { id: spaceId, userId: session.user.id },
      })
      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 })
      }
    }

    const assets = await prisma.asset.findMany({
      where: {
        space: {
          userId: session.user.id,
        },
        ...(spaceId && { spaceId }),
        ...(status && { status: status as any }),
      },
      include: {
        invoice: {
          select: {
            id: true,
            fileName: true,
            cloudFileUrl: true,
          },
        },
        space: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(assets)
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
    const space = await prisma.space.findFirst({
      where: { id: validatedData.spaceId, userId: session.user.id },
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

    const asset = await prisma.asset.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        category: validatedData.category,
        purchaseDate: validatedData.purchaseDate,
        price: validatedData.price,
        currency: validatedData.currency,
        depreciationType: validatedData.depreciationType,
        depreciationYears: validatedData.depreciationYears,
        depreciationEndDate,
        status: validatedData.status,
        spaceId: validatedData.spaceId,
        invoiceId: validatedData.invoiceId,
      },
      include: {
        invoice: {
          select: {
            id: true,
            fileName: true,
            cloudFileUrl: true,
          },
        },
      },
    })

    return NextResponse.json(asset, { status: 201 })
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
