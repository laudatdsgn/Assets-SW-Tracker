import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID
    if (!clientId) {
      return NextResponse.json(
        { error: "Microsoft OAuth not configured" },
        { status: 500 }
      )
    }

    // Build the authorization URL
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/onedrive/callback`
    const scope = [
      "offline_access",
      "Files.Read",
      "Files.Read.All",
      "User.Read",
    ].join(" ")

    const state = Buffer.from(
      JSON.stringify({ userId: session.user.id })
    ).toString("base64")

    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: scope,
      state: state,
      response_mode: "query",
    })

    const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("OneDrive auth error:", error)
    return NextResponse.json(
      { error: "Failed to initiate OneDrive authorization" },
      { status: 500 }
    )
  }
}
