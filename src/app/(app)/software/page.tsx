"use client"

import { useEffect, useState, useCallback } from "react"
import { useSpace } from "@/contexts/space-context"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  formatCurrency,
  formatDate,
  calculateMonthlyEquivalent,
  calculateYearlyTotal,
} from "@/lib/utils"
import {
  Plus,
  MoreHorizontal,
  AppWindow,
  Pencil,
  Trash2,
  ExternalLink,
  Globe,
} from "lucide-react"
import { SoftwareDialog } from "@/components/software/software-dialog"
import { useToast } from "@/hooks/use-toast"

interface Software {
  id: string
  name: string
  description: string | null
  category: string
  url: string | null
  price: number
  currency: string
  billingPeriod: "MONTHLY" | "YEARLY" | "ONE_TIME"
  startDate: string
  nextPaymentDate: string | null
  status: string
  invoices: Array<{
    id: string
    fileName: string
    cloudFileUrl: string | null
  }>
}

const categoryLabels: Record<string, string> = {
  SAAS: "SaaS",
  HOSTING: "Hosting",
  DOMAIN: "Domain",
  AI_TOOLS: "AI Tools",
  DEVELOPMENT: "Development",
  DESIGN: "Design",
  PRODUCTIVITY: "Productivity",
  COMMUNICATION: "Communication",
  STORAGE: "Storage",
  SECURITY: "Security",
  OTHER: "Other",
}

const billingLabels: Record<string, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  ONE_TIME: "One-time",
}

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  CANCELLED: "destructive",
  ARCHIVED: "secondary",
}

export default function SoftwarePage() {
  const { currentSpace, isLoading: spaceLoading } = useSpace()
  const [software, setSoftware] = useState<Software[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSoftware, setEditingSoftware] = useState<Software | null>(null)
  const { toast } = useToast()

  const fetchSoftware = useCallback(async () => {
    if (!currentSpace) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/software?spaceId=${currentSpace.id}`)
      if (response.ok) {
        const data = await response.json()
        setSoftware(data)
      }
    } catch (error) {
      console.error("Failed to fetch software:", error)
      toast({
        title: "Error",
        description: "Failed to fetch software",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentSpace, toast])

  useEffect(() => {
    fetchSoftware()
  }, [fetchSoftware])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this software?")) return

    try {
      const response = await fetch(`/api/software/${id}`, { method: "DELETE" })
      if (response.ok) {
        setSoftware(software.filter((s) => s.id !== id))
        toast({
          title: "Deleted",
          description: "Software has been deleted",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete software",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (sw: Software) => {
    setEditingSoftware(sw)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingSoftware(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false)
    setEditingSoftware(null)
    if (refresh) {
      fetchSoftware()
    }
  }

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
        title="Software"
        description={`Manage software & subscriptions for ${currentSpace.name}`}
      >
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Software
        </Button>
      </PageHeader>

      <div className="p-6">
        {software.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AppWindow className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No software yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first software or subscription to start tracking.
            </p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Software
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead>Next Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {software.map((sw) => (
                  <TableRow key={sw.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sw.name}</span>
                        {sw.url && (
                          <a
                            href={sw.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Globe className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{categoryLabels[sw.category] || sw.category}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(sw.price, sw.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {billingLabels[sw.billingPeriod]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {sw.billingPeriod !== "ONE_TIME" ? (
                        formatCurrency(
                          calculateMonthlyEquivalent(sw.price, sw.billingPeriod),
                          sw.currency
                        )
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {sw.nextPaymentDate ? (
                        formatDate(sw.nextPaymentDate)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[sw.status] || "default"}>
                        {sw.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(sw)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          {sw.invoices[0]?.cloudFileUrl && (
                            <DropdownMenuItem asChild>
                              <a
                                href={sw.invoices[0].cloudFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                View Invoice
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(sw.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SoftwareDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        software={editingSoftware}
        spaceId={currentSpace.id}
      />
    </div>
  )
}
