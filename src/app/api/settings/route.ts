import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, userSettings } from "@/lib/db"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { randomUUID } from "crypto"

const updateSettingsSchema = z.object({
  defaultCurrency: z.string().optional(),
  scanFrequency: z.number().int().positive().optional(),
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    })

    if (!settings) {
      // Create default settings if they don't exist
      const [newSettings] = await db.insert(userSettings).values({
        id: randomUUID(),
        userId: session.user.id,
        defaultCurrency: "CZK",
        scanFrequency: 60,
      }).returning()
      return NextResponse.json(newSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateSettingsSchema.parse(body)

    // Check if settings exist
    const existingSettings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.user.id),
    })

    let settings
    if (existingSettings) {
      // Update existing settings
      await db.update(userSettings).set({
        ...validatedData,
        updatedAt: new Date(),
      }).where(eq(userSettings.userId, session.user.id))

      settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, session.user.id),
      })
    } else {
      // Create new settings (upsert behavior)
      const [newSettings] = await db.insert(userSettings).values({
        id: randomUUID(),
        userId: session.user.id,
        defaultCurrency: validatedData.defaultCurrency || "CZK",
        scanFrequency: validatedData.scanFrequency || 60,
      }).returning()
      settings = newSettings
    }

    return NextResponse.json(settings)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error updating settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
