"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WeighingCapture } from "@/components/weighing-capture"

interface ScaleReading {
  weight: number
  animalId?: string
  timestamp: Date
  stable: boolean
}

interface ConnectionConfig {
  mode: "usb" | "wifi" | "bluetooth" | "simulation"
  usbMode: "ethernet" | "legacy"
  ipAddress: string
  port: number
  protocol: "adi" | "scp"
  autoDetect: boolean
  serialBaudRate: number
  serialDataBits: number
  serialStopBits: number
  serialParity: "none" | "even" | "odd"
  serialPort: string
  bluetoothDeviceName: string
  bluetoothServiceUUID: string
  bluetoothCharacteristicUUID: string
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error" | "detecting"

interface BluetoothDeviceInfo {
  id: string
  name: string
  connected: boolean
  device?: BluetoothDevice | any // Serial port stored in device field
  characteristic?: BluetoothRemoteGATTCharacteristic
}

export function CommunicationInterface() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected")
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectedDevices, setDetectedDevices] = useState<string[]>([])
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDeviceInfo[]>([])
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<BluetoothDeviceInfo | null>(null)
  const [currentReading, setCurrentReading] = useState<ScaleReading | null>(null)
  const [recentReadings, setRecentReadings] = useState<ScaleReading[]>([])
  const [errorMessage, setErrorMessage] = useState<string>("")

  const [config, setConfig] = useState<ConnectionConfig>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("scale-connection-config")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (error) {
          console.log("[v0] Error loading saved config:", error)
        }
      }
    }

    return {
      mode: "simulation", // Default to simulation mode for development
      usbMode: "ethernet",
      ipAddress: "192.168.7.1",
      port: 9000,
      protocol: "scp",
      autoDetect: true,
      serialBaudRate: 9600,
      serialDataBits: 8,
      serialStopBits: 1,
      serialParity: "none",
      serialPort: "COM21",
      bluetoothDeviceName: "XR5000",
      bluetoothServiceUUID: "0000ffe0-0000-1000-8000-00805f9b34fb",
      bluetoothCharacteristicUUID: "0000ffe1-0000-1000-8000-00805f9b34fb",
    }
  })

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("scale-connection-config", JSON.stringify(config))
    }
  }, [config])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedConnection = localStorage.getItem("scale-connection-state")
      if (savedConnection) {
        try {
          const state = JSON.parse(savedConnection)
          if (state.connected && config.mode === "simulation") {
            console.log("[v0] Scale connection restored from localStorage")
            setConnectionStatus("connected")
            startSimulationMode()
          }
        } catch (error) {
          console.log("[v0] Error restoring connection state:", error)
        }
      }
    }
  }, [])

  const startSimulationMode = () => {
    console.log("[v0] Starting simulation mode...")

    if (pollingRef.current) clearInterval(pollingRef.current)

    // Simulate weight readings with SCP protocol responses
    pollingRef.current = setInterval(() => {
      // Generate realistic weight readings
      const baseWeight = 450 + Math.random() * 200 // 450-650 kg range
      const isStable = Math.random() > 0.3 // 70% chance of stable reading
      const weight = isStable
        ? Math.round(baseWeight * 10) / 10
        : // Stable: round to 0.1 kg
          Math.round(baseWeight * 100) / 100 // Unstable: more decimal places

      // Simulate SCP response format: [123.5] or [U123.5]
      const scpResponse = isStable ? `[${weight}]` : `[U${weight}]`
      console.log("[v0] Simulated SCP response:", scpResponse)

      // Parse the simulated response
      parseSCPResponse(scpResponse)

      // Occasionally simulate animal ID
      if (Math.random() > 0.8) {
        const animalId = `BR${Math.floor(Math.random() * 900000 + 100000)}`
        console.log("[v0] Simulated animal ID:", animalId)
      }
    }, 2000) // Poll every 2 seconds like real scale
  }

  const checkBluetoothSupport = (): boolean => {
    if (!navigator.bluetooth) {
      setErrorMessage("Bluetooth não é suportado neste navegador. Use Chrome, Edge ou Opera.")
      return false
    }

    if (!window.isSecureContext) {
      setErrorMessage("Bluetooth requer conexão segura (HTTPS). Tente usar Web Serial como alternativa.")
      return false
    }

    // Check if Bluetooth is allowed by permissions policy
    if (typeof document !== "undefined" && document.featurePolicy) {
      try {
        const bluetoothAllowed = document.featurePolicy.allowsFeature("bluetooth")
        if (!bluetoothAllowed) {
          setErrorMessage("Bluetooth bloqueado por política de permissões. Use Web Serial como alternativa.")
          return false
        }
      } catch (error) {
        console.log("[v0] Could not check feature policy:", error)
      }
    }

    return true
  }

  const checkWebSerialSupport = (): boolean => {
    if (!("serial" in navigator)) {
      setErrorMessage("Web Serial API não é suportado neste navegador. Use Chrome ou Edge.")
      return false
    }
    return true
  }

  const scanSerialDevices = async () => {
    const apiSupport = checkAPISupport()
    if (!apiSupport.serial) {
      console.log("[v0] Web Serial API not supported or blocked")
      return
    }

    try {
      setIsDetecting(true)
      setErrorMessage("")
      console.log("[v0] Requesting serial port access...")

      // Request serial port access
      const port = await (navigator as any).serial.requestPort()

      if (port) {
        const deviceInfo: BluetoothDeviceInfo = {
          id: "serial-" + Date.now(),
          name: "Balança Serial (COM)",
          connected: false,
          device: port as any, // Store serial port in device field
        }

        setBluetoothDevices([deviceInfo])
        setDetectedDevices([`${deviceInfo.name} (Serial)`])
        console.log("[v0] Serial device selected")
      }
    } catch (error) {
      console.error("[v0] Serial port selection error:", error)
      if ((error as Error).name === "NotAllowedError") {
        console.log("[v0] Serial access denied by user")
      } else if ((error as Error).message.includes("permissions policy")) {
        console.log("[v0] Serial blocked by permissions policy")
      } else {
        console.log("[v0] Serial error:", (error as Error).message)
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const connectSerial = async (deviceInfo: BluetoothDeviceInfo) => {
    const port = deviceInfo.device as any // Serial port stored in device field
    if (!port) return

    try {
      setConnectionStatus("connecting")
      setErrorMessage("")
      console.log("[v0] Connecting to serial port...")

      // Open serial port with SCP protocol settings
      await port.open({
        baudRate: config.serialBaudRate,
        dataBits: config.serialDataBits,
        stopBits: config.serialStopBits,
        parity: config.serialParity,
      })

      // Set up reader for incoming data
      const reader = port.readable.getReader()

      // Update device info
      deviceInfo.connected = true
      setSelectedBluetoothDevice(deviceInfo)
      setConnectionStatus("connected")

      // Initialize SCP communication via serial
      await initializeSCPSerialCommunication(port)

      // Start reading data
      startSerialReading(reader)

      // Start polling for weight data
      startSerialPolling(port)

      console.log("[v0] Serial connection established")
    } catch (error) {
      console.error("[v0] Serial connection error:", error)
      setConnectionStatus("error")
      setErrorMessage("Erro na conexão serial: " + (error as Error).message)
    }
  }

  const initializeSCPSerialCommunication = async (port: any) => {
    try {
      console.log("[v0] Initializing SCP communication via serial...")

      // Send SCP commands to initialize communication
      await sendSCPSerialCommand(port, "{ZA1}") // Turn on acknowledgements
      await new Promise((resolve) => setTimeout(resolve, 100))

      await sendSCPSerialCommand(port, "{ZE1}") // Turn on error responses
      await new Promise((resolve) => setTimeout(resolve, 100))

      await sendSCPSerialCommand(port, "{ZC1}") // Turn on carriage returns
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Test communication with device name request
      await sendSCPSerialCommand(port, "{ZN}") // Request device name

      console.log("[v0] SCP serial communication initialized")
    } catch (error) {
      console.error("[v0] SCP serial initialization error:", error)
    }
  }

  const sendSCPSerialCommand = async (port: any, command: string): Promise<void> => {
    try {
      console.log("[v0] Sending SCP serial command:", command)
      const writer = port.writable.getWriter()
      const encoder = new TextEncoder()
      const data = encoder.encode(command)
      await writer.write(data)
      writer.releaseLock()
    } catch (error) {
      console.error("[v0] Error sending SCP serial command:", error)
      throw error
    }
  }

  const startSerialReading = async (reader: any) => {
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        const decoder = new TextDecoder()
        const receivedData = decoder.decode(value)
        console.log("[v0] Received serial data:", receivedData)

        // Parse SCP response
        parseSCPResponse(receivedData)
      }
    } catch (error) {
      console.error("[v0] Serial reading error:", error)
    } finally {
      reader.releaseLock()
    }
  }

  const startSerialPolling = (port: any) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        // Send weight request command as per SCP protocol
        await sendSCPSerialCommand(port, "{RW}")
      } catch (error) {
        console.error("[v0] Serial polling error:", error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const scanBluetoothDevices = async () => {
    const apiSupport = checkAPISupport()
    if (!apiSupport.bluetooth) {
      console.log("[v0] Bluetooth API not supported or blocked")
      return
    }

    try {
      setIsDetecting(true)
      setErrorMessage("")
      console.log("[v0] Scanning for Bluetooth devices...")

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          config.bluetoothServiceUUID,
          "0000ffe0-0000-1000-8000-00805f9b34fb", // Common UART service
          "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART service
        ],
      })

      if (device) {
        const deviceInfo: BluetoothDeviceInfo = {
          id: device.id,
          name: device.name || "Dispositivo Desconhecido",
          connected: false,
          device: device,
        }

        setBluetoothDevices([deviceInfo])
        setDetectedDevices([`${deviceInfo.name} (Bluetooth)`])
        console.log("[v0] Bluetooth device found:", deviceInfo.name)
      }
    } catch (error) {
      console.error("[v0] Bluetooth scan error:", error)
      if ((error as Error).message.includes("permissions policy")) {
        console.log("[v0] Bluetooth blocked by permissions policy")
      } else if ((error as Error).name === "NotAllowedError") {
        console.log("[v0] Bluetooth access denied by user")
      } else {
        console.log("[v0] Bluetooth error:", (error as Error).message)
      }
    } finally {
      setIsDetecting(false)
    }
  }

  const connectBluetooth = async (deviceInfo: BluetoothDeviceInfo) => {
    if (!deviceInfo.device) return

    try {
      setConnectionStatus("connecting")
      setErrorMessage("")
      console.log("[v0] Connecting to Bluetooth device:", deviceInfo.name)

      // Connect to GATT server
      const server = await deviceInfo.device.gatt?.connect()
      if (!server) throw new Error("Falha ao conectar ao servidor GATT")

      // Get primary service
      const service = await server.getPrimaryService(config.bluetoothServiceUUID)

      // Get characteristic for communication
      const characteristic = await service.getCharacteristic(config.bluetoothCharacteristicUUID)

      // Enable notifications for incoming data
      await characteristic.startNotifications()
      characteristic.addEventListener("characteristicvaluechanged", handleBluetoothData)

      // Update device info
      deviceInfo.connected = true
      deviceInfo.characteristic = characteristic
      setSelectedBluetoothDevice(deviceInfo)
      setConnectionStatus("connected")

      // Initialize SCP communication
      await initializeSCPCommunication(characteristic)

      // Start polling for weight data
      startBluetoothPolling(characteristic)

      console.log("[v0] Bluetooth connection established")
    } catch (error) {
      console.error("[v0] Bluetooth connection error:", error)
      setConnectionStatus("error")
      setErrorMessage("Erro na conexão Bluetooth: " + (error as Error).message)
    }
  }

  const initializeSCPCommunication = async (characteristic: BluetoothRemoteGATTCharacteristic) => {
    try {
      console.log("[v0] Initializing SCP communication...")

      // Send SCP commands to initialize communication as per documentation
      await sendSCPCommand(characteristic, "{ZA1}") // Turn on acknowledgements
      await new Promise((resolve) => setTimeout(resolve, 100))

      await sendSCPCommand(characteristic, "{ZE1}") // Turn on error responses
      await new Promise((resolve) => setTimeout(resolve, 100))

      await sendSCPCommand(characteristic, "{ZC1}") // Turn on carriage returns
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Test communication with device name request
      await sendSCPCommand(characteristic, "{ZN}") // Request device name

      console.log("[v0] SCP communication initialized")
    } catch (error) {
      console.error("[v0] SCP initialization error:", error)
    }
  }

  const sendSCPCommand = async (characteristic: BluetoothRemoteGATTCharacteristic, command: string): Promise<void> => {
    try {
      console.log("[v0] Sending SCP command:", command)
      const encoder = new TextEncoder()
      const data = encoder.encode(command)
      await characteristic.writeValue(data)
    } catch (error) {
      console.error("[v0] Error sending SCP command:", error)
      throw error
    }
  }

  const handleBluetoothData = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const value = characteristic.value
    if (!value) return

    const decoder = new TextDecoder()
    const receivedData = decoder.decode(value)
    console.log("[v0] Received Bluetooth data:", receivedData)

    // Parse SCP response according to protocol documentation
    parseSCPResponse(receivedData)
  }

  const parseSCPResponse = (data: string) => {
    try {
      console.log("[v0] Parsing SCP response:", data)

      // Handle weight response format: [123.5] or [U123.5] for unstable
      const weightMatch = data.match(/\[([U]?)([0-9]+\.?[0-9]*)\]/)
      if (weightMatch) {
        const isUnstable = weightMatch[1] === "U"
        const weight = Number.parseFloat(weightMatch[2])

        if (!isNaN(weight)) {
          const reading: ScaleReading = {
            weight: weight,
            timestamp: new Date(),
            stable: !isUnstable,
          }

          setCurrentReading(reading)
          setRecentReadings((prev) => [reading, ...prev.slice(0, 9)])
          console.log("[v0] Weight reading parsed:", reading)
        }
      }

      // Handle acknowledgement
      if (data.includes("^")) {
        console.log("[v0] SCP acknowledgement received")
      }

      // Handle error codes
      const errorMatch = data.match(/$$([A-F0-9]+)$$/)
      if (errorMatch) {
        const errorCode = errorMatch[1]
        console.log("[v0] SCP error code received:", errorCode)
        setErrorMessage(`Erro SCP: ${errorCode}`)
      }

      // Handle device name response
      if (data.includes("[3000]")) {
        console.log("[v0] Device identified as 3000 series scale")
      }
    } catch (error) {
      console.error("[v0] Error parsing SCP response:", error)
    }
  }

  const startBluetoothPolling = (characteristic: BluetoothRemoteGATTCharacteristic) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        // Send weight request command as per SCP protocol
        await sendSCPCommand(characteristic, "{RW}")
      } catch (error) {
        console.error("[v0] Bluetooth polling error:", error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const disconnectBluetooth = async () => {
    try {
      if (selectedBluetoothDevice?.device?.gatt?.connected) {
        selectedBluetoothDevice.device.gatt.disconnect()
      }

      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }

      setSelectedBluetoothDevice(null)
      setConnectionStatus("disconnected")
      setCurrentReading(null)
      setErrorMessage("")
      console.log("[v0] Bluetooth disconnected")
    } catch (error) {
      console.error("[v0] Bluetooth disconnect error:", error)
    }
  }

  const testConnection = async (baseUrl: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[v0] Testing direct connection to:", baseUrl)

      // Try direct connection first (like browser does)
      const response = await fetch(baseUrl, {
        method: "GET",
        signal: AbortSignal.timeout(10000),
        mode: "cors", // Allow cross-origin requests
        headers: {
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          // Use browser-like headers instead of ADI-specific ones
        },
      })

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}` }
      }

      const responseText = await response.text()
      console.log("[v0] Direct response received:", responseText.substring(0, 100))

      // Check if we got the Swagger documentation page (indicates XR5000 is responding)
      if (responseText.includes("Swagger") || responseText.includes("Animal Data Transfer REST API")) {
        return { success: true }
      }

      return { success: false, error: "Unexpected response format" }
    } catch (error) {
      console.log("[v0] Direct connection failed, error:", error)
      return { success: false, error: error instanceof Error ? error.message : "Connection failed" }
    }
  }

  const connectEthernet = async () => {
    try {
      setConnectionStatus("connecting")
      setErrorMessage("")
      const baseUrl = `http://${config.ipAddress}:${config.port}`
      const testResult = await testConnection(baseUrl)
      if (!testResult.success) throw new Error(`Falha na conexão: ${testResult.error}`)
      setConnectionStatus("connected")
      startDataPolling()
    } catch (error) {
      setConnectionStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Erro desconhecido")
    }
  }

  const startDataPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const baseUrl = `http://${config.ipAddress}:${config.port}`
        // Use correct ADI API endpoints as per XR5000 documentation
        const endpoints = ["/api/v1/sessions", "/api/v1/traits", "/api/v1/animals"]

        for (const endpoint of endpoints) {
          try {
            const fullUrl = baseUrl + endpoint
            console.log("[v0] Polling endpoint:", fullUrl)

            const response = await fetch(fullUrl, {
              method: "GET",
              signal: AbortSignal.timeout(8000),
              mode: "cors",
              headers: {
                Accept: "application/xml, text/xml, */*",
                "Content-Type": "application/xml",
              },
            })

            if (!response.ok) {
              console.log("[v0] Endpoint", endpoint, "returned status:", response.status)
              continue
            }

            const responseText = await response.text()
            console.log("[v0] Response from", endpoint, ":", responseText.substring(0, 200))

            // Check if response contains XML data
            if (responseText.includes("<?xml") || responseText.includes("<")) {
              const weightData = parseADIXMLData(responseText)
              if (weightData) {
                console.log("[v0] Parsed weight data:", weightData)
                setCurrentReading(weightData)
                setRecentReadings((prev) => [weightData, ...prev.slice(0, 9)])
                break
              }
            }
          } catch (endpointError) {
            console.log("[v0] Error polling", endpoint, ":", endpointError)
            continue
          }
        }
      } catch (error) {
        console.error("[v0] Polling error:", error)
      }
    }, 5000)
  }

  const parseADIXMLData = (xmlData: string): ScaleReading | null => {
    try {
      console.log("[v0] Parsing XML data:", xmlData.substring(0, 300))

      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlData, "text/xml")

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror")
      if (parserError) {
        console.log("[v0] XML parsing error:", parserError.textContent)
        return null
      }

      // Try different XML structures based on ADI documentation
      const animals = xmlDoc.querySelectorAll("animal")
      if (animals.length > 0) {
        const latestAnimal = animals[animals.length - 1]
        const traits = latestAnimal.querySelectorAll("trait")
        let weight: string | null = null

        traits.forEach((t) => {
          const name = t.querySelector("name")?.textContent
          if (name?.toLowerCase().includes("weight") || name?.toLowerCase().includes("peso")) {
            weight = t.querySelector("value")?.textContent || null
          }
        })

        const animalId =
          latestAnimal.getAttribute("id") ||
          latestAnimal.querySelector("id")?.textContent ||
          latestAnimal.querySelector("animalId")?.textContent

        if (weight && !isNaN(Number.parseFloat(weight))) {
          return {
            weight: Number.parseFloat(weight),
            animalId: animalId || undefined,
            timestamp: new Date(),
            stable: true,
          }
        }
      }

      // Try alternative XML structures
      const weightElements = xmlDoc.querySelectorAll("weight, Weight, WEIGHT")
      if (weightElements.length > 0) {
        const weightValue = weightElements[0].textContent
        if (weightValue && !isNaN(Number.parseFloat(weightValue))) {
          return {
            weight: Number.parseFloat(weightValue),
            timestamp: new Date(),
            stable: true,
          }
        }
      }

      return null
    } catch (error) {
      console.error("[v0] ADI XML parsing error:", error)
      return null
    }
  }

  const detectScale = async () => {
    setIsDetecting(true)
    setErrorMessage("")
    setDetectedDevices([])

    try {
      console.log("[v0] Starting scale detection...")
      setConnectionStatus("detecting")

      const apiSupport = checkAPISupport()

      if (config.mode === "simulation" || (!apiSupport.bluetooth && !apiSupport.serial)) {
        console.log("[v0] Using simulation mode - APIs not available or blocked")
        setDetectedDevices(["Balança Simulada (Modo Desenvolvimento)"])
        setConnectionStatus("disconnected")
        if (apiSupport.message) {
          setErrorMessage(apiSupport.message)
        }
        return
      }

      if (config.mode === "bluetooth") {
        try {
          if (apiSupport.serial) {
            console.log("[v0] Trying Web Serial API...")
            await scanSerialDevices()
          } else {
            console.log("[v0] Web Serial API not available or blocked")
          }

          // If no serial devices found and Bluetooth is available, try Bluetooth
          if (bluetoothDevices.length === 0 && apiSupport.bluetooth) {
            console.log("[v0] Trying Bluetooth...")
            await scanBluetoothDevices()
          } else if (!apiSupport.bluetooth) {
            console.log("[v0] Bluetooth API not available or blocked")
          }

          if (bluetoothDevices.length === 0) {
            console.log("[v0] No devices found, falling back to simulation mode")
            setDetectedDevices(["Balança Simulada (Modo Desenvolvimento)"])
            setErrorMessage("Nenhum dispositivo encontrado. Usando modo de simulação para desenvolvimento.")
          }
        } catch (error) {
          console.log("[v0] Connection methods failed:", error)
          setDetectedDevices(["Balança Simulada (Modo Desenvolvimento)"])
          setErrorMessage("Erro ao detectar dispositivos. Usando modo de simulação para desenvolvimento.")
        }
      } else if (config.mode === "usb" && config.usbMode === "ethernet") {
        const baseUrl = `http://${config.ipAddress}:${config.port}`
        const testResult = await testConnection(baseUrl)

        if (testResult.success) {
          setDetectedDevices([`XR5000 at ${config.ipAddress}:${config.port}`])
          setConnectionStatus("disconnected")
          console.log("[v0] XR5000 detected via Ethernet")
        } else {
          setDetectedDevices(["Balança Simulada (Modo Desenvolvimento)"])
          setErrorMessage(`Nenhuma balança detectada em ${config.ipAddress}:${config.port}. Usando modo de simulação.`)
          setConnectionStatus("disconnected")
        }
      }
    } catch (error) {
      console.log("[v0] Detection error:", error)
      setDetectedDevices(["Balança Simulada (Modo Desenvolvimento)"])
      setErrorMessage("Erro durante detecção. Usando modo de simulação para desenvolvimento.")
      setConnectionStatus("disconnected")
    } finally {
      setIsDetecting(false)
    }
  }

  const connectToScale = async () => {
    if (config.mode === "simulation") {
      setConnectionStatus("connecting")
      setErrorMessage("")

      // Simulate connection delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setConnectionStatus("connected")
      startSimulationMode()

      // Save connection state
      if (typeof window !== "undefined") {
        localStorage.setItem("scale-connection-state", JSON.stringify({ connected: true, mode: "simulation" }))
      }

      console.log("[v0] Connected to simulated scale")
      return
    }

    if (config.mode === "bluetooth" && bluetoothDevices.length > 0) {
      const device = bluetoothDevices[0]
      if (device.id.startsWith("serial-")) {
        await connectSerial(device)
      } else {
        await connectBluetooth(device)
      }
    } else if (config.mode === "usb" && config.usbMode === "ethernet") {
      await connectEthernet()
    } else {
      setErrorMessage("Nenhum dispositivo disponível para conexão")
      setConnectionStatus("error")
    }
  }

  const disconnectFromScale = async () => {
    if (config.mode === "simulation") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }

      setConnectionStatus("disconnected")
      setCurrentReading(null)
      setErrorMessage("")

      // Clear saved connection state
      if (typeof window !== "undefined") {
        localStorage.removeItem("scale-connection-state")
      }

      console.log("[v0] Disconnected from simulated scale")
      return
    }

    if (config.mode === "bluetooth") {
      if (selectedBluetoothDevice?.id.startsWith("serial-")) {
        // Disconnect serial port
        try {
          const port = selectedBluetoothDevice.device as any
          if (port && port.readable) {
            await port.close()
          }
        } catch (error) {
          console.error("[v0] Serial disconnect error:", error)
        }
      } else {
        await disconnectBluetooth()
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      setConnectionStatus("disconnected")
      setCurrentReading(null)
      setErrorMessage("")
      console.log("[v0] Disconnected from scale")
    }
  }

  const checkAPISupport = (): { bluetooth: boolean; serial: boolean; message: string } => {
    const bluetoothSupported = !!(navigator.bluetooth && window.isSecureContext)
    const serialSupported = !!((navigator as any).serial && window.isSecureContext)

    let bluetoothBlocked = false
    let serialBlocked = false

    // Check for permissions policy blocking
    if (typeof document !== "undefined" && document.featurePolicy) {
      try {
        bluetoothBlocked = !document.featurePolicy.allowsFeature("bluetooth")
        serialBlocked = !document.featurePolicy.allowsFeature("serial")
      } catch (error) {
        console.log("[v0] Could not check feature policy:", error)
      }
    }

    let message = ""
    if (bluetoothBlocked && serialBlocked) {
      message =
        "APIs de comunicação bloqueadas por política de segurança. Usando modo de simulação para desenvolvimento."
    } else if (!bluetoothSupported && !serialSupported) {
      message = "APIs nativas não disponíveis no ambiente de desenvolvimento. Usando modo de simulação."
    } else if (!window.isSecureContext) {
      message = "Conexão segura (HTTPS) necessária para APIs nativas. Usando modo de simulação."
    }

    return {
      bluetooth: bluetoothSupported && !bluetoothBlocked,
      serial: serialSupported && !serialBlocked,
      message,
    }
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Status Cards - Dashboard Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "error"
                    ? "bg-red-500"
                    : connectionStatus === "connecting" || connectionStatus === "detecting"
                      ? "bg-yellow-500 animate-pulse"
                      : "bg-muted-foreground/30"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connectionStatus === "connected" && "Conectado"}
              {connectionStatus === "connecting" && "Conectando"}
              {connectionStatus === "detecting" && "Detectando"}
              {connectionStatus === "disconnected" && "Desconectado"}
              {connectionStatus === "error" && "Erro"}
            </div>
            <p className="text-xs text-muted-foreground">
              {config.mode === "simulation" 
                ? "Modo simulacao" 
                : config.mode === "usb" && config.usbMode === "ethernet"
                  ? "USB Ethernet (ADI)"
                  : config.mode === "usb" && config.usbMode === "legacy"
                    ? "USB Serial (SCP)"
                    : config.mode === "wifi"
                      ? "Wi-Fi (ADI)"
                      : config.mode === "bluetooth"
                        ? "Bluetooth (SCP)"
                        : `Modo ${config.mode}`}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${currentReading?.stable ? "text-green-600" : currentReading ? "text-yellow-600" : ""}`}>
              {currentReading ? `${currentReading.stable ? "" : "~"}${currentReading.weight.toFixed(1)} kg` : "-- kg"}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentReading ? (currentReading.stable ? "Leitura estavel" : "Leitura instavel") : "Aguardando leitura"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leituras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentReadings.length}</div>
            <p className="text-xs text-muted-foreground">Leituras recentes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocolo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold uppercase">
              {(config.mode === "usb" && config.usbMode === "ethernet") || config.mode === "wifi" ? "ADI" : config.protocol}
            </div>
            <p className="text-xs text-muted-foreground">
              {(config.mode === "usb" && config.usbMode === "ethernet") || config.mode === "wifi" 
                ? "Animal Data Interface (REST API)" 
                : config.protocol === "scp" 
                  ? "Serial Communications Protocol" 
                  : "Animal Data Interface"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Connection Configuration */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Configuracao da Conexao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mode">Modo de Conexão</Label>
              <Select
                value={config.mode}
                onValueChange={(value: "usb" | "wifi" | "bluetooth" | "simulation") =>
                  setConfig({ ...config, mode: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulação (Desenvolvimento)</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.mode === "usb" && (
              <div>
                <Label htmlFor="usbMode">Modo USB</Label>
                <Select
                  value={config.usbMode}
                  onValueChange={(value: "ethernet" | "legacy") => setConfig({ ...config, usbMode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ethernet">Ethernet ADI</SelectItem>
                    <SelectItem value="legacy">Serial Legacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(config.mode === "bluetooth" || config.mode === "simulation") && (
              <div>
                <Label htmlFor="protocol">Protocolo</Label>
                <Select
                  value={config.protocol}
                  onValueChange={(value: "adi" | "scp") => setConfig({ ...config, protocol: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scp">SCP (Serial Communications Protocol)</SelectItem>
                    <SelectItem value="adi">ADI (Animal Data Interface)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {(config.mode === "usb" && config.usbMode === "ethernet") || config.mode === "wifi" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ipAddress">Endereço IP</Label>
                <Input
                  id="ipAddress"
                  value={config.ipAddress}
                  onChange={(e) => setConfig({ ...config, ipAddress: e.target.value })}
                  placeholder="192.168.7.1"
                />
              </div>
              <div>
                <Label htmlFor="port">Porta</Label>
                <Input
                  id="port"
                  type="number"
                  value={config.port}
                  onChange={(e) => setConfig({ ...config, port: Number.parseInt(e.target.value) || 9000 })}
                  placeholder="9000"
                />
              </div>
            </div>
          ) : null}

          {config.mode === "bluetooth" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bluetoothService">Service UUID</Label>
                <Input
                  id="bluetoothService"
                  value={config.bluetoothServiceUUID}
                  onChange={(e) => setConfig({ ...config, bluetoothServiceUUID: e.target.value })}
                  placeholder="0000ffe0-0000-1000-8000-00805f9b34fb"
                />
              </div>
              <div>
                <Label htmlFor="bluetoothCharacteristic">Characteristic UUID</Label>
                <Input
                  id="bluetoothCharacteristic"
                  value={config.bluetoothCharacteristicUUID}
                  onChange={(e) => setConfig({ ...config, bluetoothCharacteristicUUID: e.target.value })}
                  placeholder="0000ffe1-0000-1000-8000-00805f9b34fb"
                />
              </div>
            </div>
          )}

          {config.mode === "simulation" && (
            <Alert>
              <AlertDescription>
                Modo de simulação ativo. Dados de peso simulados serão gerados para desenvolvimento e testes. Use este
                modo quando as APIs nativas não estiverem disponíveis.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Connection Actions */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Controle de Conexao</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center space-x-3">
              <Badge
                variant={
                  connectionStatus === "connected"
                    ? "default"
                    : connectionStatus === "connecting" || connectionStatus === "detecting"
                      ? "secondary"
                      : connectionStatus === "error"
                        ? "destructive"
                        : "outline"
                }
                className="text-sm px-3 py-1"
              >
                {connectionStatus === "connected" && "Conectado"}
                {connectionStatus === "connecting" && "Conectando..."}
                {connectionStatus === "detecting" && "Detectando..."}
                {connectionStatus === "disconnected" && "Desconectado"}
                {connectionStatus === "error" && "Erro"}
              </Badge>
              {selectedBluetoothDevice && <Badge variant="outline">{selectedBluetoothDevice.name}</Badge>}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={detectScale}
                disabled={isDetecting || connectionStatus === "connecting"}
                variant="outline"
                className="bg-transparent"
              >
                {isDetecting
                  ? "Detectando..."
                  : config.mode === "bluetooth"
                    ? "Escanear Dispositivos"
                    : "Detectar Balanca"}
              </Button>
              {connectionStatus === "disconnected" && detectedDevices.length > 0 && (
                <Button onClick={connectToScale}>Conectar</Button>
              )}
              {connectionStatus === "connected" && (
                <Button onClick={disconnectFromScale} variant="outline" className="bg-transparent">
                  Desconectar
                </Button>
              )}
            </div>
          </div>

          {errorMessage && (
            <Alert className="mb-4 border-amber-200 bg-amber-50/50">
              <AlertDescription className="text-amber-800">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {detectedDevices.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Dispositivos Detectados:</h4>
              <ul className="space-y-2">
                {detectedDevices.map((device, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {device}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Reading - Large Display */}
      {connectionStatus === "connected" && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Leitura Atual</CardTitle>
          </CardHeader>
          <CardContent>
            {currentReading ? (
              <div className="text-center py-8">
                <div className={`text-6xl font-bold ${currentReading.stable ? "text-green-600" : "text-yellow-600"}`}>
                  {currentReading.stable ? "" : "~"}
                  {currentReading.weight.toFixed(1)}
                  <span className="text-3xl ml-2">kg</span>
                </div>
                {currentReading.animalId && (
                  <div className="text-lg text-muted-foreground mt-3">ID: {currentReading.animalId}</div>
                )}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Badge variant={currentReading.stable ? "default" : "secondary"}>
                    {currentReading.stable ? "Estavel" : "Instavel"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{currentReading.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-6xl font-bold mb-2">-- kg</div>
                <p>Aguardando leitura da balanca...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Readings */}
      {recentReadings.length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle>Leituras Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentReadings.map((reading, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className={`font-bold text-lg ${reading.stable ? "text-green-600" : "text-yellow-600"}`}>
                    {reading.stable ? "" : "~"}
                    {reading.weight.toFixed(1)} kg
                  </span>
                  {reading.animalId && <span className="text-sm text-muted-foreground">ID: {reading.animalId}</span>}
                  <span className="text-sm text-muted-foreground">{reading.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weighing Capture Component */}
      {connectionStatus === "connected" && (
        <WeighingCapture
          isConnected={connectionStatus === "connected"}
          currentWeight={currentReading?.weight || null}
          currentAnimalId={currentReading?.animalId || null}
          onWeightCaptured={(data) => {
            console.log("[v0] Weight captured:", data)
          }}
        />
      )}
    </div>
  )
}
