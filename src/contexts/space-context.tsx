"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

interface Space {
  id: string
  name: string
  description: string | null
  color: string | null
}

interface SpaceContextType {
  spaces: Space[]
  currentSpace: Space | null
  setCurrentSpace: (space: Space) => void
  refreshSpaces: () => Promise<void>
  isLoading: boolean
}

const SpaceContext = createContext<SpaceContextType | undefined>(undefined)

export function SpaceProvider({ children }: { children: React.ReactNode }) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [currentSpace, setCurrentSpaceState] = useState<Space | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSpaces = useCallback(async () => {
    try {
      const response = await fetch("/api/spaces")
      if (response.ok) {
        const data = await response.json()
        setSpaces(data)

        // If no current space, select the first one
        if (!currentSpace && data.length > 0) {
          const savedSpaceId = localStorage.getItem("currentSpaceId")
          const savedSpace = data.find((s: Space) => s.id === savedSpaceId)
          setCurrentSpaceState(savedSpace || data[0])
        }
      }
    } catch (error) {
      console.error("Failed to fetch spaces:", error)
    } finally {
      setIsLoading(false)
    }
  }, [currentSpace])

  useEffect(() => {
    refreshSpaces()
  }, [refreshSpaces])

  const setCurrentSpace = (space: Space) => {
    setCurrentSpaceState(space)
    localStorage.setItem("currentSpaceId", space.id)
  }

  return (
    <SpaceContext.Provider
      value={{
        spaces,
        currentSpace,
        setCurrentSpace,
        refreshSpaces,
        isLoading,
      }}
    >
      {children}
    </SpaceContext.Provider>
  )
}

export function useSpace() {
  const context = useContext(SpaceContext)
  if (context === undefined) {
    throw new Error("useSpace must be used within a SpaceProvider")
  }
  return context
}
