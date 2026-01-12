"use client"

import { useEffect, useState } from "react"
import { useSpace } from "@/contexts/space-context"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Package,
  AppWindow,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Inbox,
} from "lucide-react"
import Link from "next/link"

interface DashboardData {
  totalAssetValue: number
  yearlySoftwareCost: number
  monthlySoftwareCost: number
  upcomingPayments: Array<{
    id: string
    name: string
    price: number
    currency: string
    nextPaymentDate: string
    billingPeriod: string
  }>
  assetsNearingDepreciation: Array<{
    id: string
    name: string
    depreciationEndDate: string
    price: number
    currency: string
  }>
  unprocessedInvoicesCount: number
  assetCount: number
  softwareCount: number
}

export default function DashboardPage() {
  const { currentSpace, isLoading: spaceLoading } = useSpace()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      if (!currentSpace) return

      setIsLoading(true)
      try {
        const response = await fetch(
          `/api/dashboard?spaceId=${currentSpace.id}`
        )
        if (response.ok) {
          const dashboardData = await response.json()
          setData(dashboardData)
        }
      } catch (error) {
        console.error("Failed to fetch dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [currentSpace])

  if (spaceLoading || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!currentSpace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">No space selected</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${currentSpace.name}`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Asset Value
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.totalAssetValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {data?.assetCount || 0} active assets
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yearly Software Cost
              </CardTitle>
              <AppWindow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.yearlySoftwareCost || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(data?.monthlySoftwareCost || 0)} / month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Subscriptions
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.softwareCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active software & services
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Unprocessed Invoices
              </CardTitle>
              <Inbox className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data?.unprocessedInvoicesCount || 0}
              </div>
              <Link
                href="/inbox"
                className="text-xs text-primary hover:underline"
              >
                Go to inbox
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Payments & Depreciation */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Upcoming Payments (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.upcomingPayments && data.upcomingPayments.length > 0 ? (
                <div className="space-y-3">
                  {data.upcomingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{payment.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.nextPaymentDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(payment.price, payment.currency)}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {payment.billingPeriod.toLowerCase()}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No upcoming payments in the next 30 days
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4" />
                Assets Nearing Depreciation End
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data?.assetsNearingDepreciation &&
              data.assetsNearingDepreciation.length > 0 ? (
                <div className="space-y-3">
                  {data.assetsNearingDepreciation.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Ends {formatDate(asset.depreciationEndDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(asset.price, asset.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No assets nearing depreciation end
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
