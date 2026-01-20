interface BluetoothDeviceInfo {
  id: string
  name: string
  connected: boolean
}

interface BluetoothDetectionResult {
  success: boolean
  devices: BluetoothDeviceInfo[]
  error?: string
}

export const detectBluetoothDevices = async (): Promise<BluetoothDetectionResult> => {
  try {
    // Check if Web Bluetooth API is supported
    if (!navigator.bluetooth) {
      return {
        success: false,
        devices: [],
        error: "Web Bluetooth API não suportada neste navegador",
      }
    }

    console.log("[v0] Starting Bluetooth device detection...")

    // Check if Bluetooth is available
    const isAvailable = await navigator.bluetooth.getAvailability()
    if (!isAvailable) {
      return {
        success: false,
        devices: [],
        error: "Bluetooth não está disponível no dispositivo",
      }
    }

    // Get already paired devices
    const devices: BluetoothDeviceInfo[] = []

    try {
      const pairedDevices = await navigator.bluetooth.getDevices()

      for (const device of pairedDevices) {
        if (
          device.name &&
          (device.name.includes("XR") ||
            device.name.includes("Tru-Test") ||
            device.name.includes("5000") ||
            device.name.toLowerCase().includes("scale"))
        ) {
          devices.push({
            id: device.id,
            name: device.name,
            connected: device.gatt?.connected || false,
          })
        }
      }

      console.log(`[v0] Found ${devices.length} paired Bluetooth devices`)
    } catch (error) {
      console.log("[v0] No paired devices found or permission denied")
    }

    // If no paired devices found, try to scan for new devices
    if (devices.length === 0) {
      try {
        console.log("[v0] Scanning for new Bluetooth devices...")

        // Request device with filters for XR5000/Tru-Test devices
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: "XR" }, { namePrefix: "Tru-Test" }, { name: "XR5000" }, { name: "ID5000" }],
          optionalServices: [
            "0000ffe0-0000-1000-8000-00805f9b34fb", // Common UART service
            "6e400001-b5a3-f393-e0a9-e50e24dcca9e", // Nordic UART service
            "0000180f-0000-1000-8000-00805f9b34fb", // Battery service
          ],
        })

        if (device && device.name) {
          devices.push({
            id: device.id,
            name: device.name,
            connected: device.gatt?.connected || false,
          })

          console.log(`[v0] Found new device: ${device.name}`)
        }
      } catch (scanError) {
        console.log("[v0] User cancelled device selection or no devices found")
      }
    }

    return {
      success: true,
      devices: devices,
      error: devices.length === 0 ? "Nenhum dispositivo XR5000/Tru-Test encontrado" : undefined,
    }
  } catch (error) {
    console.error("[v0] Bluetooth detection error:", error)
    return {
      success: false,
      devices: [],
      error: error instanceof Error ? error.message : "Erro desconhecido na detecção Bluetooth",
    }
  }
}

export const connectToBluetoothDevice = async (
  deviceName: string,
  serviceUUID: string,
  characteristicUUID: string,
): Promise<{
  success: boolean
  device?: BluetoothDevice
  characteristic?: BluetoothRemoteGATTCharacteristic
  error?: string
}> => {
  try {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth API não suportada")
    }

    console.log(`[v0] Connecting to Bluetooth device: ${deviceName}`)

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: deviceName }],
      optionalServices: [serviceUUID],
    })

    if (!device.gatt) {
      throw new Error("GATT não disponível no dispositivo")
    }

    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(serviceUUID)
    const characteristic = await service.getCharacteristic(characteristicUUID)

    console.log(`[v0] Successfully connected to ${deviceName}`)

    return {
      success: true,
      device,
      characteristic,
    }
  } catch (error) {
    console.error("[v0] Bluetooth connection error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro na conexão Bluetooth",
    }
  }
}

export const sendBluetoothCommand = async (
  characteristic: BluetoothRemoteGATTCharacteristic,
  command: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(command + "\r\n")

    await characteristic.writeValue(data)

    console.log(`[v0] Bluetooth command sent: ${command}`)
    return { success: true }
  } catch (error) {
    console.error("[v0] Bluetooth command error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao enviar comando Bluetooth",
    }
  }
}

export const parseBluetoothWeightData = (
  data: string,
): {
  weight?: number
  animalId?: string
  stable?: boolean
  unit?: string
} | null => {
  try {
    // Parse different XR5000 Bluetooth data formats

    // Format 1: W 123.5 kg S (Weight with stable indicator)
    const format1 = data.match(/W\s+([0-9]+\.?[0-9]*)\s*(kg|lb)?\s*(S)?/i)
    if (format1) {
      return {
        weight: Number.parseFloat(format1[1]),
        unit: format1[2] || "kg",
        stable: !!format1[3],
      }
    }

    // Format 2: Weight:123.5,ID:ABC123,Stable:1
    const format2 = data.match(/Weight:([0-9]+\.?[0-9]*),?.*?(?:ID:([A-Z0-9]+),?)?.*?(?:Stable:([01]))?/i)
    if (format2) {
      return {
        weight: Number.parseFloat(format2[1]),
        animalId: format2[2],
        stable: format2[3] === "1",
        unit: "kg",
      }
    }

    // Format 3: Simple weight value
    const format3 = data.match(/([0-9]+\.?[0-9]*)/i)
    if (format3) {
      const weight = Number.parseFloat(format3[1])
      if (weight > 0 && weight < 10000) {
        // Reasonable weight range
        return {
          weight,
          unit: "kg",
          stable: true,
        }
      }
    }

    return null
  } catch (error) {
    console.error("[v0] Bluetooth data parsing error:", error)
    return null
  }
}
