import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, cloudStorages } from "@/lib/db"
import { eq, asc } from "drizzle-orm"
import { randomUUID } from "crypto"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const storages = await db.query.cloudStorages.findMany({
      where: eq(cloudStorages.userId, session.user.id),
      with: {
        invoiceFolders: true,
      },
      orderBy: asc(cloudStorages.createdAt),
    })

    return NextResponse.json(storages)
  } catch (error) {
    console.error("Error fetching cloud storages:", error)
    return NextResponse.json(
      { error: "Failed to fetch cloud storages" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const [cloudStorage] = await db.insert(cloudStorages).values({
      id: randomUUID(),
      name: body.name,
      provider: body.provider,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      tokenExpiry: body.tokenExpiry ? new Date(body.tokenExpiry) : null,
      userId: session.user.id,
    }).returning()

    return NextResponse.json(cloudStorage, { status: 201 })
  } catch (error) {
    console.error("Error creating cloud storage:", error)
    return NextResponse.json(
      { error: "Failed to create cloud storage" },
      { status: 500 }
    )
  }
}
