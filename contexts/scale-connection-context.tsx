"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface ScaleConnectionContextType {
  isConnected: boolean
  connectionStatus: string
  liveWeight: number | null
  lastReadingTime: string | null
  connectToScale: () => Promise<boolean>
  disconnectFromScale: () => void
  simulateReading: (idv?: string, ide?: string, weight?: number) => void
}

const ScaleConnectionContext = createContext<ScaleConnectionContextType | undefined>(undefined)

export function ScaleConnectionProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState("Desconectada")
  const [liveWeight, setLiveWeight] = useState<number | null>(null)
  const [lastReadingTime, setLastReadingTime] = useState<string | null>(null)

  useEffect(() => {
    const checkConnection = () => {
      const connected = localStorage.getItem("scaleConnected") === "true"
      const status = localStorage.getItem("scaleConnectionStatus") || "Desconectada"

      setIsConnected(connected)
      setConnectionStatus(status)

      if (connected) {
        console.log("[v0] Scale connection restored from localStorage")
        startDataSimulation()
      }
    }

    checkConnection()
  }, [])

  const startDataSimulation = () => {
    const interval = setInterval(() => {
      const weight = Math.floor(Math.random() * 100) + 400
      setLiveWeight(weight)
      setLastReadingTime(new Date().toLocaleTimeString("pt-BR"))
    }, 3000)

    // Store interval ID for cleanup
    localStorage.setItem("scaleDataInterval", interval.toString())

    return () => clearInterval(interval)
  }

  const connectToScale = async (): Promise<boolean> => {
    try {
      console.log("[v0] Attempting quick connection to scale...")
      setConnectionStatus("Conectando...")

      // Simulate connection process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const success = Math.random() > 0.1 // 90% success rate

      if (success) {
        setIsConnected(true)
        setConnectionStatus("Conectada - USB COM3")
        localStorage.setItem("scaleConnected", "true")
        localStorage.setItem("scaleConnectionStatus", "Conectada - USB COM3")

        console.log("[v0] Successfully connected to scale")
        startDataSimulation()
        return true
      } else {
        setConnectionStatus("Erro na conexão")
        return false
      }
    } catch (error) {
      console.error("[v0] Connection error:", error)
      setConnectionStatus("Erro na conexão")
      return false
    }
  }

  const disconnectFromScale = () => {
    setIsConnected(false)
    setConnectionStatus("Desconectada")
    setLiveWeight(null)
    setLastReadingTime(null)

    localStorage.removeItem("scaleConnected")
    localStorage.removeItem("scaleConnectionStatus")

    // Clear data simulation interval
    const intervalId = localStorage.getItem("scaleDataInterval")
    if (intervalId) {
      clearInterval(Number.parseInt(intervalId))
      localStorage.removeItem("scaleDataInterval")
    }

    console.log("[v0] Disconnected from scale")
  }

  const simulateReading = (idv?: string, ide?: string, weight?: number) => {
    const simulatedWeight = weight || Math.floor(Math.random() * 100) + 400
    setLiveWeight(simulatedWeight)
    setLastReadingTime(new Date().toLocaleTimeString("pt-BR"))

    console.log("[v0] Simulated reading:", { idv, ide, weight: simulatedWeight })
  }

  return (
    <ScaleConnectionContext.Provider
      value={{
        isConnected,
        connectionStatus,
        liveWeight,
        lastReadingTime,
        connectToScale,
        disconnectFromScale,
        simulateReading,
      }}
    >
      {children}
    </ScaleConnectionContext.Provider>
  )
}

export function useScaleConnection() {
  const context = useContext(ScaleConnectionContext)
  if (context === undefined) {
    throw new Error("useScaleConnection must be used within a ScaleConnectionProvider")
  }
  return context
}
