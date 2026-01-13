import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, invoiceFolders, invoices, cloudStorages } from "@/lib/db"
import { eq, and, inArray } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

interface GraphFile {
  id: string
  name: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  webUrl?: string
  "@microsoft.graph.downloadUrl"?: string
  parentReference?: {
    path: string
  }
}

// Patterns to detect invoice type from folder names
const RECEIVED_PATTERNS = ["přijaté", "prijate", "received", "nakup", "nákup", "dodavatel"]
const ISSUED_PATTERNS = ["vydané", "vydane", "issued", "prodej", "odberatel", "odběratel"]

function detectInvoiceType(folderPath: string): "RECEIVED" | "ISSUED" | null {
  const pathLower = folderPath.toLowerCase()

  for (const pattern of RECEIVED_PATTERNS) {
    if (pathLower.includes(pattern)) {
      return "RECEIVED"
    }
  }

  for (const pattern of ISSUED_PATTERNS) {
    if (pathLower.includes(pattern)) {
      return "ISSUED"
    }
  }

  return null
}

function isInvoiceFile(fileName: string, mimeType?: string): boolean {
  const lowerName = fileName.toLowerCase()
  const invoiceExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"]

  // Check extension
  if (invoiceExtensions.some((ext) => lowerName.endsWith(ext))) {
    return true
  }

  // Check mime type
  if (mimeType) {
    const invoiceMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/tiff",
    ]
    return invoiceMimeTypes.includes(mimeType)
  }

  return false
}

async function refreshToken(storage: {
  id: string
  refreshToken: string | null
}): Promise<string | null> {
  if (!storage.refreshToken) return null

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: storage.refreshToken,
          grant_type: "refresh_token",
        }),
      }
    )

    if (!response.ok) return null

    const tokens = await response.json()

    await db
      .update(cloudStorages)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || storage.refreshToken,
        tokenExpiry: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000)
          : null,
        updatedAt: new Date(),
      })
      .where(eq(cloudStorages.id, storage.id))

    return tokens.access_token
  } catch {
    return null
  }
}

async function scanFolderRecursively(
  accessToken: string,
  folderId: string,
  existingFileIds: Set<string>,
  results: Array<{
    fileId: string
    fileName: string
    filePath: string
    fileUrl: string
    invoiceType: "RECEIVED" | "ISSUED" | null
  }>,
  currentPath: string = ""
): Promise<void> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/drive/items/${folderId}/children?$select=id,name,folder,file,webUrl,parentReference`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!response.ok) {
      console.error(`Failed to scan folder ${folderId}:`, response.status)
      return
    }

    const data = await response.json()
    const items: GraphFile[] = data.value || []

    for (const item of items) {
      const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name

      if (item.folder) {
        // Recursively scan subfolders
        await scanFolderRecursively(
          accessToken,
          item.id,
          existingFileIds,
          results,
          itemPath
        )
      } else if (item.file && isInvoiceFile(item.name, item.file.mimeType)) {
        // Check if this file is already imported
        if (!existingFileIds.has(item.id)) {
          const invoiceType = detectInvoiceType(itemPath)

          results.push({
            fileId: item.id,
            fileName: item.name,
            filePath: itemPath,
            fileUrl: item.webUrl || "",
            invoiceType,
          })
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning folder ${folderId}:`, error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { folderId } = await request.json()

    // Get the invoice folder configuration
    const folder = await db.query.invoiceFolders.findFirst({
      where: eq(invoiceFolders.id, folderId),
      with: { cloudStorage: true },
    })

    if (!folder || folder.cloudStorage.userId !== session.user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    // Get valid access token
    let accessToken = folder.cloudStorage.accessToken
    if (
      !accessToken ||
      (folder.cloudStorage.tokenExpiry &&
        folder.cloudStorage.tokenExpiry < new Date())
    ) {
      accessToken = await refreshToken(folder.cloudStorage)
      if (!accessToken) {
        return NextResponse.json(
          { error: "Failed to get access token. Please reconnect OneDrive." },
          { status: 401 }
        )
      }
    }

    // Get existing invoice file IDs to avoid duplicates
    const existingInvoices = await db.query.invoices.findMany({
      where: eq(invoices.cloudStorageId, folder.cloudStorageId),
    })
    const existingFileIds = new Set(
      existingInvoices.map((inv) => inv.cloudFileId).filter(Boolean) as string[]
    )

    // Scan folder recursively
    const results: Array<{
      fileId: string
      fileName: string
      filePath: string
      fileUrl: string
      invoiceType: "RECEIVED" | "ISSUED" | null
    }> = []

    if (folder.scanRecursively) {
      await scanFolderRecursively(
        accessToken,
        folder.folderId,
        existingFileIds,
        results,
        folder.folderPath
      )
    } else {
      // Just scan immediate children
      const response = await fetch(
        `${GRAPH_API_BASE}/me/drive/items/${folder.folderId}/children?$select=id,name,folder,file,webUrl,parentReference`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (response.ok) {
        const data = await response.json()
        for (const item of data.value || []) {
          if (
            item.file &&
            isInvoiceFile(item.name, item.file.mimeType) &&
            !existingFileIds.has(item.id)
          ) {
            results.push({
              fileId: item.id,
              fileName: item.name,
              filePath: `${folder.folderPath}/${item.name}`,
              fileUrl: item.webUrl || "",
              invoiceType: detectInvoiceType(folder.folderPath),
            })
          }
        }
      }
    }

    // Create invoice records for new files
    const newInvoices = []
    for (const result of results) {
      const invoice = {
        id: uuidv4(),
        cloudStorageId: folder.cloudStorageId,
        cloudFileId: result.fileId,
        cloudFilePath: result.filePath,
        cloudFileUrl: result.fileUrl,
        fileName: result.fileName,
        invoiceType: result.invoiceType,
        status: "NEW" as const,
        scannedFromFolderId: folder.id,
      }
      newInvoices.push(invoice)
    }

    if (newInvoices.length > 0) {
      await db.insert(invoices).values(newInvoices)
    }

    // Update last scanned timestamp
    await db
      .update(invoiceFolders)
      .set({ lastScannedAt: new Date(), updatedAt: new Date() })
      .where(eq(invoiceFolders.id, folderId))

    return NextResponse.json({
      success: true,
      scanned: results.length,
      newInvoices: newInvoices.length,
      invoiceTypes: {
        received: results.filter((r) => r.invoiceType === "RECEIVED").length,
        issued: results.filter((r) => r.invoiceType === "ISSUED").length,
        unknown: results.filter((r) => r.invoiceType === null).length,
      },
    })
  } catch (error) {
    console.error("Scan error:", error)
    return NextResponse.json({ error: "Failed to scan folder" }, { status: 500 })
  }
}

// Scan all active folders for a user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all user's cloud storages
    const storages = await db.query.cloudStorages.findMany({
      where: eq(cloudStorages.userId, session.user.id),
      with: { invoiceFolders: true },
    })

    const allResults = {
      totalScanned: 0,
      totalNew: 0,
      byFolder: [] as Array<{
        folderName: string
        scanned: number
        newInvoices: number
      }>,
    }

    for (const storage of storages) {
      for (const folder of storage.invoiceFolders) {
        if (!folder.isActive) continue

        // Trigger scan for each folder
        const response = await fetch(
          `${process.env.NEXTAUTH_URL}/api/invoices/scan`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `next-auth.session-token=${session.user.id}`,
            },
            body: JSON.stringify({ folderId: folder.id }),
          }
        )

        if (response.ok) {
          const result = await response.json()
          allResults.totalScanned += result.scanned
          allResults.totalNew += result.newInvoices
          allResults.byFolder.push({
            folderName: folder.folderName,
            scanned: result.scanned,
            newInvoices: result.newInvoices,
          })
        }
      }
    }

    return NextResponse.json(allResults)
  } catch (error) {
    console.error("Scan all error:", error)
    return NextResponse.json({ error: "Failed to scan folders" }, { status: 500 })
  }
}
