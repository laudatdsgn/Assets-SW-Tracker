"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  status: string
}

interface AssetDialogProps {
  open: boolean
  onClose: (refresh?: boolean) => void
  asset: Asset | null
  spaceId: string
}

const categories = [
  { value: "COMPUTER", label: "Computer" },
  { value: "MONITOR", label: "Monitor" },
  { value: "PHONE", label: "Phone" },
  { value: "CAMERA", label: "Camera" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "SOFTWARE_LICENSE", label: "Software License" },
  { value: "VEHICLE", label: "Vehicle" },
  { value: "OTHER", label: "Other" },
]

const currencies = ["CZK", "EUR", "USD"]

const depreciationTypes = [
  { value: "NONE", label: "None" },
  { value: "TAX_DEPRECIATION", label: "Tax Depreciation" },
]

const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "FULLY_DEPRECIATED", label: "Fully Depreciated" },
  { value: "ARCHIVED", label: "Archived" },
]

export function AssetDialog({ open, onClose, asset, spaceId }: AssetDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "OTHER",
    purchaseDate: new Date().toISOString().split("T")[0],
    price: "",
    currency: "CZK",
    depreciationType: "NONE",
    depreciationYears: "",
    status: "ACTIVE",
  })

  useEffect(() => {
    if (asset) {
      setFormData({
        name: asset.name,
        description: asset.description || "",
        category: asset.category,
        purchaseDate: new Date(asset.purchaseDate).toISOString().split("T")[0],
        price: String(asset.price),
        currency: asset.currency,
        depreciationType: asset.depreciationType,
        depreciationYears: asset.depreciationYears ? String(asset.depreciationYears) : "",
        status: asset.status,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        category: "OTHER",
        purchaseDate: new Date().toISOString().split("T")[0],
        price: "",
        currency: "CZK",
        depreciationType: "NONE",
        depreciationYears: "",
        status: "ACTIVE",
      })
    }
  }, [asset, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        purchaseDate: formData.purchaseDate,
        price: parseFloat(formData.price),
        currency: formData.currency,
        depreciationType: formData.depreciationType,
        depreciationYears:
          formData.depreciationType === "TAX_DEPRECIATION" && formData.depreciationYears
            ? parseInt(formData.depreciationYears)
            : null,
        status: formData.status,
        spaceId,
      }

      const url = asset ? `/api/assets/${asset.id}` : "/api/assets"
      const method = asset ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: asset ? "Updated" : "Created",
          description: `Asset has been ${asset ? "updated" : "created"}`,
        })
        onClose(true)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to save asset")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save asset",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit Asset" : "Add New Asset"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((cur) => (
                    <SelectItem key={cur} value={cur}>
                      {cur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="depreciationType">Depreciation Type</Label>
              <Select
                value={formData.depreciationType}
                onValueChange={(value) => setFormData({ ...formData, depreciationType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {depreciationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.depreciationType === "TAX_DEPRECIATION" && (
              <div className="space-y-2">
                <Label htmlFor="depreciationYears">Depreciation Years</Label>
                <Input
                  id="depreciationYears"
                  type="number"
                  min="1"
                  value={formData.depreciationYears}
                  onChange={(e) =>
                    setFormData({ ...formData, depreciationYears: e.target.value })
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onClose()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : asset ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
