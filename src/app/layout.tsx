import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"

export const metadata: Metadata = {
  title: "Assets & Software Tracker",
  description: "Track your business assets and software subscriptions",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
