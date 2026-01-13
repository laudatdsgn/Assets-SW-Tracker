import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"

const GRAPH_API_BASE = "https://graph.microsoft.com/v1.0"

interface GraphFile {
  id: string
  name: string
  folder?: { childCount: number }
  file?: { mimeType: string }
  size?: number
  lastModifiedDateTime: string
  parentReference?: {
    path: string
    id: string
  }
}

interface GraphResponse {
  value: GraphFile[]
  "@odata.nextLink"?: string
}

async function refreshTokenIfNeeded(storage: {
  id: string
  accessToken: string | null
  refreshToken: string | null
  tokenExpiry: Date | null
}): Promise<string | null> {
  // Check if token is expired or about to expire (within 5 minutes)
  const now = new Date()
  const expiryBuffer = 5 * 60 * 1000 // 5 minutes

  if (storage.tokenExpiry && storage.tokenExpiry.getTime() > now.getTime() + expiryBuffer) {
    return storage.accessToken
  }

  // Token expired, refresh it
  if (!storage.refreshToken) {
    console.error("No refresh token available")
    return null
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error("Microsoft OAuth not configured")
    return null
  }

  try {
    const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: storage.refreshToken,
        grant_type: "refresh_token",
      }),
    })

    if (!response.ok) {
      console.error("Failed to refresh token:", await response.text())
      return null
    }

    const tokens = await response.json()

    // Update tokens in database
    const { cloudStorages } = await import("@/lib/db")
    await db.update(cloudStorages).set({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || storage.refreshToken,
      tokenExpiry: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000)
        : null,
      updatedAt: new Date(),
    }).where(eq(cloudStorages.id, storage.id))

    return tokens.access_token
  } catch (error) {
    console.error("Error refreshing token:", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storageId = searchParams.get("storageId")
    const folderId = searchParams.get("folderId") || "root"

    if (!storageId) {
      return NextResponse.json({ error: "Storage ID required" }, { status: 400 })
    }

    // Get cloud storage with tokens
    const storage = await db.query.cloudStorages.findFirst({
      where: (s, { and, eq }) => and(
        eq(s.id, storageId),
        eq(s.userId, session.user.id)
      ),
    })

    if (!storage) {
      return NextResponse.json({ error: "Storage not found" }, { status: 404 })
    }

    // Get valid access token (refresh if needed)
    const accessToken = await refreshTokenIfNeeded(storage)
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get access token. Please reconnect OneDrive." }, { status: 401 })
    }

    // Build Graph API URL
    let graphUrl: string
    if (folderId === "root") {
      graphUrl = `${GRAPH_API_BASE}/me/drive/root/children?$select=id,name,folder,file,size,lastModifiedDateTime,parentReference&$orderby=name`
    } else {
      graphUrl = `${GRAPH_API_BASE}/me/drive/items/${folderId}/children?$select=id,name,folder,file,size,lastModifiedDateTime,parentReference&$orderby=name`
    }

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Graph API error:", errorText)
      return NextResponse.json({ error: "Failed to fetch files from OneDrive" }, { status: response.status })
    }

    const data: GraphResponse = await response.json()

    // Transform response
    const items = data.value.map((item) => ({
      id: item.id,
      name: item.name,
      isFolder: !!item.folder,
      childCount: item.folder?.childCount || 0,
      mimeType: item.file?.mimeType,
      size: item.size,
      lastModified: item.lastModifiedDateTime,
      path: item.parentReference?.path?.replace("/drive/root:", "") || "",
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error("OneDrive files error:", error)
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 })
  }
}

// Get folder path/breadcrumb
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { storageId, folderId } = await request.json()

    if (!storageId || !folderId) {
      return NextResponse.json({ error: "Storage ID and Folder ID required" }, { status: 400 })
    }

    const storage = await db.query.cloudStorages.findFirst({
      where: (s, { and, eq }) => and(
        eq(s.id, storageId),
        eq(s.userId, session.user.id)
      ),
    })

    if (!storage) {
      return NextResponse.json({ error: "Storage not found" }, { status: 404 })
    }

    const accessToken = await refreshTokenIfNeeded(storage)
    if (!accessToken) {
      return NextResponse.json({ error: "Failed to get access token" }, { status: 401 })
    }

    // Get folder details
    const graphUrl = folderId === "root"
      ? `${GRAPH_API_BASE}/me/drive/root`
      : `${GRAPH_API_BASE}/me/drive/items/${folderId}`

    const response = await fetch(graphUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to get folder info" }, { status: response.status })
    }

    const folder = await response.json()

    // Build path from parentReference
    const pathParts: Array<{ id: string; name: string }> = []

    if (folder.parentReference?.path) {
      const pathString = folder.parentReference.path.replace("/drive/root:", "")
      if (pathString) {
        // We'd need to resolve each path segment to get IDs, simplified for now
        pathParts.push({ id: "root", name: "OneDrive" })
      }
    }

    if (folderId !== "root") {
      pathParts.push({ id: folder.id, name: folder.name })
    }

    return NextResponse.json({
      id: folder.id || "root",
      name: folder.name || "OneDrive",
      path: folder.parentReference?.path?.replace("/drive/root:", "") || "/",
      fullPath: `${folder.parentReference?.path?.replace("/drive/root:", "") || ""}/${folder.name || ""}`.replace("//", "/"),
    })
  } catch (error) {
    console.error("OneDrive folder info error:", error)
    return NextResponse.json({ error: "Failed to get folder info" }, { status: 500 })
  }
}
