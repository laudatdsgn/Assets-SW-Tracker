import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { calculateDepreciationEndDate } from "@/lib/utils"

const updateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  category: z
    .enum([
      "COMPUTER",
      "MONITOR",
      "PHONE",
      "CAMERA",
      "EQUIPMENT",
      "FURNITURE",
      "SOFTWARE_LICENSE",
      "VEHICLE",
      "OTHER",
    ])
    .optional(),
  purchaseDate: z
    .string()
    .transform((str) => new Date(str))
    .optional(),
  price: z.number().positive().optional(),
  currency: z.string().optional(),
  depreciationType: z.enum(["NONE", "TAX_DEPRECIATION"]).optional(),
  depreciationYears: z.number().int().positive().optional().nullable(),
  status: z.enum(["ACTIVE", "FULLY_DEPRECIATED", "ARCHIVED"]).optional(),
  invoiceId: z.string().optional().nullable(),
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

    const asset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
      include: {
        invoice: {
          select: {
            id: true,
            fileName: true,
            cloudFileUrl: true,
            supplierName: true,
          },
        },
        space: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
    return NextResponse.json(
      { error: "Failed to fetch asset" },
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
    const validatedData = updateAssetSchema.parse(body)

    // Verify ownership
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
    })

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Calculate new depreciation end date if needed
    let depreciationEndDate = existingAsset.depreciationEndDate
    const purchaseDate = validatedData.purchaseDate || existingAsset.purchaseDate
    const depreciationType =
      validatedData.depreciationType || existingAsset.depreciationType
    const depreciationYears =
      validatedData.depreciationYears !== undefined
        ? validatedData.depreciationYears
        : existingAsset.depreciationYears

    if (
      depreciationType === "TAX_DEPRECIATION" &&
      depreciationYears &&
      (validatedData.purchaseDate || validatedData.depreciationYears)
    ) {
      depreciationEndDate = calculateDepreciationEndDate(
        purchaseDate,
        depreciationYears
      )
    } else if (depreciationType === "NONE") {
      depreciationEndDate = null
    }

    const asset = await prisma.asset.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        depreciationEndDate,
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

    return NextResponse.json(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating asset:", error)
    return NextResponse.json(
      { error: "Failed to update asset" },
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
    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: params.id,
        space: {
          userId: session.user.id,
        },
      },
    })

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    await prisma.asset.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json(
      { error: "Failed to delete asset" },
      { status: 500 }
    )
  }
}
