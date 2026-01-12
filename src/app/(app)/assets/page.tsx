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
import { formatCurrency, formatDate, getDepreciationStatus } from "@/lib/utils"
import { Plus, MoreHorizontal, FileText, Pencil, Trash2, ExternalLink } from "lucide-react"
import { AssetDialog } from "@/components/assets/asset-dialog"
import { useToast } from "@/hooks/use-toast"

interface Asset {
  id: string
  name: string
  description: string | null
  category: string
  purchaseDate: string
  price: number
  currency: string
  depreciationType: string
  depreciationYears: number | null
  depreciationEndDate: string | null
  status: string
  invoice: {
    id: string
    fileName: string
    cloudFileUrl: string | null
  } | null
}

const categoryLabels: Record<string, string> = {
  COMPUTER: "Computer",
  MONITOR: "Monitor",
  PHONE: "Phone",
  CAMERA: "Camera",
  EQUIPMENT: "Equipment",
  FURNITURE: "Furniture",
  SOFTWARE_LICENSE: "Software License",
  VEHICLE: "Vehicle",
  OTHER: "Other",
}

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  FULLY_DEPRECIATED: "warning",
  ARCHIVED: "secondary",
}

export default function AssetsPage() {
  const { currentSpace, isLoading: spaceLoading } = useSpace()
  const [assets, setAssets] = useState<Asset[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null)
  const { toast } = useToast()

  const fetchAssets = useCallback(async () => {
    if (!currentSpace) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/assets?spaceId=${currentSpace.id}`)
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error)
      toast({
        title: "Error",
        description: "Failed to fetch assets",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [currentSpace, toast])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return

    try {
      const response = await fetch(`/api/assets/${id}`, { method: "DELETE" })
      if (response.ok) {
        setAssets(assets.filter((a) => a.id !== id))
        toast({
          title: "Deleted",
          description: "Asset has been deleted",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset)
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingAsset(null)
    setDialogOpen(true)
  }

  const handleDialogClose = (refresh?: boolean) => {
    setDialogOpen(false)
    setEditingAsset(null)
    if (refresh) {
      fetchAssets()
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
        title="Assets"
        description={`Manage assets for ${currentSpace.name}`}
      >
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Asset
        </Button>
      </PageHeader>

      <div className="p-6">
        {assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No assets yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first asset to start tracking.
            </p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Depreciation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => {
                  const depStatus = getDepreciationStatus(
                    asset.depreciationEndDate
                      ? new Date(asset.depreciationEndDate)
                      : null
                  )
                  return (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.name}</TableCell>
                      <TableCell>{categoryLabels[asset.category] || asset.category}</TableCell>
                      <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(asset.price, asset.currency)}
                      </TableCell>
                      <TableCell>
                        {asset.depreciationType === "TAX_DEPRECIATION" ? (
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {asset.depreciationYears} years
                            </span>
                            {asset.depreciationEndDate && (
                              <span className="text-xs text-muted-foreground">
                                until {formatDate(asset.depreciationEndDate)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[asset.status] || "default"}>
                          {asset.status.replace("_", " ").toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.invoice?.cloudFileUrl ? (
                          <a
                            href={asset.invoice.cloudFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(asset)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(asset.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <AssetDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        asset={editingAsset}
        spaceId={currentSpace.id}
      />
    </div>
  )
}
