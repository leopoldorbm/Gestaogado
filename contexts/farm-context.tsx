"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface Fazenda {
  id: string
  nome: string
}

interface FarmContextType {
  selectedFarm: string | null // null means "all farms"
  setSelectedFarm: (farmId: string | null) => void
  fazendas: Fazenda[]
  setFazendas: (fazendas: Fazenda[]) => void
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
}

const FarmContext = createContext<FarmContextType | undefined>(undefined)

export function FarmProvider({ children }: { children: ReactNode }) {
  const [selectedFarm, setSelectedFarm] = useState<string | null>(null)
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("selectedFarm")
    if (saved && saved !== "null" && saved !== "undefined") {
      setSelectedFarm(saved)
    }
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (!isInitialized) return

    if (selectedFarm) {
      localStorage.setItem("selectedFarm", selectedFarm)
      console.log("[v0] Farm context: Selected farm changed to:", selectedFarm)
    } else {
      localStorage.setItem("selectedFarm", "null")
      console.log("[v0] Farm context: Selected farm changed to: all farms")
    }
  }, [selectedFarm, isInitialized])

  const handleSetSelectedFarm = (farmId: string | null) => {
    console.log("[v0] Farm context: Changing selected farm from", selectedFarm, "to", farmId)
    setSelectedFarm(farmId)
  }

  return (
    <FarmContext.Provider
      value={{
        selectedFarm,
        setSelectedFarm: handleSetSelectedFarm,
        fazendas,
        setFazendas,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </FarmContext.Provider>
  )
}

export function useFarm() {
  const context = useContext(FarmContext)
  if (context === undefined) {
    throw new Error("useFarm must be used within a FarmProvider")
  }
  return context
}
