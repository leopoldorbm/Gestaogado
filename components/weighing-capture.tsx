"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Scale, Zap, CheckCircle, AlertCircle, Pause, Play } from "lucide-react"

interface WeightReading {
  weight: number | null
  unit: string
  animalId: string | null
  stable: boolean
  timestamp: string
  raw: string
}

interface WeighingCaptureProps {
  isConnected: boolean
  connectionStatus: string
  onWeightCaptured?: (reading: WeightReading) => void
}

export function WeighingCapture({ isConnected, connectionStatus, onWeightCaptured }: WeighingCaptureProps) {
  const [currentReading, setCurrentReading] = useState<WeightReading | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedReadings, setCapturedReadings] = useState<WeightReading[]>([])
  const [error, setError] = useState<string | null>(null)

  // Auto-capture when connected and stable reading available
  useEffect(() => {
    if (!isConnected || !isCapturing) return

    const interval = setInterval(async () => {
      try {
        console.log("[v0] Fetching weight data...")

        const response = await fetch("/api/serial-proxy?action=read&port=COM21", {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        })

        console.log("[v0] Response status:", response.status)
        console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] API response error:", response.status, errorText)
          setError(`API Error: ${response.status}`)
          return
        }

        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await response.text()
          console.error("[v0] Non-JSON response received:", responseText.substring(0, 200))
          setError("Invalid response format from scale API")
          return
        }

        let result
        try {
          const responseText = await response.text()
          console.log("[v0] Raw response text:", responseText.substring(0, 200))
          result = JSON.parse(responseText)
        } catch (parseError) {
          console.error("[v0] JSON parse error:", parseError)
          setError("Failed to parse response from scale API")
          return
        }

        console.log("[v0] Parsed result:", result)

        if (result.success && result.data) {
          const reading: WeightReading = {
            weight: result.data.weight,
            unit: result.data.unit || "kg",
            animalId: result.data.animalId,
            stable: result.data.stable,
            timestamp: result.data.timestamp,
            raw: result.data.raw,
          }

          setCurrentReading(reading)
          setError(null)

          // Auto-capture stable readings with weight
          if (reading.stable && reading.weight && reading.weight > 0) {
            handleCaptureReading(reading)
          }
        } else if (result.data === null) {
          // No data available - this is normal
          setError(null)
        } else {
          setError(result.error || "Failed to read weight data")
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error"
        console.error("[v0] Weight reading error:", err)

        if (errorMessage.includes("JSON") || errorMessage.includes("Unexpected token")) {
          setError("Data format error - check API response")
        } else if (errorMessage.includes("fetch") || errorMessage.includes("network")) {
          setError("Network connection error")
        } else {
          setError("Communication error with scale")
        }
      }
    }, 1000) // Read every second

    return () => clearInterval(interval)
  }, [isConnected, isCapturing])

  const handleCaptureReading = (reading: WeightReading) => {
    if (!reading.weight || reading.weight <= 0) return

    // Avoid duplicate captures within 2 seconds
    const lastReading = capturedReadings[capturedReadings.length - 1]
    if (lastReading) {
      const timeDiff = new Date(reading.timestamp).getTime() - new Date(lastReading.timestamp).getTime()
      if (timeDiff < 2000 && Math.abs((reading.weight || 0) - (lastReading.weight || 0)) < 0.5) {
        return // Skip duplicate reading
      }
    }

    setCapturedReadings((prev) => [...prev, reading])
    onWeightCaptured?.(reading)

    console.log("[v0] Weight captured:", reading)
  }

  const toggleCapture = () => {
    if (!isConnected) {
      setError("Scale must be connected to start capturing")
      return
    }

    setIsCapturing(!isCapturing)
    if (!isCapturing) {
      setError(null)
    }
  }

  const clearReadings = () => {
    setCapturedReadings([])
    setCurrentReading(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      {/* Current Reading Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Leitura Atual da Balança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Conectado" : "Desconectado"}
              </Badge>
              <span className="text-sm text-muted-foreground">{connectionStatus}</span>
            </div>

            {/* Current Weight */}
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                {currentReading?.weight ? `${currentReading.weight.toFixed(1)} ${currentReading.unit}` : "---.-- kg"}
              </div>
              {currentReading?.stable && (
                <Badge variant="outline" className="mt-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Estável
                </Badge>
              )}
            </div>

            {/* Animal ID */}
            {currentReading?.animalId && (
              <div className="text-center">
                <Badge variant="secondary">ID: {currentReading.animalId}</Badge>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-2 justify-center">
              <Button onClick={toggleCapture} disabled={!isConnected} variant={isCapturing ? "destructive" : "default"}>
                {isCapturing ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Parar Captura
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Captura
                  </>
                )}
              </Button>

              <Button onClick={clearReadings} variant="outline" disabled={capturedReadings.length === 0}>
                Limpar Leituras
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Captured Readings */}
      {capturedReadings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Pesagens Capturadas ({capturedReadings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {capturedReadings
                .slice(-10)
                .reverse()
                .map((reading, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {reading.weight?.toFixed(1)} {reading.unit}
                      </Badge>
                      {reading.animalId && <Badge variant="secondary">ID: {reading.animalId}</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(reading.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
