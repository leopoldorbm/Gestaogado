"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wifi, Usb, Bluetooth, Cable, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import {
  type XR5000Communication,
  createXR5000Connection,
  XR5000_CONFIGS,
  type XR5000ConnectionStatus,
} from "@/lib/xr5000-communication"

export default function XR5000CommunicationInterface() {
  const [selectedInterface, setSelectedInterface] = useState<string>("USB_ADI")
  const [connectionStatus, setConnectionStatus] = useState<XR5000ConnectionStatus>({
    connected: false,
    interface: "usb",
    protocol: "adi",
  })
  const [xr5000, setXR5000] = useState<XR5000Communication | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<any>(null)

  // Initialize XR5000 communication when interface changes
  useEffect(() => {
    const config = XR5000_CONFIGS[selectedInterface as keyof typeof XR5000_CONFIGS]
    const communication = createXR5000Connection(config)

    // Set up event listeners
    communication.on("connected", (status: XR5000ConnectionStatus) => {
      console.log("[XR5000] Connected:", status)
      setConnectionStatus(status)
      setIsConnecting(false)

      // Get device info after connection
      if (status.protocol === "adi") {
        communication
          .getDeviceInfo()
          .then((info) => setDeviceInfo(info))
          .catch((error) => console.error("[XR5000] Failed to get device info:", error))
      }
    })

    communication.on("disconnected", (status: XR5000ConnectionStatus) => {
      console.log("[XR5000] Disconnected:", status)
      setConnectionStatus(status)
      setDeviceInfo(null)
    })

    communication.on("connectionError", (status: XR5000ConnectionStatus) => {
      console.error("[XR5000] Connection error:", status)
      setConnectionStatus(status)
      setIsConnecting(false)
    })

    setXR5000(communication)
    setConnectionStatus(communication.getStatus())

    return () => {
      communication.disconnect()
    }
  }, [selectedInterface])

  const handleConnect = async () => {
    if (!xr5000) return

    setIsConnecting(true)

    try {
      const config = XR5000_CONFIGS[selectedInterface as keyof typeof XR5000_CONFIGS]

      if (config.protocol === "adi") {
        await xr5000.connectADI()
      } else if (config.protocol === "scp") {
        await xr5000.connectSCP()
      }
    } catch (error) {
      console.error("[XR5000] Connection failed:", error)
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!xr5000) return
    await xr5000.disconnect()
  }

  const getInterfaceIcon = (interfaceType: string) => {
    switch (interfaceType) {
      case "usb":
        return <Usb className="h-4 w-4" />
      case "wifi":
        return <Wifi className="h-4 w-4" />
      case "bluetooth":
        return <Bluetooth className="h-4 w-4" />
      case "serial":
        return <Cable className="h-4 w-4" />
      default:
        return <Usb className="h-4 w-4" />
    }
  }

  const getStatusIcon = () => {
    if (isConnecting) return <AlertCircle className="h-4 w-4 animate-spin" />
    if (connectionStatus.connected) return <CheckCircle className="h-4 w-4 text-green-500" />
    return <XCircle className="h-4 w-4 text-red-500" />
  }

  const getStatusColor = () => {
    if (isConnecting) return "yellow"
    if (connectionStatus.connected) return "green"
    return "red"
  }

  const getStatusText = () => {
    if (isConnecting) return "Conectando..."
    if (connectionStatus.connected) return "Conectado"
    return "Desconectado"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Usb className="h-5 w-5" />
            Comunicação XR5000 Real
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Interface Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Interface de Comunicação</label>
            <Select value={selectedInterface} onValueChange={setSelectedInterface}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USB_ADI">
                  <div className="flex items-center gap-2">
                    <Usb className="h-4 w-4" />
                    USB - Animal Data Interface (ADI)
                  </div>
                </SelectItem>
                <SelectItem value="USB_SCP">
                  <div className="flex items-center gap-2">
                    <Usb className="h-4 w-4" />
                    USB - Serial Command Protocol (SCP)
                  </div>
                </SelectItem>
                <SelectItem value="WIFI_ADI">
                  <div className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    Wi-Fi - Animal Data Interface (ADI)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getInterfaceIcon(connectionStatus.interface)}
              <div>
                <div className="font-medium">Status da Conexão</div>
                <div className="text-sm text-muted-foreground">
                  {connectionStatus.interface.toUpperCase()} - {connectionStatus.protocol.toUpperCase()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <Badge variant={getStatusColor() as any}>{getStatusText()}</Badge>
            </div>
          </div>

          {/* Connection Details */}
          {selectedInterface && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Detalhes da Conexão</label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                {(() => {
                  const config = XR5000_CONFIGS[selectedInterface as keyof typeof XR5000_CONFIGS]
                  return (
                    <div className="space-y-1">
                      <div>
                        <strong>Interface:</strong> {config.interface.toUpperCase()}
                      </div>
                      <div>
                        <strong>Protocolo:</strong> {config.protocol.toUpperCase()}
                      </div>
                      <div>
                        <strong>Endereço IP:</strong> {config.ipAddress}
                      </div>
                      <div>
                        <strong>Porta:</strong> {config.port}
                      </div>
                      {config.protocol === "adi" && (
                        <div>
                          <strong>API:</strong> http://{config.ipAddress}:{config.port}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* Error Display */}
          {connectionStatus.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Erro de conexão: {connectionStatus.error}</AlertDescription>
            </Alert>
          )}

          {/* Device Info */}
          {deviceInfo && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Informações do Dispositivo</label>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <pre>{JSON.stringify(deviceInfo, null, 2)}</pre>
              </div>
            </div>
          )}

          {/* Connection Controls */}
          <div className="flex gap-2">
            {!connectionStatus.connected ? (
              <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
                {isConnecting ? "Conectando..." : "Conectar XR5000"}
              </Button>
            ) : (
              <Button onClick={handleDisconnect} variant="outline" className="flex-1 bg-transparent">
                Desconectar
              </Button>
            )}
          </div>

          {/* Instructions */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Instruções:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• Para USB: Conecte o cabo USB e configure a balança para modo "Ethernet"</li>
                <li>• Para Wi-Fi: Ative o "Wi-Fi Data Link" na tela inicial da balança</li>
                <li>• ADI: Interface REST/XML para transferência de dados completa</li>
                <li>• SCP: Protocolo de comandos seriais para compatibilidade legada</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
