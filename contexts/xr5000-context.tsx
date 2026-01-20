"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { XR5000Communication, XR5000ConnectionStatus, XR5000AnimalData } from "@/lib/xr5000-communication"

interface XR5000ContextType {
  communication: XR5000Communication | null
  connectionStatus: XR5000ConnectionStatus
  currentAnimalData: XR5000AnimalData | null
  isReceivingData: boolean
  connect: (communication: XR5000Communication) => void
  disconnect: () => void
  startDataReception: () => void
  stopDataReception: () => void
}

const XR5000Context = createContext<XR5000ContextType | undefined>(undefined)

export function XR5000Provider({ children }: { children: ReactNode }) {
  const [communication, setCommunication] = useState<XR5000Communication | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<XR5000ConnectionStatus>({
    connected: false,
    interface: "usb",
    protocol: "adi",
  })
  const [currentAnimalData, setCurrentAnimalData] = useState<XR5000AnimalData | null>(null)
  const [isReceivingData, setIsReceivingData] = useState(false)
  const [dataReceptionInterval, setDataReceptionInterval] = useState<NodeJS.Timeout | null>(null)

  const connect = (comm: XR5000Communication) => {
    console.log("[XR5000Context] Connecting to XR5000...")
    setCommunication(comm)

    // Set up event listeners
    comm.on("connected", (status: XR5000ConnectionStatus) => {
      console.log("[XR5000Context] Connected:", status)
      setConnectionStatus(status)
    })

    comm.on("disconnected", (status: XR5000ConnectionStatus) => {
      console.log("[XR5000Context] Disconnected:", status)
      setConnectionStatus(status)
      setCurrentAnimalData(null)
      stopDataReception()
    })

    comm.on("connectionError", (status: XR5000ConnectionStatus) => {
      console.error("[XR5000Context] Connection error:", status)
      setConnectionStatus(status)
      stopDataReception()
    })

    setConnectionStatus(comm.getStatus())
  }

  const disconnect = async () => {
    console.log("[XR5000Context] Disconnecting from XR5000...")

    if (communication) {
      await communication.disconnect()
    }

    setCommunication(null)
    setCurrentAnimalData(null)
    stopDataReception()
  }

  const startDataReception = () => {
    if (!communication || !connectionStatus.connected || isReceivingData) {
      console.log("[XR5000Context] Cannot start data reception - not connected or already receiving")
      return
    }

    console.log("[XR5000Context] Starting real data reception from XR5000...")
    setIsReceivingData(true)

    // Poll for live weight data every 2 seconds
    const interval = setInterval(async () => {
      try {
        const animalData = await communication.getLiveWeight()
        if (animalData) {
          console.log("[XR5000Context] Received animal data:", animalData)
          setCurrentAnimalData(animalData)

          // Dispatch custom event for other components
          window.dispatchEvent(
            new CustomEvent("xr5000DataReceived", {
              detail: animalData,
            }),
          )
        }
      } catch (error) {
        console.error("[XR5000Context] Failed to get live weight:", error)
        // Don't stop reception on single errors, but log them
      }
    }, 2000)

    setDataReceptionInterval(interval)
  }

  const stopDataReception = () => {
    console.log("[XR5000Context] Stopping data reception...")
    setIsReceivingData(false)

    if (dataReceptionInterval) {
      clearInterval(dataReceptionInterval)
      setDataReceptionInterval(null)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDataReception()
      if (communication) {
        communication.disconnect()
      }
    }
  }, [])

  const value: XR5000ContextType = {
    communication,
    connectionStatus,
    currentAnimalData,
    isReceivingData,
    connect,
    disconnect,
    startDataReception,
    stopDataReception,
  }

  return <XR5000Context.Provider value={value}>{children}</XR5000Context.Provider>
}

export function useXR5000() {
  const context = useContext(XR5000Context)
  if (context === undefined) {
    throw new Error("useXR5000 must be used within an XR5000Provider")
  }
  return context
}
