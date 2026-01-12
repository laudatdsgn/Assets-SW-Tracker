import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, assets, software, invoices, spaces } from "@/lib/db"
import { eq, and, gte, lte, count, inArray } from "drizzle-orm"

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
      const space = await db.query.spaces.findFirst({
        where: and(eq(spaces.id, spaceId), eq(spaces.userId, session.user.id)),
      })
      if (!space) {
        return NextResponse.json({ error: "Space not found" }, { status: 404 })
      }
    }

    // Get user's space IDs for filtering
    const userSpaces = await db.query.spaces.findMany({
      where: eq(spaces.userId, session.user.id),
      columns: { id: true },
    })
    const userSpaceIds = userSpaces.map(s => s.id)

    // Build space filter
    const spaceFilter = spaceId
      ? eq(assets.spaceId, spaceId)
      : inArray(assets.spaceId, userSpaceIds)

    const softwareSpaceFilter = spaceId
      ? eq(software.spaceId, spaceId)
      : inArray(software.spaceId, userSpaceIds)

    // Get total asset value
    const assetsList = await db.query.assets.findMany({
      where: and(spaceFilter, eq(assets.status, "ACTIVE")),
      columns: {
        price: true,
        currency: true,
      },
    })

    const totalAssetValue = assetsList.reduce((sum, asset) => {
      return sum + Number(asset.price)
    }, 0)

    // Get software costs
    const softwareList = await db.query.software.findMany({
      where: and(softwareSpaceFilter, eq(software.status, "ACTIVE")),
      columns: {
        price: true,
        currency: true,
        billingPeriod: true,
        nextPaymentDate: true,
      },
    })

    // Calculate yearly software cost
    const yearlySoftwareCost = softwareList.reduce((sum, sw) => {
      const price = Number(sw.price)
      switch (sw.billingPeriod) {
        case "MONTHLY":
          return sum + price * 12
        case "YEARLY":
          return sum + price
        case "ONE_TIME":
          return sum
        default:
          return sum
      }
    }, 0)

    // Get upcoming payments (next 30 days)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const upcomingPayments = await db.query.software.findMany({
      where: and(
        softwareSpaceFilter,
        eq(software.status, "ACTIVE"),
        gte(software.nextPaymentDate, new Date()),
        lte(software.nextPaymentDate, thirtyDaysFromNow)
      ),
      columns: {
        id: true,
        name: true,
        price: true,
        currency: true,
        nextPaymentDate: true,
        billingPeriod: true,
      },
      orderBy: (software, { asc }) => [asc(software.nextPaymentDate)],
      limit: 10,
    })

    // Get assets nearing depreciation end (next 3 months)
    const threeMonthsFromNow = new Date()
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3)

    const assetsNearingDepreciation = await db.query.assets.findMany({
      where: and(
        spaceFilter,
        eq(assets.status, "ACTIVE"),
        eq(assets.depreciationType, "TAX_DEPRECIATION"),
        gte(assets.depreciationEndDate, new Date()),
        lte(assets.depreciationEndDate, threeMonthsFromNow)
      ),
      columns: {
        id: true,
        name: true,
        depreciationEndDate: true,
        price: true,
        currency: true,
      },
      orderBy: (assets, { asc }) => [asc(assets.depreciationEndDate)],
      limit: 10,
    })

    // Get unprocessed invoices count
    const [unprocessedResult] = await db
      .select({ count: count() })
      .from(invoices)
      .where(
        spaceId
          ? and(eq(invoices.status, "NEW"), eq(invoices.spaceId, spaceId))
          : eq(invoices.status, "NEW")
      )
    const unprocessedInvoicesCount = unprocessedResult?.count || 0

    // Get asset count
    const [assetCountResult] = await db
      .select({ count: count() })
      .from(assets)
      .where(and(spaceFilter, eq(assets.status, "ACTIVE")))
    const assetCount = assetCountResult?.count || 0

    // Get software count
    const [softwareCountResult] = await db
      .select({ count: count() })
      .from(software)
      .where(and(softwareSpaceFilter, eq(software.status, "ACTIVE")))
    const softwareCount = softwareCountResult?.count || 0

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
