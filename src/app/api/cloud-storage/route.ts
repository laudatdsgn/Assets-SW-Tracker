import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const cloudStorages = await prisma.cloudStorage.findMany({
      where: { userId: session.user.id },
      include: {
        invoiceFolders: {
          select: {
            id: true,
            folderPath: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(cloudStorages)
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

    const cloudStorage = await prisma.cloudStorage.create({
      data: {
        name: body.name,
        provider: body.provider,
        accessToken: body.accessToken,
        refreshToken: body.refreshToken,
        tokenExpiry: body.tokenExpiry ? new Date(body.tokenExpiry) : null,
        userId: session.user.id,
      },
    })

    return NextResponse.json(cloudStorage, { status: 201 })
  } catch (error) {
    console.error("Error creating cloud storage:", error)
    return NextResponse.json(
      { error: "Failed to create cloud storage" },
      { status: 500 }
    )
  }
}
