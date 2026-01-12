"use client"

import { useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ExternalLink } from "lucide-react"

interface Invoice {
  id: string
  fileName: string
  supplierName: string | null
  invoiceNumber: string | null
  issueDate: string | null
  totalPrice: number | null
  currency: string | null
  cloudFileUrl: string | null
}

interface Space {
  id: string
  name: string
}

interface ProcessInvoiceDialogProps {
  open: boolean
  onClose: (refresh?: boolean) => void
  invoice: Invoice
  spaces: Space[]
}

const assetCategories = [
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

const softwareCategories = [
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

export function ProcessInvoiceDialog({
  open,
  onClose,
  invoice,
  spaces,
}: ProcessInvoiceDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"asset" | "software">("asset")
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: invoice.supplierName || "",
    spaceId: spaces[0]?.id || "",
    category: "OTHER",
    price: invoice.totalPrice?.toString() || "",
    currency: invoice.currency || "CZK",
    purchaseDate: invoice.issueDate
      ? new Date(invoice.issueDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    billingPeriod: "ONE_TIME",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Create asset or software
      const endpoint = activeTab === "asset" ? "/api/assets" : "/api/software"
      const payload =
        activeTab === "asset"
          ? {
              name: formData.name,
              category: formData.category,
              purchaseDate: formData.purchaseDate,
              price: parseFloat(formData.price),
              currency: formData.currency,
              spaceId: formData.spaceId,
              invoiceId: invoice.id,
              depreciationType: "NONE",
              status: "ACTIVE",
            }
          : {
              name: formData.name,
              category: formData.category,
              startDate: formData.purchaseDate,
              price: parseFloat(formData.price),
              currency: formData.currency,
              billingPeriod: formData.billingPeriod,
              spaceId: formData.spaceId,
              status: "ACTIVE",
            }

      const createResponse = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!createResponse.ok) {
        throw new Error("Failed to create item")
      }

      // Mark invoice as processed
      await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PROCESSED", spaceId: formData.spaceId }),
      })

      toast({
        title: "Created",
        description: `${activeTab === "asset" ? "Asset" : "Software"} has been created from invoice`,
      })
      onClose(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process invoice",
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
          <DialogTitle>Process Invoice</DialogTitle>
        </DialogHeader>

        {/* Invoice Summary */}
        <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">File:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate max-w-[200px]">
                {invoice.fileName}
              </span>
              {invoice.cloudFileUrl && (
                <a
                  href={invoice.cloudFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          {invoice.supplierName && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vendor:</span>
              <span className="text-sm font-medium">{invoice.supplierName}</span>
            </div>
          )}
          {invoice.totalPrice && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <span className="text-sm font-medium">
                {formatCurrency(invoice.totalPrice, invoice.currency || "CZK")}
              </span>
            </div>
          )}
          {invoice.issueDate && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date:</span>
              <span className="text-sm font-medium">
                {formatDate(invoice.issueDate)}
              </span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="asset">Create Asset</TabsTrigger>
            <TabsTrigger value="software">Create Software</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="space">Space *</Label>
              <Select
                value={formData.spaceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, spaceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select space" />
                </SelectTrigger>
                <SelectContent>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
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
                    {(activeTab === "asset"
                      ? assetCategories
                      : softwareCategories
                    ).map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <TabsContent value="software" className="mt-0 p-0">
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
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                    <SelectItem value="ONE_TIME">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onClose()}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Creating..."
                  : `Create ${activeTab === "asset" ? "Asset" : "Software"}`}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
