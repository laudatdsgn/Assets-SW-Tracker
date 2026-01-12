import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get("spaceId")

    // Verify space ownership
    if (spaceId) {
      const space = await prisma.space.findFirst({
        where: { id: spaceId, userId: session.user.id },
      })
      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 })
      }
    }

    const whereClause = spaceId
      ? { spaceId, space: { userId: session.user.id } }
      : { space: { userId: session.user.id } }

    // Get total asset value
    const assets = await prisma.asset.findMany({
      where: { ...whereClause, status: "ACTIVE" },
      select: {
        price: true,
        currency: true,
      },
    })

    const totalAssetValue = assets.reduce((sum, asset) => {
      return sum + Number(asset.price)
    }, 0)

    // Get software costs
    const software = await prisma.software.findMany({
      where: { ...whereClause, status: "ACTIVE" },
      select: {
        price: true,
        currency: true,
        billingPeriod: true,
        nextPaymentDate: true,
      },
    })

    // Calculate yearly software cost
    const yearlySoftwareCost = software.reduce((sum, sw) => {
      const price = Number(sw.price)
      switch (sw.billingPeriod) {
        case "MONTHLY":
          return sum + price * 12
        case "YEARLY":
          return sum + price
        case "ONE_TIME":
          return sum
      }
    }, 0)

    // Get upcoming payments (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingPayments = await prisma.software.findMany({
      where: {
        ...whereClause,
        status: "ACTIVE",
        nextPaymentDate: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        nextPaymentDate: true,
        billingPeriod: true,
      },
      orderBy: { nextPaymentDate: "asc" },
      take: 10,
    })

    // Get assets nearing depreciation end (next 3 months)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

    const assetsNearingDepreciation = await prisma.asset.findMany({
      where: {
        ...whereClause,
        status: "ACTIVE",
        depreciationType: "TAX_DEPRECIATION",
        depreciationEndDate: {
          lte: threeMonthsFromNow,
          gte: new Date(),
        },
      },
      select: {
        id: true,
        name: true,
        depreciationEndDate: true,
        price: true,
        currency: true,
      },
      orderBy: { depreciationEndDate: "asc" },
      take: 10,
    })

    // Get unprocessed invoices count
    const unprocessedInvoicesCount = await prisma.invoice.count({
      where: {
        status: "NEW",
        ...(spaceId ? { spaceId } : {}),
      },
    })

    // Get counts
    const assetCount = await prisma.asset.count({
      where: { ...whereClause, status: "ACTIVE" },
    })

    const softwareCount = await prisma.software.count({
      where: { ...whereClause, status: "ACTIVE" },
    })

    return NextResponse.json({
      totalAssetValue,
      yearlySoftwareCost,
      monthlySoftwareCost: yearlySoftwareCost / 12,
      upcomingPayments,
      assetsNearingDepreciation,
      unprocessedInvoicesCount,
      assetCount,
      softwareCount,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  }
}
