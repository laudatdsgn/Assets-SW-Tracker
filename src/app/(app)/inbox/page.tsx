"use client"

import { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Inbox,
  MoreHorizontal,
  Package,
  AppWindow,
  Ban,
  ExternalLink,
  RefreshCw,
  CloudOff,
  Settings,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useSpace } from "@/contexts/space-context"
import { ProcessInvoiceDialog } from "@/components/inbox/process-invoice-dialog"

interface Invoice {
  id: string
  fileName: string
  supplierName: string | null
  invoiceNumber: string | null
  issueDate: string | null
  totalPrice: number | null
  currency: string | null
  hasVat: boolean | null
  extractionConfidence: number | null
  status: string
  cloudFileUrl: string | null
  space: {
    id: string
    name: string
  } | null
  cloudStorage: {
    id: string
    name: string
    provider: string
  } | null
}

const statusColors: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  NEW: "warning",
  PROCESSING: "default",
  PROCESSED: "success",
  IGNORED: "secondary",
  ERROR: "destructive",
}

export default function InboxPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasCloudStorage, setHasCloudStorage] = useState(false)
  const [processDialogOpen, setProcessDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const { spaces } = useSpace()
  const { toast } = useToast()

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/invoices?status=NEW")
      if (response.ok) {
        const data = await response.json()
        setInvoices(data)
        setHasCloudStorage(true)
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  const handleIgnore = async (id: string) => {
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IGNORED" }),
      })
      if (response.ok) {
        setInvoices(invoices.filter((inv) => inv.id !== id))
        toast({
          title: "Ignored",
          description: "Invoice has been ignored",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to ignore invoice",
        variant: "destructive",
      })
    }
  }

  const handleProcess = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setProcessDialogOpen(true)
  }

  const handleProcessDialogClose = (refresh?: boolean) => {
    setProcessDialogOpen(false)
    setSelectedInvoice(null)
    if (refresh) {
      fetchInvoices()
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!hasCloudStorage) {
    return (
      <div className="flex flex-col">
        <PageHeader title="Inbox" description="Unprocessed invoices from cloud storage" />
        <div className="flex flex-1 items-center justify-center p-6">
          <Card className="max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <CloudOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No Cloud Storage Connected</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Connect your OneDrive or Google Drive to automatically scan invoice folders.
              </p>
              <Button asChild>
                <Link href="/settings/storage">
                  <Settings className="mr-2 h-4 w-4" />
                  Connect Storage
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Inbox" description="Unprocessed invoices from cloud storage">
        <Button variant="outline" onClick={fetchInvoices}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </PageHeader>

      <div className="p-6">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Inbox is empty</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              All invoices have been processed. New invoices will appear here when detected.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Detected Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate max-w-[200px]">
                          {invoice.fileName}
                        </span>
                        {invoice.cloudFileUrl && (
                          <a
                            href={invoice.cloudFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {invoice.supplierName || (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.totalPrice ? (
                        formatCurrency(invoice.totalPrice, invoice.currency || "CZK")
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.issueDate ? (
                        formatDate(invoice.issueDate)
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {invoice.extractionConfidence !== null ? (
                        <Badge
                          variant={
                            invoice.extractionConfidence > 0.8
                              ? "success"
                              : invoice.extractionConfidence > 0.5
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {Math.round(invoice.extractionConfidence * 100)}%
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not analyzed</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {invoice.cloudStorage?.name || "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleProcess(invoice)}>
                            <Package className="mr-2 h-4 w-4" />
                            Create Asset
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleProcess(invoice)}>
                            <AppWindow className="mr-2 h-4 w-4" />
                            Create Software
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleIgnore(invoice.id)}
                            className="text-muted-foreground"
                          >
                            <Ban className="mr-2 h-4 w-4" />
                            Ignore
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

      {selectedInvoice && (
        <ProcessInvoiceDialog
          open={processDialogOpen}
          onClose={handleProcessDialogClose}
          invoice={selectedInvoice}
          spaces={spaces}
        />
      )}
    </div>
  )
}
