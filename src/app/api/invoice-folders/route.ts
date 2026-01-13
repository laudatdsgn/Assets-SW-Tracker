import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, invoiceFolders, cloudStorages } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storageId = searchParams.get("storageId")

    if (!storageId) {
      return NextResponse.json({ error: "Storage ID required" }, { status: 400 })
    }

    // Verify user owns this storage
    const storage = await db.query.cloudStorages.findFirst({
      where: (s, { and, eq }) => and(
        eq(s.id, storageId),
        eq(s.userId, session.user.id)
      ),
    })

    if (!storage) {
      return NextResponse.json({ error: "Storage not found" }, { status: 404 })
    }

    const folders = await db.query.invoiceFolders.findMany({
      where: eq(invoiceFolders.cloudStorageId, storageId),
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error("Error fetching invoice folders:", error)
    return NextResponse.json({ error: "Failed to fetch folders" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { storageId, folderId, folderName, folderPath, scanRecursively = true } = body

    if (!storageId || !folderId || !folderName || !folderPath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify user owns this storage
    const storage = await db.query.cloudStorages.findFirst({
      where: (s, { and, eq }) => and(
        eq(s.id, storageId),
        eq(s.userId, session.user.id)
      ),
    })

    if (!storage) {
      return NextResponse.json({ error: "Storage not found" }, { status: 404 })
    }

    // Check if folder already exists
    const existingFolder = await db.query.invoiceFolders.findFirst({
      where: (f, { and, eq }) => and(
        eq(f.cloudStorageId, storageId),
        eq(f.folderId, folderId)
      ),
    })

    if (existingFolder) {
      return NextResponse.json({ error: "Folder already added" }, { status: 409 })
    }

    const [folder] = await db.insert(invoiceFolders).values({
      id: uuidv4(),
      cloudStorageId: storageId,
      folderId,
      folderName,
      folderPath,
      scanRecursively,
    }).returning()

    return NextResponse.json(folder, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice folder:", error)
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Folder ID required" }, { status: 400 })
    }

    // Verify ownership through cloud storage
    const folder = await db.query.invoiceFolders.findFirst({
      where: eq(invoiceFolders.id, id),
      with: { cloudStorage: true },
    })

    if (!folder || folder.cloudStorage.userId !== session.user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 })
    }

    await db.delete(invoiceFolders).where(eq(invoiceFolders.id, id))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting invoice folder:", error)
    return NextResponse.json({ error: "Failed to delete folder" }, { status: 500 })
  }
}
