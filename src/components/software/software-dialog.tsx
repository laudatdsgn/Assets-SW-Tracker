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

interface Software {
  id: string
  name: string
  description: string | null
  category: string
  url: string | null
  price: number
  currency: string
  billingPeriod: string
  startDate: string
  nextPaymentDate: string | null
  status: string
}

interface SoftwareDialogProps {
  open: boolean
  onClose: (refresh?: boolean) => void
  software: Software | null
  spaceId: string
}

const categories = [
  { value: "SAAS", label: "SaaS" },
  { value: "HOSTING", label: "Hosting" },
  { value: "DOMAIN", label: "Domain" },
  { value: "AI_TOOLS", label: "AI Tools" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "DESIGN", label: "Design" },
  { value: "PRODUCTIVITY", label: "Productivity" },
  { value: "COMMUNICATION", label: "Communication" },
  { value: "STORAGE", label: "Storage" },
  { value: "SECURITY", label: "Security" },
  { value: "OTHER", label: "Other" },
]

const currencies = ["CZK", "EUR", "USD"]

const billingPeriods = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
  { value: "ONE_TIME", label: "One-time" },
]

const statuses = [
  { value: "ACTIVE", label: "Active" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "ARCHIVED", label: "Archived" },
]

export function SoftwareDialog({
  open,
  onClose,
  software,
  spaceId,
}: SoftwareDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "OTHER",
    url: "",
    price: "",
    currency: "CZK",
    billingPeriod: "MONTHLY",
    startDate: new Date().toISOString().split("T")[0],
    nextPaymentDate: "",
    status: "ACTIVE",
  })

  useEffect(() => {
    if (software) {
      setFormData({
        name: software.name,
        description: software.description || "",
        category: software.category,
        url: software.url || "",
        price: String(software.price),
        currency: software.currency,
        billingPeriod: software.billingPeriod,
        startDate: new Date(software.startDate).toISOString().split("T")[0],
        nextPaymentDate: software.nextPaymentDate
          ? new Date(software.nextPaymentDate).toISOString().split("T")[0]
          : "",
        status: software.status,
      })
    } else {
      setFormData({
        name: "",
        description: "",
        category: "OTHER",
        url: "",
        price: "",
        currency: "CZK",
        billingPeriod: "MONTHLY",
        startDate: new Date().toISOString().split("T")[0],
        nextPaymentDate: "",
        status: "ACTIVE",
      })
    }
  }, [software, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        url: formData.url || null,
        price: parseFloat(formData.price),
        currency: formData.currency,
        billingPeriod: formData.billingPeriod,
        startDate: formData.startDate,
        nextPaymentDate:
          formData.billingPeriod !== "ONE_TIME" && formData.nextPaymentDate
            ? formData.nextPaymentDate
            : null,
        status: formData.status,
        spaceId,
      }

      const url = software ? `/api/software/${software.id}` : "/api/software"
      const method = software ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast({
          title: software ? "Updated" : "Created",
          description: `Software has been ${software ? "updated" : "created"}`,
        })
        onClose(true)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to save software")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save software",
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
          <DialogTitle>
            {software ? "Edit Software" : "Add New Software"}
          </DialogTitle>
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
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
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
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://..."
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
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
                onValueChange={(value) =>
                  setFormData({ ...formData, currency: value })
                }
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

            <div className="space-y-2">
              <Label htmlFor="billingPeriod">Billing Period *</Label>
              <Select
                value={formData.billingPeriod}
                onValueChange={(value) =>
                  setFormData({ ...formData, billingPeriod: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billingPeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
              />
            </div>

            {formData.billingPeriod !== "ONE_TIME" && (
              <div className="space-y-2">
                <Label htmlFor="nextPaymentDate">Next Payment Date</Label>
                <Input
                  id="nextPaymentDate"
                  type="date"
                  value={formData.nextPaymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, nextPaymentDate: e.target.value })
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
              {isLoading ? "Saving..." : software ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
