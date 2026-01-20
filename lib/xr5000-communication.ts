// XR5000 Real Communication Library
// Based on Tru-Test 5000 Series SDK Documentation

export interface XR5000Config {
  interface: "usb" | "wifi" | "serial" | "bluetooth"
  ipAddress: string
  port: number
  protocol: "adi" | "scp" | "ascii"
}

export interface XR5000AnimalData {
  id: string
  visualId?: string
  electronicId?: string
  weight: number
  stable: boolean
  timestamp: string
  sessionId?: string
}

export interface XR5000ConnectionStatus {
  connected: boolean
  interface: string
  protocol: string
  lastResponse?: string
  error?: string
}

export class XR5000Communication {
  private config: XR5000Config
  private connectionStatus: XR5000ConnectionStatus
  private eventListeners: Map<string, Function[]> = new Map()

  constructor(config: XR5000Config) {
    this.config = config
    this.connectionStatus = {
      connected: false,
      interface: config.interface,
      protocol: config.protocol,
    }
  }

  // Animal Data Interface (ADI) - REST API Communication
  async connectADI(): Promise<boolean> {
    try {
      console.log("[XR5000] Attempting ADI connection...")

      const baseUrl = `http://${this.config.ipAddress}:${this.config.port}`

      // Test connection with device info endpoint
      const response = await fetch(`${baseUrl}/`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      if (response.ok) {
        const deviceInfo = await response.text()
        console.log("[XR5000] ADI connection successful:", deviceInfo)

        this.connectionStatus = {
          connected: true,
          interface: this.config.interface,
          protocol: "adi",
          lastResponse: deviceInfo,
        }

        this.emit("connected", this.connectionStatus)
        return true
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error("[XR5000] ADI connection failed:", error)
      this.connectionStatus = {
        connected: false,
        interface: this.config.interface,
        protocol: "adi",
        error: error instanceof Error ? error.message : "Unknown error",
      }

      this.emit("connectionError", this.connectionStatus)
      return false
    }
  }

  // Serial Command Protocol (SCP) Communication
  async connectSCP(): Promise<boolean> {
    try {
      console.log("[XR5000] Attempting SCP connection...")

      // For SCP, we need to send commands to test connection
      // {ZA1} - Turn on acknowledgements
      const testCommand = "{ZA1}"
      const response = await this.sendSCPCommand(testCommand)

      if (response === "^") {
        // Acknowledgement character
        console.log("[XR5000] SCP connection successful")

        this.connectionStatus = {
          connected: true,
          interface: this.config.interface,
          protocol: "scp",
          lastResponse: response,
        }

        this.emit("connected", this.connectionStatus)
        return true
      } else {
        throw new Error("Invalid SCP response")
      }
    } catch (error) {
      console.error("[XR5000] SCP connection failed:", error)
      this.connectionStatus = {
        connected: false,
        interface: this.config.interface,
        protocol: "scp",
        error: error instanceof Error ? error.message : "Unknown error",
      }

      this.emit("connectionError", this.connectionStatus)
      return false
    }
  }

  // Send SCP Command
  private async sendSCPCommand(command: string): Promise<string> {
    // This would need to be implemented based on the actual interface
    // For USB: Use Web Serial API or native serial communication
    // For Bluetooth: Use Web Bluetooth API
    // For Serial: Direct serial port communication

    console.log("[XR5000] Sending SCP command:", command)

    // Placeholder - actual implementation depends on interface
    throw new Error("SCP command sending not implemented for this interface")
  }

  // Get Device Information using ADI
  async getDeviceInfo(): Promise<any> {
    if (!this.connectionStatus.connected || this.config.protocol !== "adi") {
      throw new Error("ADI connection required")
    }

    try {
      const baseUrl = `http://${this.config.ipAddress}:${this.config.port}`
      const response = await fetch(`${baseUrl}/device`, {
        method: "GET",
        headers: { Accept: "application/json" },
      })

      if (response.ok) {
        return await response.json()
      } else {
        throw new Error(`Failed to get device info: ${response.statusText}`)
      }
    } catch (error) {
      console.error("[XR5000] Failed to get device info:", error)
      throw error
    }
  }

  // Get Sessions using ADI
  async getSessions(): Promise<any[]> {
    if (!this.connectionStatus.connected || this.config.protocol !== "adi") {
      throw new Error("ADI connection required")
    }

    try {
      const baseUrl = `http://${this.config.ipAddress}:${this.config.port}`
      const response = await fetch(`${baseUrl}/sessions`, {
        method: "GET",
        headers: { Accept: "application/xml" },
      })

      if (response.ok) {
        const xmlData = await response.text()
        // Parse XML data - would need XML parser
        console.log("[XR5000] Sessions data received:", xmlData)
        return [] // Placeholder
      } else {
        throw new Error(`Failed to get sessions: ${response.statusText}`)
      }
    } catch (error) {
      console.error("[XR5000] Failed to get sessions:", error)
      throw error
    }
  }

  // Get Live Weight Data using SCP
  async getLiveWeight(): Promise<XR5000AnimalData | null> {
    if (!this.connectionStatus.connected) {
      throw new Error("Connection required")
    }

    try {
      if (this.config.protocol === "scp") {
        // Use SCP commands to get current weight
        // This would involve sending specific SCP commands
        console.log("[XR5000] Getting live weight via SCP...")
        // Placeholder - actual implementation needed
        return null
      } else if (this.config.protocol === "adi") {
        // Use ADI to get current session data
        console.log("[XR5000] Getting live weight via ADI...")
        // Placeholder - actual implementation needed
        return null
      }

      return null
    } catch (error) {
      console.error("[XR5000] Failed to get live weight:", error)
      throw error
    }
  }

  // Disconnect from XR5000
  async disconnect(): Promise<void> {
    console.log("[XR5000] Disconnecting...")

    this.connectionStatus = {
      connected: false,
      interface: this.config.interface,
      protocol: this.config.protocol,
    }

    this.emit("disconnected", this.connectionStatus)
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  // Get connection status
  getStatus(): XR5000ConnectionStatus {
    return { ...this.connectionStatus }
  }
}

// Factory function to create XR5000 communication instance
export function createXR5000Connection(config: Partial<XR5000Config>): XR5000Communication {
  const defaultConfig: XR5000Config = {
    interface: "usb",
    ipAddress: "192.168.7.1", // Default USB Ethernet IP
    port: 9000, // Default ADI port
    protocol: "adi",
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new XR5000Communication(finalConfig)
}

// Predefined configurations based on SDK documentation
export const XR5000_CONFIGS = {
  USB_ADI: {
    interface: "usb" as const,
    ipAddress: "192.168.7.1",
    port: 9000,
    protocol: "adi" as const,
  },
  USB_SCP: {
    interface: "usb" as const,
    ipAddress: "192.168.7.1",
    port: 9000,
    protocol: "scp" as const,
  },
  WIFI_ADI: {
    interface: "wifi" as const,
    ipAddress: "192.168.8.1",
    port: 9000,
    protocol: "adi" as const,
  },
}
