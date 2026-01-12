import { NextRequest, NextResponse } from "next/server"
import { db, cloudStorages } from "@/lib/db"
import { eq } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"

// Microsoft OAuth token endpoint
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")
    const errorDescription = searchParams.get("error_description")

    // Handle OAuth errors
    if (error) {
      console.error("OneDrive OAuth error:", error, errorDescription)
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXTAUTH_URL)
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=Missing authorization code", process.env.NEXTAUTH_URL)
      )
    }

    // Decode state to get userId
    let userId: string
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString())
      userId = stateData.userId
    } catch {
      return NextResponse.redirect(
        new URL("/settings?error=Invalid state parameter", process.env.NEXTAUTH_URL)
      )
    }

    // Exchange code for tokens
    const clientId = process.env.MICROSOFT_CLIENT_ID
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/onedrive/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/settings?error=Microsoft OAuth not configured", process.env.NEXTAUTH_URL)
      )
    }

    const tokenResponse = await fetch(MICROSOFT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error("Token exchange failed:", errorData)
      return NextResponse.redirect(
        new URL("/settings?error=Failed to exchange authorization code", process.env.NEXTAUTH_URL)
      )
    }

    const tokens = await tokenResponse.json()

    // Get user info from Microsoft Graph to get a display name
    const userInfoResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    let displayName = "OneDrive"
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json()
      displayName = userInfo.displayName || userInfo.userPrincipalName || "OneDrive"
    }

    // Check if user already has a OneDrive connection
    const existingStorage = await db.query.cloudStorages.findFirst({
      where: (storage, { and, eq }) =>
        and(eq(storage.userId, userId), eq(storage.provider, "ONEDRIVE")),
    })

    const tokenExpiry = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : null

    if (existingStorage) {
      // Update existing connection
      await db
        .update(cloudStorages)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existingStorage.refreshToken,
          tokenExpiry: tokenExpiry,
          name: displayName,
          updatedAt: new Date(),
        })
        .where(eq(cloudStorages.id, existingStorage.id))
    } else {
      // Create new connection
      await db.insert(cloudStorages).values({
        id: uuidv4(),
        name: displayName,
        provider: "ONEDRIVE",
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokenExpiry,
        userId: userId,
      })
    }

    return NextResponse.redirect(
      new URL("/settings?success=OneDrive connected successfully", process.env.NEXTAUTH_URL)
    )
  } catch (error) {
    console.error("OneDrive callback error:", error)
    return NextResponse.redirect(
      new URL("/settings?error=Failed to connect OneDrive", process.env.NEXTAUTH_URL)
    )
  }
}
