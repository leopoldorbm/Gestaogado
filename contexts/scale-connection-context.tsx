"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface ScaleData {
  id: string
  visualId?: string
  electronicId?: string
  weight: number
  stable: boolean
  timestamp: string
}

interface ScaleConnectionContextType {
  isConnected: boolean
  connectionStatus: string
  liveWeight: number | null
  lastReadingTime: string | null
  receivedData: ScaleData | null
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
  const [receivedData, setReceivedData] = useState<ScaleData | null>(null)

  useEffect(() => {
    const handleScaleData = (event: CustomEvent<ScaleData>) => {
      const data = event.detail
      console.log("[v0] Scale data received via event:", data)

      const currentTime = Date.now().toString()
      localStorage.setItem("lastScaleDataTime", currentTime)
      console.log("[v0] Updated lastScaleDataTime:", currentTime)

      if (!isConnected) {
        setIsConnected(true)
        setConnectionStatus("Conectada - XR5000 Ativa")
        localStorage.setItem("scaleConnected", "true")
        localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 Ativa")
        console.log("[v0] Auto-connected due to scale data reception")
      }

      setLiveWeight(data.weight)
      setLastReadingTime(new Date().toLocaleTimeString("pt-BR"))
      setReceivedData(data)
    }

    // Listen for scale data events from communication interface
    window.addEventListener("scaleDataReceived", handleScaleData as EventListener)

    return () => {
      window.removeEventListener("scaleDataReceived", handleScaleData as EventListener)
    }
  }, [isConnected])

  useEffect(() => {
    const checkConnection = () => {
      const connected = localStorage.getItem("scaleConnected") === "true"
      const status = localStorage.getItem("scaleConnectionStatus") || "Desconectada"

      const lastDataTime = localStorage.getItem("lastScaleDataTime")
      const now = Date.now()
      const fiveMinutesAgo = now - 5 * 60 * 1000

      if (lastDataTime && Number.parseInt(lastDataTime) > fiveMinutesAgo) {
        console.log("[v0] Recent scale data detected on startup - auto-connecting")
        setIsConnected(true)
        setConnectionStatus("Conectada - XR5000 Ativa")
        localStorage.setItem("scaleConnected", "true")
        localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 Ativa")
        return
      }

      setIsConnected(connected)
      setConnectionStatus(status)

      if (connected) {
        console.log("[v0] Scale connection restored from localStorage")
      }
    }

    checkConnection()
  }, [])

  const startRealDataMonitoring = (port: string) => {
    console.log(`[v0] Starting real data monitoring on ${port}`)

    const interval = setInterval(async () => {
      try {
        const isStillConnected = await checkScaleConnection(port)

        if (!isStillConnected) {
          console.log("[v0] Scale disconnected - stopping data monitoring")
          disconnectFromScale()
          return
        }

        const realData = await requestScaleData(port)

        if (realData) {
          const timeString = new Date().toLocaleTimeString("pt-BR")

          setLiveWeight(realData.weight)
          setLastReadingTime(timeString)
          setReceivedData(realData)

          console.log("[v0] Real scale data received:", realData)
        }
      } catch (error) {
        console.error("[v0] Error monitoring scale data:", error)
        disconnectFromScale()
      }
    }, 3000)

    localStorage.setItem("scaleDataInterval", interval.toString())
    return () => clearInterval(interval)
  }

  const checkScaleConnection = async (port: string): Promise<boolean> => {
    try {
      const response = await sendScaleCommand(port, "{VM}")
      return response !== null
    } catch (error) {
      console.error("[v0] Scale connection check failed:", error)
      return false
    }
  }

  const requestScaleData = async (port: string): Promise<ScaleData | null> => {
    try {
      const weightResponse = await sendScaleCommand(port, "{FN}")

      if (weightResponse) {
        const parts = weightResponse.split(",")
        if (parts.length >= 3) {
          return {
            id: parts[0] || `${Date.now()}`,
            visualId: parts[1] || undefined,
            electronicId: parts[2] || undefined,
            weight: Number.parseFloat(parts[3]) || 0,
            stable: true,
            timestamp: new Date().toISOString(),
          }
        }
      }

      return null
    } catch (error) {
      console.error("[v0] Error requesting scale data:", error)
      return null
    }
  }

  const sendScaleCommand = async (port: string, command: string): Promise<string | null> => {
    try {
      console.log(`[v0] Would send command '${command}' to ${port}`)
      return null
    } catch (error) {
      console.error("[v0] Error sending scale command:", error)
      return null
    }
  }

  const connectToScale = async (): Promise<boolean> => {
    try {
      console.log("[v0] Attempting connection to scale...")
      setConnectionStatus("Conectando...")

      // Check if we have recent scale data (received via communication interface)
      const lastDataTime = localStorage.getItem("lastScaleDataTime")
      const now = Date.now()
      const thirtySecondsAgo = now - 30 * 1000

      if (lastDataTime && Number.parseInt(lastDataTime) > thirtySecondsAgo) {
        console.log("[v0] Scale data is actively being received - connecting immediately")
        setIsConnected(true)
        setConnectionStatus("Conectada - XR5000 Ativa")
        localStorage.setItem("scaleConnected", "true")
        localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 Ativa")
        return true
      }

      console.log("[v0] Attempting direct XR5000 connection via HTTP from browser...")

      // Try direct connection from browser to local XR5000 (not via server proxy)
      const testEndpoints = [
        "http://192.168.7.1:9000/api/v1/sessions",
        "http://192.168.7.1:9000/",
      ]

      for (const endpoint of testEndpoints) {
        try {
          console.log(`[v0] Testing direct connection to: ${endpoint}`)
          const response = await fetch(endpoint, {
            method: "GET",
            headers: {
              Accept: "application/xml, text/xml, application/json, text/html, */*",
            },
            mode: "cors",
            signal: AbortSignal.timeout(5000),
          })

          if (response.ok || response.status === 200) {
            console.log("[v0] XR5000 detected via direct HTTP connection")
            setIsConnected(true)
            setConnectionStatus("Conectada - XR5000 HTTP")
            localStorage.setItem("scaleConnected", "true")
            localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 HTTP")
            return true
          }
        } catch (error) {
          console.log(`[v0] Direct connection to ${endpoint} failed:`, error)
        }
      }

      console.log("[v0] Direct HTTP connection failed - waiting for Bluetooth/Serial data events...")
      setConnectionStatus("Aguardando conexao Bluetooth/Serial...")

      // Wait for scale data events from the communication interface (Bluetooth/Serial)
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          const recentDataTime = localStorage.getItem("lastScaleDataTime")
          const checkTime = Date.now()
          const fiveSecondsAgo = checkTime - 5000

          if (recentDataTime && Number.parseInt(recentDataTime) > fiveSecondsAgo) {
            console.log("[v0] Scale data received during connection attempt - success")
            setIsConnected(true)
            setConnectionStatus("Conectada - XR5000 Ativa")
            localStorage.setItem("scaleConnected", "true")
            localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 Ativa")
            resolve(true)
          } else {
            console.log("[v0] No scale data received - please connect via Communication module first")
            setConnectionStatus("Use o modulo Comunicacao para conectar")
            resolve(false)
          }
        }, 5000)

        const handleConnectionData = (event: CustomEvent<ScaleData>) => {
          console.log("[v0] Scale data received during connection - immediate success")
          clearTimeout(timeout)
          setIsConnected(true)
          setConnectionStatus("Conectada - XR5000 Ativa")
          localStorage.setItem("scaleConnected", "true")
          localStorage.setItem("scaleConnectionStatus", "Conectada - XR5000 Ativa")
          window.removeEventListener("scaleDataReceived", handleConnectionData as EventListener)
          resolve(true)
        }

        window.addEventListener("scaleDataReceived", handleConnectionData as EventListener)
      })
    } catch (error) {
      console.error("[v0] Connection error:", error)
      setConnectionStatus("Erro na conexao")
      return false
    }
  }

  const attemptRealConnection = async (port: string): Promise<boolean> => {
    try {
      console.log(`[v0] Testing real connection to ${port}`)

      const response = await sendScaleCommand(port, "{VM}")

      if (response && response.includes("13")) {
        console.log(`[v0] XR5000 confirmed on ${port}`)
        return true
      }

      console.log(`[v0] No XR5000 found on ${port}`)
      return false
    } catch (error) {
      console.error(`[v0] Connection test failed for ${port}:`, error)
      return false
    }
  }

  const disconnectFromScale = () => {
    setIsConnected(false)
    setConnectionStatus("Desconectada")
    setLiveWeight(null)
    setLastReadingTime(null)
    setReceivedData(null)

    localStorage.removeItem("scaleConnected")
    localStorage.removeItem("scaleConnectionStatus")
    localStorage.removeItem("scalePort")

    const intervalId = localStorage.getItem("scaleDataInterval")
    if (intervalId) {
      clearInterval(Number.parseInt(intervalId))
      localStorage.removeItem("scaleDataInterval")
    }

    console.log("[v0] Disconnected from real scale")
  }

  const simulateReading = (idv?: string, ide?: string, weight?: number) => {
    console.warn("[v0] Simulation is disabled - only real scale connections allowed")
  }

  return (
    <ScaleConnectionContext.Provider
      value={{
        isConnected,
        connectionStatus,
        liveWeight,
        lastReadingTime,
        receivedData,
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
