"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import {
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronLeft,
  Home,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react"

interface FileItem {
  id: string
  name: string
  isFolder: boolean
  childCount: number
  mimeType?: string
  size?: number
  lastModified: string
  path: string
}

interface InvoiceFolder {
  id: string
  folderId: string
  folderName: string
  folderPath: string
  scanRecursively: boolean
  isActive: boolean
  lastScannedAt: string | null
}

interface CloudStorage {
  id: string
  name: string
  provider: string
}

export default function StorageSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const storageId = params.id as string

  const [storage, setStorage] = useState<CloudStorage | null>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [invoiceFolders, setInvoiceFolders] = useState<InvoiceFolder[]>([])
  const [currentFolderId, setCurrentFolderId] = useState("root")
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([
    { id: "root", name: "OneDrive" },
  ])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<FileItem | null>(null)
  const [scanRecursively, setScanRecursively] = useState(true)

  // Fetch storage info
  useEffect(() => {
    async function fetchStorage() {
      try {
        const response = await fetch("/api/cloud-storage")
        if (response.ok) {
          const storages = await response.json()
          const found = storages.find((s: CloudStorage) => s.id === storageId)
          if (found) {
            setStorage(found)
          } else {
            router.push("/settings")
          }
        }
      } catch (error) {
        console.error("Failed to fetch storage:", error)
      }
    }
    fetchStorage()
  }, [storageId, router])

  // Fetch invoice folders
  const fetchInvoiceFolders = useCallback(async () => {
    try {
      const response = await fetch(`/api/invoice-folders?storageId=${storageId}`)
      if (response.ok) {
        const folders = await response.json()
        setInvoiceFolders(folders)
      }
    } catch (error) {
      console.error("Failed to fetch invoice folders:", error)
    }
  }, [storageId])

  useEffect(() => {
    fetchInvoiceFolders()
  }, [fetchInvoiceFolders])

  // Fetch files
  const fetchFiles = useCallback(async (folderId: string) => {
    setIsLoadingFiles(true)
    try {
      const response = await fetch(
        `/api/onedrive/files?storageId=${storageId}&folderId=${folderId}`
      )
      if (response.ok) {
        const data = await response.json()
        setFiles(data.items || [])
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to fetch files",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
      toast({
        title: "Error",
        description: "Failed to fetch files from OneDrive",
        variant: "destructive",
      })
    } finally {
      setIsLoadingFiles(false)
      setIsLoading(false)
    }
  }, [storageId, toast])

  useEffect(() => {
    if (storage) {
      fetchFiles(currentFolderId)
    }
  }, [storage, currentFolderId, fetchFiles])

  const navigateToFolder = (folder: FileItem) => {
    setSelectedFolder(null)
    setCurrentFolderId(folder.id)
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
  }

  const navigateToBreadcrumb = (index: number) => {
    const item = breadcrumb[index]
    setSelectedFolder(null)
    setCurrentFolderId(item.id)
    setBreadcrumb(breadcrumb.slice(0, index + 1))
  }

  const goBack = () => {
    if (breadcrumb.length > 1) {
      navigateToBreadcrumb(breadcrumb.length - 2)
    }
  }

  const addFolder = async () => {
    if (!selectedFolder) return

    try {
      const fullPath = breadcrumb
        .slice(1)
        .map((b) => b.name)
        .concat(selectedFolder.name)
        .join("/")

      const response = await fetch("/api/invoice-folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageId,
          folderId: selectedFolder.id,
          folderName: selectedFolder.name,
          folderPath: "/" + fullPath,
          scanRecursively,
        }),
      })

      if (response.ok) {
        toast({
          title: "Folder added",
          description: `"${selectedFolder.name}" will be scanned for invoices`,
        })
        setSelectedFolder(null)
        fetchInvoiceFolders()
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to add folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add folder",
        variant: "destructive",
      })
    }
  }

  const removeFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/invoice-folders?id=${folderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({ title: "Folder removed" })
        fetchInvoiceFolders()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove folder",
        variant: "destructive",
      })
    }
  }

  const [scanningFolderId, setScanningFolderId] = useState<string | null>(null)

  const scanFolder = async (folderId: string) => {
    setScanningFolderId(folderId)
    try {
      const response = await fetch("/api/invoices/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Scan completed",
          description: `Found ${result.newInvoices} new invoices (${result.invoiceTypes.received} received, ${result.invoiceTypes.issued} issued)`,
        })
        fetchInvoiceFolders()
      } else {
        const error = await response.json()
        toast({
          title: "Scan failed",
          description: error.error || "Failed to scan folder",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to scan folder",
        variant: "destructive",
      })
    } finally {
      setScanningFolderId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={storage?.name || "Cloud Storage"}
        description="Configure folders to scan for invoices"
      />

      <div className="p-6 max-w-4xl space-y-6">
        {/* Configured Folders */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Folders</CardTitle>
            <CardDescription>
              Folders that will be scanned for invoices. The scanner will automatically
              detect invoice type based on folder names (přijaté/vydané).
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoiceFolders.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto opacity-50" />
                <p className="mt-2">No folders configured yet</p>
                <p className="text-sm">Select a folder below to start scanning</p>
              </div>
            ) : (
              <div className="space-y-2">
                {invoiceFolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{folder.folderName}</p>
                        <p className="text-xs text-muted-foreground">
                          {folder.folderPath}
                          {folder.scanRecursively && " (recursive)"}
                          {folder.lastScannedAt && (
                            <span className="ml-2">
                              · Last scanned: {new Date(folder.lastScannedAt).toLocaleString("cs-CZ")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => scanFolder(folder.id)}
                        disabled={scanningFolderId === folder.id}
                      >
                        {scanningFolderId === folder.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        <span className="ml-1">Scan</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => removeFolder(folder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Folder Browser */}
        <Card>
          <CardHeader>
            <CardTitle>Browse OneDrive</CardTitle>
            <CardDescription>
              Navigate to select a folder to scan. Recommended: select your main
              accounting folder (e.g., &quot;Účetnictví&quot; or &quot;Faktury&quot;).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={goBack}
                disabled={breadcrumb.length <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {breadcrumb.map((item, index) => (
                <div key={item.id} className="flex items-center">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => navigateToBreadcrumb(index)}
                  >
                    {index === 0 ? <Home className="h-4 w-4" /> : item.name}
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 ml-auto"
                onClick={() => fetchFiles(currentFolderId)}
                disabled={isLoadingFiles}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingFiles ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* File List */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>This folder is empty</p>
                </div>
              ) : (
                <div className="divide-y">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedFolder?.id === file.id ? "bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        if (file.isFolder) {
                          setSelectedFolder(
                            selectedFolder?.id === file.id ? null : file
                          )
                        }
                      }}
                      onDoubleClick={() => {
                        if (file.isFolder) {
                          navigateToFolder(file)
                        }
                      }}
                    >
                      {file.isFolder ? (
                        <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      ) : (
                        <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{file.name}</p>
                        {file.isFolder && file.childCount > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {file.childCount} items
                          </p>
                        )}
                      </div>
                      {file.isFolder && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Folder Controls */}
            {selectedFolder && (
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                <FolderOpen className="h-8 w-8 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{selectedFolder.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Checkbox
                      id="recursive"
                      checked={scanRecursively}
                      onCheckedChange={(checked) =>
                        setScanRecursively(checked as boolean)
                      }
                    />
                    <label htmlFor="recursive" className="text-sm text-muted-foreground">
                      Scan subfolders recursively (recommended for Rok/Měsíc structure)
                    </label>
                  </div>
                </div>
                <Button onClick={addFolder}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Folder
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Tip: Double-click to open a folder, single-click to select it.
              The scanner will look for PDF files in subfolders named &quot;přijaté&quot;
              (received) or &quot;vydané&quot; (issued) to determine invoice type.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
