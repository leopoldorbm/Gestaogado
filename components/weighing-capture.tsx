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
  raw?: string
}

interface WeighingCaptureProps {
  isConnected: boolean
  currentWeight?: number | null
  currentAnimalId?: string | null
  onWeightCaptured?: (data: { weight: number; animalId?: string; timestamp: Date }) => void
}

export function WeighingCapture({ isConnected, currentWeight, currentAnimalId, onWeightCaptured }: WeighingCaptureProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedReadings, setCapturedReadings] = useState<WeightReading[]>([])
  const [lastCapturedWeight, setLastCapturedWeight] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<string>("")
  const [currentReading, setCurrentReading] = useState<WeightReading | null>(null)

  // Create a reading object from current props
  useEffect(() => {
    if (currentWeight) {
      setCurrentReading({
        weight: currentWeight,
        unit: "kg",
        animalId: currentAnimalId || null,
        stable: true,
        timestamp: new Date().toISOString(),
      })
    } else {
      setCurrentReading(null)
    }
  }, [currentWeight, currentAnimalId])

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("Conectado")
    } else {
      setConnectionStatus("Desconectado")
    }
  }, [isConnected])

  // Auto-capture when capturing is enabled and we have a stable reading
  useEffect(() => {
    if (!isConnected || !isCapturing || !currentWeight) return

    // Avoid capturing the same weight twice
    if (currentWeight === lastCapturedWeight) return

    // Capture the current reading
    const reading: WeightReading = {
      weight: currentWeight,
      unit: "kg",
      animalId: currentAnimalId || null,
      stable: true,
      timestamp: new Date().toISOString(),
    }

    handleCaptureReading(reading)
    setLastCapturedWeight(currentWeight)
  }, [isConnected, isCapturing, currentWeight, currentAnimalId, lastCapturedWeight])

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
    
    // Call the callback with the correct format
    if (reading.weight && onWeightCaptured) {
      onWeightCaptured({
        weight: reading.weight,
        animalId: reading.animalId || undefined,
        timestamp: new Date(reading.timestamp),
      })
    }
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
                {connectionStatus}
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
