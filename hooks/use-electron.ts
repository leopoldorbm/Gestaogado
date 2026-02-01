"use client"

import { useEffect, useState, useCallback, useRef } from "react"

// Type definitions for the Electron API
interface SerialPort {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  vendorId?: string
  productId?: string
}

interface WeightResponse {
  success: boolean
  weight?: number
  unit?: string
  raw?: string
  stable?: boolean
  error?: string
}

interface AnimalIdResponse {
  success: boolean
  animalId?: string
  error?: string
}

interface ElectronAPI {
  serial: {
    listPorts: () => Promise<{ success: boolean; ports?: SerialPort[]; error?: string }>
    connect: (options: { port: string; baudRate?: number }) => Promise<{ success: boolean; message?: string; error?: string }>
    disconnect: () => Promise<{ success: boolean; error?: string }>
    write: (data: string) => Promise<{ success: boolean; error?: string }>
    onData: (callback: (data: string) => void) => void
    onError: (callback: (error: string) => void) => void
    removeAllListeners: () => void
  }
  tcp: {
    connect: (options: { host: string; port: number }) => Promise<{ success: boolean; message?: string; error?: string }>
    disconnect: () => Promise<{ success: boolean; error?: string }>
    write: (data: string) => Promise<{ success: boolean; error?: string }>
    onData: (callback: (data: string) => void) => void
    onError: (callback: (error: string) => void) => void
    onDisconnected: (callback: () => void) => void
    removeAllListeners: () => void
  }
  xr5000: {
    getWeight: () => Promise<WeightResponse>
    getAnimalId: () => Promise<AnimalIdResponse>
  }
  app: {
    getInfo: () => Promise<{ version: string; name: string; platform: string }>
  }
  isElectron: boolean
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export function useElectron() {
  const [isElectron, setIsElectron] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionMode, setConnectionMode] = useState<"serial" | "tcp" | null>(null)
  const [availablePorts, setAvailablePorts] = useState<SerialPort[]>([])
  const [currentWeight, setCurrentWeight] = useState<number | null>(null)
  const [currentAnimalId, setCurrentAnimalId] = useState<string | null>(null)
  const [isStable, setIsStable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Check if running in Electron
  useEffect(() => {
    const electronAvailable = typeof window !== "undefined" && window.electronAPI?.isElectron === true
    setIsElectron(electronAvailable)
  }, [])

  // List available serial ports
  const listSerialPorts = useCallback(async () => {
    if (!window.electronAPI) return []
    
    const result = await window.electronAPI.serial.listPorts()
    if (result.success && result.ports) {
      setAvailablePorts(result.ports)
      return result.ports
    }
    return []
  }, [])

  // Connect via Serial (USB Legacy Mode)
  const connectSerial = useCallback(async (port: string, baudRate = 9600) => {
    if (!window.electronAPI) {
      setError("Electron API not available")
      return false
    }

    setError(null)
    const result = await window.electronAPI.serial.connect({ port, baudRate })
    
    if (result.success) {
      setIsConnected(true)
      setConnectionMode("serial")

      // Set up data listener
      window.electronAPI.serial.onData((data) => {
        parseScaleData(data)
      })

      window.electronAPI.serial.onError((err) => {
        setError(err)
      })

      return true
    } else {
      setError(result.error || "Failed to connect")
      return false
    }
  }, [])

  // Connect via TCP (USB Ethernet Mode)
  const connectTCP = useCallback(async (host: string, port: number) => {
    if (!window.electronAPI) {
      setError("Electron API not available")
      return false
    }

    setError(null)
    const result = await window.electronAPI.tcp.connect({ host, port })
    
    if (result.success) {
      setIsConnected(true)
      setConnectionMode("tcp")

      // Set up data listener
      window.electronAPI.tcp.onData((data) => {
        parseScaleData(data)
      })

      window.electronAPI.tcp.onError((err) => {
        setError(err)
      })

      window.electronAPI.tcp.onDisconnected(() => {
        setIsConnected(false)
        setConnectionMode(null)
      })

      return true
    } else {
      setError(result.error || "Failed to connect")
      return false
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(async () => {
    if (!window.electronAPI) return

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }

    if (connectionMode === "serial") {
      window.electronAPI.serial.removeAllListeners()
      await window.electronAPI.serial.disconnect()
    } else if (connectionMode === "tcp") {
      window.electronAPI.tcp.removeAllListeners()
      await window.electronAPI.tcp.disconnect()
    }

    setIsConnected(false)
    setConnectionMode(null)
    setCurrentWeight(null)
    setCurrentAnimalId(null)
  }, [connectionMode])

  // Parse scale data (SCP or ADI format)
  const parseScaleData = useCallback((data: string) => {
    // SCP format: [123.5] or [U123.5] (U = unstable)
    const scpMatch = data.match(/\[U?([+-]?\d+\.?\d*)\]/)
    if (scpMatch) {
      setCurrentWeight(parseFloat(scpMatch[1]))
      setIsStable(!data.includes("U"))
      return
    }

    // ADI format: various responses
    const weightMatch = data.match(/([+-]?\d+\.?\d*)\s*(kg|lb)?/i)
    if (weightMatch) {
      setCurrentWeight(parseFloat(weightMatch[1]))
      setIsStable(!data.includes("M") && !data.includes("U"))
    }

    // Check for EID/Animal ID
    const eidMatch = data.match(/EID[:=]?\s*(\w+)/i)
    if (eidMatch) {
      setCurrentAnimalId(eidMatch[1])
    }
  }, [])

  // Start polling for weight (for ADI protocol)
  const startWeightPolling = useCallback((intervalMs = 1000) => {
    if (!window.electronAPI || !isConnected) return

    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }

    pollingRef.current = setInterval(async () => {
      const weightResult = await window.electronAPI!.xr5000.getWeight()
      if (weightResult.success && weightResult.weight !== undefined) {
        setCurrentWeight(weightResult.weight)
        setIsStable(weightResult.stable || false)
      }

      const idResult = await window.electronAPI!.xr5000.getAnimalId()
      if (idResult.success && idResult.animalId) {
        setCurrentAnimalId(idResult.animalId)
      }
    }, intervalMs)
  }, [isConnected])

  // Stop polling
  const stopWeightPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Request weight manually
  const requestWeight = useCallback(async () => {
    if (!window.electronAPI || !isConnected) return null

    const result = await window.electronAPI.xr5000.getWeight()
    if (result.success && result.weight !== undefined) {
      setCurrentWeight(result.weight)
      setIsStable(result.stable || false)
      return result.weight
    }
    return null
  }, [isConnected])

  // Request animal ID manually
  const requestAnimalId = useCallback(async () => {
    if (!window.electronAPI || !isConnected) return null

    const result = await window.electronAPI.xr5000.getAnimalId()
    if (result.success && result.animalId) {
      setCurrentAnimalId(result.animalId)
      return result.animalId
    }
    return null
  }, [isConnected])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return {
    isElectron,
    isConnected,
    connectionMode,
    availablePorts,
    currentWeight,
    currentAnimalId,
    isStable,
    error,
    listSerialPorts,
    connectSerial,
    connectTCP,
    disconnect,
    startWeightPolling,
    stopWeightPolling,
    requestWeight,
    requestAnimalId,
  }
}
