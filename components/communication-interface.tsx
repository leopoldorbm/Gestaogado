"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Usb, Wifi, Settings, CheckCircle, XCircle, AlertCircle, Scale, Activity, RefreshCw, Info } from "lucide-react"
import { useScaleConnection } from "@/contexts/scale-connection-context"

interface ScaleData {
  ide?: string // ID Eletrônico
  idv?: string // ID Visual
  weight: number
  timestamp: string
  stable: boolean
}

interface ConnectionConfig {
  mode: "usb" | "wifi"
  usbMode: "ethernet" | "legacy"
  autoDetect: boolean
  selectedPort?: string
  ipAddress: string
  protocol: "adi" | "scp" | "ascii"
  manualConnection: boolean
}

export function CommunicationInterface() {
  const {
    isConnected,
    connectionStatus: globalConnectionStatus,
    liveWeight,
    lastReadingTime,
    connectToScale: globalConnectToScale,
    disconnectFromScale: globalDisconnectFromScale,
  } = useScaleConnection()

  const [isConnecting, setIsConnecting] = useState(false)
  const [availablePorts, setAvailablePorts] = useState<string[]>([])
  const [scaleData, setScaleData] = useState<ScaleData | null>(null)
  const [recentReadings, setRecentReadings] = useState<ScaleData[]>([])
  const [activePort, setActivePort] = useState<string>("COM7")
  const [webSerialSupported, setWebSerialSupported] = useState(false)
  const [connectionMode, setConnectionMode] = useState<"real" | "simulation">("simulation")
  const [config, setConfig] = useState<ConnectionConfig>({
    mode: "usb",
    usbMode: "ethernet",
    autoDetect: true,
    selectedPort: "COM7",
    ipAddress: "192.168.7.1",
    protocol: "adi",
    manualConnection: false,
  })

  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkWebSerialSupport = () => {
    const supported = "serial" in navigator && typeof (navigator as any).serial?.getPorts === "function"
    setWebSerialSupported(supported)
    console.log("[v0] Web Serial API supported:", supported)
    return supported
  }

  const detectPorts = async () => {
    console.log("[v0] Detecting available COM ports...")

    // Always provide common COM ports for manual selection
    const commonPorts = ["COM7", "COM6", "COM8", "COM5", "COM9", "COM10", "COM3", "COM4"]
    setAvailablePorts(commonPorts)

    if (config.autoDetect) {
      const preferredPort = "COM7" // XR5000 is typically on COM7
      setConfig((prev) => ({ ...prev, selectedPort: preferredPort }))
      setActivePort(preferredPort)
      console.log("[v0] Auto-selected port:", preferredPort)
    }

    console.log("[v0] Available ports:", commonPorts)
  }

  const connectToScale = async () => {
    setIsConnecting(true)
    const selectedPort = config.selectedPort || "COM7"
    setActivePort(selectedPort)
    console.log("[v0] Attempting to connect to scale on port:", selectedPort)

    try {
      // Save connection config to localStorage for persistence
      localStorage.setItem("scaleConnectionConfig", JSON.stringify(config))

      console.log("[v0] Connection config:", {
        mode: config.mode,
        protocol: config.protocol,
        port: selectedPort,
        autoDetect: config.autoDetect,
        manualConnection: config.manualConnection,
      })

      const success = await globalConnectToScale()

      if (success) {
        console.log("[v0] Successfully connected to scale on port:", selectedPort)
        setActivePort(selectedPort)

        if (config.manualConnection) {
          setConnectionMode("real")
          console.log("[v0] Manual connection mode - assuming real scale connection")
          startManualDataMode()
        } else {
          setConnectionMode("simulation")
          console.log("[v0] Simulation mode - generating test data")
          startDataSimulation()
        }
      } else {
        console.error("[v0] Failed to connect to scale on port:", selectedPort)
      }
    } catch (error) {
      console.error("[v0] Connection failed:", error)
    } finally {
      setIsConnecting(false)
    }
  }

  const startManualDataMode = () => {
    console.log("[v0] Starting manual data mode for real scale connection")
    console.log("[v0] Waiting for real data from XR5000 on port:", activePort)

    // Clear any existing simulation
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
      simulationIntervalRef.current = null
    }

    // In manual mode, we wait for real data input
    // This would be replaced with actual serial communication in a desktop app
    console.log("[v0] Manual mode active - scale should be sending data to port", activePort)
  }

  const startDataSimulation = () => {
    console.log("[v0] Starting data simulation for testing...")
    console.log("[v0] Simulating data from port:", activePort)

    // Clear any existing interval
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
    }

    simulationIntervalRef.current = setInterval(() => {
      if (!isConnected) {
        if (simulationIntervalRef.current) {
          clearInterval(simulationIntervalRef.current)
          simulationIntervalRef.current = null
        }
        return
      }

      // Generate more realistic test data
      const mockData: ScaleData = {
        ide: Math.random() > 0.5 ? `BR${Math.floor(Math.random() * 900000000000) + 100000000000}` : undefined,
        idv: Math.floor(Math.random() * 9000) + 1000, // 4-digit IDV
        weight: Math.floor(Math.random() * 300) + 250, // 250-550kg range
        timestamp: new Date().toISOString(),
        stable: Math.random() > 0.3, // 70% chance de peso estável
      }

      console.log("[v0] Simulated scale data from port", activePort, ":", mockData)
      setScaleData(mockData)
      setRecentReadings((prev) => [mockData, ...prev.slice(0, 9)])
    }, 4000) // Slightly slower for more realistic timing
  }

  const disconnectFromScale = async () => {
    console.log("[v0] Disconnecting from scale...")

    // Clear simulation interval
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current)
      simulationIntervalRef.current = null
    }

    globalDisconnectFromScale()
    setScaleData(null)
    setRecentReadings([])
    setConnectionMode("simulation")
  }

  const handleManualDataInput = (rawData: string) => {
    console.log("[v0] Processing manual data input:", rawData)

    try {
      // Parse manual input (format: "IDV,Weight" or "IDE,Weight" or just "Weight")
      const parts = rawData.split(",")
      let parsedData: ScaleData | null = null

      if (parts.length >= 2) {
        const id = parts[0].trim()
        const weight = Number.parseFloat(parts[1].trim())

        if (!isNaN(weight)) {
          parsedData = {
            ide: id.startsWith("982") || id.startsWith("BR") ? id : undefined,
            idv: !id.startsWith("982") && !id.startsWith("BR") ? id : undefined,
            weight: weight,
            timestamp: new Date().toISOString(),
            stable: true,
          }
        }
      } else {
        const weight = Number.parseFloat(rawData.trim())
        if (!isNaN(weight)) {
          parsedData = {
            weight: weight,
            timestamp: new Date().toISOString(),
            stable: true,
          }
        }
      }

      if (parsedData) {
        console.log("[v0] Parsed manual data:", parsedData)
        setScaleData(parsedData)
        setRecentReadings((prev) => [parsedData!, ...prev.slice(0, 9)])
      }
    } catch (error) {
      console.error("[v0] Error parsing manual data:", error)
    }
  }

  useEffect(() => {
    checkWebSerialSupport()
    detectPorts()

    // Load saved connection config
    const savedConfig = localStorage.getItem("scaleConnectionConfig")
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        setConfig(parsedConfig)
      } catch (error) {
        console.error("[v0] Failed to load saved config:", error)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current)
      }
    }
  }, [])

  const getStatusColor = () => {
    if (isConnected) return "text-green-600"
    if (isConnecting) return "text-yellow-600"
    if (globalConnectionStatus.includes("Erro")) return "text-red-600"
    return "text-gray-600"
  }

  const getStatusIcon = () => {
    if (isConnected) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (isConnecting) return <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin" />
    if (globalConnectionStatus.includes("Erro")) return <XCircle className="h-5 w-5 text-red-600" />
    return <AlertCircle className="h-5 w-5 text-gray-600" />
  }

  return (
    <div className="space-y-6">
      {!webSerialSupported && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Modo de Compatibilidade:</strong> O Web Serial API não está disponível neste ambiente. Para conexão
            real com a balança XR5000, use o modo manual ou uma aplicação desktop.
          </AlertDescription>
        </Alert>
      )}

      {/* Status da Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Status da Balança Tru-Test XR5000
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <p className={`font-semibold ${getStatusColor()}`}>{globalConnectionStatus}</p>
                <p className="text-sm text-muted-foreground">
                  {isConnected
                    ? `Protocolo: ${config.protocol.toUpperCase()} via ${config.mode.toUpperCase()} (${activePort}) - ${connectionMode.toUpperCase()}`
                    : "Aguardando conexão"}
                </p>
                {lastReadingTime && <p className="text-xs text-muted-foreground">Última leitura: {lastReadingTime}</p>}
              </div>
            </div>

            <div className="flex gap-2">
              {!isConnected ? (
                <Button onClick={connectToScale} disabled={isConnecting}>
                  {isConnecting ? "Conectando..." : "Conectar"}
                </Button>
              ) : (
                <Button variant="outline" onClick={disconnectFromScale}>
                  Desconectar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações de Conexão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações de Comunicação
            </CardTitle>
            <CardDescription>Configure a conexão com a balança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="manual-connection"
                checked={config.manualConnection}
                onCheckedChange={(checked) => setConfig((prev) => ({ ...prev, manualConnection: checked }))}
              />
              <Label htmlFor="manual-connection">Conexão manual (balança real conectada)</Label>
            </div>

            {config.manualConnection && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Modo manual ativado. Certifique-se de que a balança XR5000 está conectada na porta{" "}
                  {config.selectedPort || "COM7"}e configurada para enviar dados via protocolo{" "}
                  {config.protocol.toUpperCase()}.
                </AlertDescription>
              </Alert>
            )}

            {/* Modo de Conexão */}
            <div className="space-y-2">
              <Label>Modo de Conexão</Label>
              <Select
                value={config.mode}
                onValueChange={(value: "usb" | "wifi") => setConfig((prev) => ({ ...prev, mode: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usb">
                    <div className="flex items-center gap-2">
                      <Usb className="h-4 w-4" />
                      USB (Recomendado)
                    </div>
                  </SelectItem>
                  <SelectItem value="wifi">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4" />
                      Wi-Fi
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config.mode === "usb" && (
              <>
                {/* Seleção de Porta */}
                <div className="space-y-2">
                  <Label>Porta USB</Label>
                  <div className="flex gap-2">
                    <Select
                      value={config.selectedPort}
                      onValueChange={(value) => {
                        setConfig((prev) => ({ ...prev, selectedPort: value }))
                        setActivePort(value)
                        console.log("[v0] Selected port:", value)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma porta" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePorts.map((port) => (
                          <SelectItem key={port} value={port}>
                            {port} {port === "COM7" && "(Recomendado para XR5000)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={detectPorts}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    A balança XR5000 geralmente está conectada na porta COM7
                  </p>
                </div>

                {/* Protocolo */}
                <div className="space-y-2">
                  <Label>Protocolo de Comunicação</Label>
                  <Select
                    value={config.protocol}
                    onValueChange={(value: "adi" | "scp" | "ascii") =>
                      setConfig((prev) => ({ ...prev, protocol: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adi">ADI (Animal Data Interface)</SelectItem>
                      <SelectItem value="ascii">ASCII (Caracteres simples)</SelectItem>
                      <SelectItem value="scp">SCP (Legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {config.mode === "wifi" && (
              <div className="space-y-2">
                <Label>Endereço IP Wi-Fi</Label>
                <Input
                  value={config.ipAddress}
                  onChange={(e) => setConfig((prev) => ({ ...prev, ipAddress: e.target.value }))}
                  placeholder="192.168.8.1"
                />
                <p className="text-sm text-muted-foreground">
                  Conecte-se à rede Wi-Fi da balança (XR5000-XXXX) antes de conectar
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados Recebidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Dados Recebidos
            </CardTitle>
            <CardDescription>
              Últimas leituras da balança
              {connectionMode === "simulation" && " (Simulação)"}
              {connectionMode === "real" && " (Balança Real)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scaleData ? (
              <div className="space-y-4">
                {/* Leitura Atual */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Leitura Atual</h4>
                    <div className="flex gap-2">
                      <Badge variant={scaleData.stable ? "default" : "secondary"}>
                        {scaleData.stable ? "Estável" : "Instável"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {activePort}
                      </Badge>
                      <Badge variant={connectionMode === "real" ? "default" : "secondary"} className="text-xs">
                        {connectionMode === "real" ? "REAL" : "SIM"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {scaleData.idv && (
                      <div>
                        <p className="text-muted-foreground">IDV (Marca a Fogo)</p>
                        <p className="font-semibold">{scaleData.idv}</p>
                      </div>
                    )}

                    {scaleData.ide && (
                      <div>
                        <p className="text-muted-foreground">IDE (Brinco)</p>
                        <p className="font-semibold">{scaleData.ide}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground">Peso</p>
                      <p className="text-xl font-bold">{scaleData.weight} kg</p>
                    </div>

                    <div>
                      <p className="text-muted-foreground">Horário</p>
                      <p className="font-semibold">{new Date(scaleData.timestamp).toLocaleTimeString("pt-BR")}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Histórico Recente */}
                <div>
                  <h4 className="font-semibold mb-2">Leituras Recentes</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {recentReadings.map((reading, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {reading.idv || reading.ide || "N/A"}
                          </Badge>
                          <span className="font-semibold">{reading.weight} kg</span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(reading.timestamp).toLocaleTimeString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Scale className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum dado recebido</p>
                <p className="text-sm">
                  {config.manualConnection ? "Aguardando dados da balança real" : "Conecte-se para iniciar simulação"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
