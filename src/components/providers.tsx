"use client"

import { SessionProvider } from "next-auth/react"
import { SpaceProvider } from "@/contexts/space-context"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SpaceProvider>
        {children}
        <Toaster />
      </SpaceProvider>
    </SessionProvider>
  )
}
