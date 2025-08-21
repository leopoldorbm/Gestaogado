"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Trash2, Save, X, Layers, Satellite, Map, Navigation } from "lucide-react"

interface Pasture {
  id: string
  nome: string
  numero?: string
  area_hectares: number
  cor: string
  coordenadas: number[][]
  fazenda_id?: string
  created_at: string
}

const PASTURE_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#85C1E9",
]

declare global {
  interface Window {
    L: any
  }
}

export default function PastureMapInterface() {
  const [pastures, setPastures] = useState<Pasture[]>([])
  const [selectedPasture, setSelectedPasture] = useState<Pasture | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [newPastureName, setNewPastureName] = useState("")
  const [newPastureNumber, setNewPastureNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapType, setMapType] = useState<"satellite" | "street" | "terrain">("satellite")

  const mapRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const drawnItemsRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    console.log("[v0] Initializing Leaflet satellite mapping...")

    const initializeLeafletMap = async () => {
      try {
        await loadLeafletLibraries()

        if (!mapContainerRef.current) {
          throw new Error("Map container not found")
        }

        console.log("[v0] Creating Leaflet map with satellite imagery...")

        const lastPastureLocation = localStorage.getItem("lastPastureLocation")
        let initialCenter = [-16.6869, -49.2648] // Default Goiânia coordinates
        let initialZoom = 12

        if (lastPastureLocation) {
          try {
            const location = JSON.parse(lastPastureLocation)
            initialCenter = [location.lat, location.lng]
            initialZoom = 16
            console.log("[v0] Using last pasture location as initial center")
          } catch (e) {
            console.log("[v0] Failed to parse last pasture location, using default")
          }
        }

        const map = window.L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: initialZoom,
          zoomControl: true,
          attributionControl: true,
        })

        const satelliteLayer = window.L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          {
            attribution:
              "&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            maxZoom: 18,
          },
        )

        const streetLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 18,
        })

        const terrainLayer = window.L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenTopoMap contributors",
          maxZoom: 17,
        })

        satelliteLayer.addTo(map)

        const baseLayers = {
          Satélite: satelliteLayer,
          Ruas: streetLayer,
          Terreno: terrainLayer,
        }

        window.L.control.layers(baseLayers).addTo(map)

        const drawnItems = new window.L.FeatureGroup()
        map.addLayer(drawnItems)

        const drawControl = new window.L.Control.Draw({
          position: "topright",
          draw: {
            polygon: {
              allowIntersection: false,
              drawError: {
                color: "#e1e100",
                message: "<strong>Erro:</strong> As linhas não podem se cruzar!",
              },
              shapeOptions: {
                color: "#FF0000",
                fillOpacity: 0.3,
                weight: 3,
              },
            },
            rectangle: {
              shapeOptions: {
                color: "#FF0000",
                fillOpacity: 0.3,
                weight: 3,
              },
            },
            circle: {
              shapeOptions: {
                color: "#FF0000",
                fillOpacity: 0.3,
                weight: 3,
              },
            },
            polyline: false,
            marker: false,
            circlemarker: false,
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        })

        map.addControl(drawControl)

        map.on(window.L.Draw.Event.CREATED, (event: any) => {
          const layer = event.layer
          const type = event.layerType

          let coordinates: number[][] = []
          let area = 0

          if (type === "polygon") {
            coordinates = layer.getLatLngs()[0].map((latLng: any) => [latLng.lat, latLng.lng])
            area = window.L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000 // Convert to hectares
          } else if (type === "rectangle") {
            const bounds = layer.getBounds()
            coordinates = [
              [bounds.getNorth(), bounds.getEast()],
              [bounds.getNorth(), bounds.getWest()],
              [bounds.getSouth(), bounds.getWest()],
              [bounds.getSouth(), bounds.getEast()],
            ]
            area =
              window.L.GeometryUtil.geodesicArea([
                window.L.latLng(bounds.getNorth(), bounds.getEast()),
                window.L.latLng(bounds.getNorth(), bounds.getWest()),
                window.L.latLng(bounds.getSouth(), bounds.getWest()),
                window.L.latLng(bounds.getSouth(), bounds.getEast()),
              ]) / 10000
          } else if (type === "circle") {
            const center = layer.getLatLng()
            const radius = layer.getRadius()
            // Create polygon approximation of circle
            for (let i = 0; i < 32; i++) {
              const angle = (i / 32) * 2 * Math.PI
              const lat = center.lat + (radius / 111320) * Math.cos(angle)
              const lng = center.lng + (radius / (111320 * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle)
              coordinates.push([lat, lng])
            }
            area = (Math.PI * radius * radius) / 10000 // Circle area in hectares
          }

          const color = PASTURE_COLORS[pastures.length % PASTURE_COLORS.length]

          layer.setStyle({
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 3,
          })

          drawnItems.addLayer(layer)

          const lats = coordinates.map((coord) => coord[0])
          const lngs = coordinates.map((coord) => coord[1])
          const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length
          const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length

          localStorage.setItem(
            "lastPastureLocation",
            JSON.stringify({
              lat: centerLat,
              lng: centerLng,
            }),
          )

          setSelectedPasture({
            id: "",
            nome: "",
            area_hectares: area,
            cor: color,
            coordenadas: coordinates,
            created_at: new Date().toISOString(),
          })
          setIsDrawing(true)
        })

        mapRef.current = map
        drawControlRef.current = drawControl
        drawnItemsRef.current = drawnItems
        setMapInitialized(true)
        setLoading(false)
        setError(null)

        console.log("[v0] Leaflet satellite map initialized successfully!")
      } catch (error) {
        console.error("[v0] Failed to initialize Leaflet map:", error)
        setError(`Erro ao carregar mapa: ${error}`)
        setLoading(false)
      }
    }

    initializeLeafletMap()
  }, [])

  const loadLeafletLibraries = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve()
        return
      }

      // Load Leaflet CSS
      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(cssLink)

      // Load Leaflet Draw CSS
      const drawCssLink = document.createElement("link")
      drawCssLink.rel = "stylesheet"
      drawCssLink.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
      document.head.appendChild(drawCssLink)

      // Load Leaflet JS
      const leafletScript = document.createElement("script")
      leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      leafletScript.async = true

      leafletScript.onload = () => {
        // Load Leaflet Draw JS
        const drawScript = document.createElement("script")
        drawScript.src = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"
        drawScript.async = true

        drawScript.onload = () => {
          // Load Leaflet GeometryUtil for area calculation
          const geometryScript = document.createElement("script")
          geometryScript.src = "https://unpkg.com/leaflet-geometryutil@0.10.1/src/leaflet.geometryutil.js"
          geometryScript.async = true

          geometryScript.onload = () => {
            console.log("[v0] Leaflet libraries loaded successfully")
            resolve()
          }

          geometryScript.onerror = (error) => {
            console.error("[v0] Failed to load Leaflet GeometryUtil:", error)
            reject(new Error("Failed to load Leaflet GeometryUtil"))
          }

          document.head.appendChild(geometryScript)
        }

        drawScript.onerror = (error) => {
          console.error("[v0] Failed to load Leaflet Draw:", error)
          reject(new Error("Failed to load Leaflet Draw"))
        }

        document.head.appendChild(drawScript)
      }

      leafletScript.onerror = (error) => {
        console.error("[v0] Failed to load Leaflet:", error)
        reject(new Error("Failed to load Leaflet"))
      }

      document.head.appendChild(leafletScript)
    })
  }

  const switchMapType = (type: "satellite" | "street" | "terrain") => {
    if (!mapRef.current) return
    setMapType(type)
    // Layer switching is handled by Leaflet's layer control
  }

  const centerOnGoiania = () => {
    if (!mapRef.current) return
    mapRef.current.setView([-16.6869, -49.2648], 12)
  }

  const centerOnPasture = (pasture: Pasture) => {
    if (!mapRef.current || !pasture.coordenadas || pasture.coordenadas.length === 0) return

    // Calculate center of pasture coordinates
    const lats = pasture.coordenadas.map((coord) => coord[0])
    const lngs = pasture.coordenadas.map((coord) => coord[1])
    const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length
    const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length

    // Center map on pasture and zoom in
    mapRef.current.setView([centerLat, centerLng], 16)

    console.log(`[v0] Centered map on pasture: ${pasture.nome}`)
  }

  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current || !window.L) return

    // Clear existing pasture layers
    drawnItemsRef.current.clearLayers()

    pastures.forEach((pasture) => {
      if (pasture.coordenadas && pasture.coordenadas.length > 0) {
        const coordinates = pasture.coordenadas.map((coord) => [coord[0], coord[1]])

        const polygon = window.L.polygon(coordinates, {
          color: pasture.cor,
          fillColor: pasture.cor,
          fillOpacity: 0.3,
          weight: 3,
        })

        polygon.bindPopup(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${pasture.nome}</h3>
            ${pasture.numero ? `<p style="margin: 4px 0;">Número: ${pasture.numero}</p>` : ""}
            <p style="margin: 4px 0;">Área: ${pasture.area_hectares.toFixed(2)} ha</p>
          </div>
        `)

        polygon.on("click", () => {
          setSelectedPasture(pasture)
        })

        drawnItemsRef.current.addLayer(polygon)

        const lats = coordinates.map((coord) => coord[0])
        const lngs = coordinates.map((coord) => coord[1])
        const centerLat = lats.reduce((sum, lat) => sum + lat, 0) / lats.length
        const centerLng = lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length

        const labelText = pasture.numero
          ? `${pasture.numero}\n${pasture.area_hectares.toFixed(1)} ha`
          : `${pasture.nome}\n${pasture.area_hectares.toFixed(1)} ha`

        const label = window.L.marker([centerLat, centerLng], {
          icon: window.L.divIcon({
            className: "pasture-label",
            html: `<div style="
              background: rgba(255, 255, 255, 0.9);
              border: 2px solid ${pasture.cor};
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 12px;
              font-weight: bold;
              text-align: center;
              color: #333;
              white-space: pre-line;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
              backdrop-filter: blur(2px);
            ">${labelText}</div>`,
            iconSize: [80, 40],
            iconAnchor: [40, 20],
          }),
        })

        drawnItemsRef.current.addLayer(label)
      }
    })
  }, [pastures])

  // ... existing code for savePasture, deletePasture, cancelDrawing functions ...
  const savePasture = async () => {
    if (!selectedPasture || !newPastureName.trim()) return

    try {
      const newPasture: Pasture = {
        id: Date.now().toString(),
        nome: newPastureName.trim(),
        numero: newPastureNumber.trim() || undefined,
        area_hectares: selectedPasture.area_hectares,
        cor: selectedPasture.cor,
        coordenadas: selectedPasture.coordenadas,
        created_at: new Date().toISOString(),
      }

      setPastures([...pastures, newPasture])

      setNewPastureName("")
      setNewPastureNumber("")
      setSelectedPasture(null)
      setIsDrawing(false)
      setError(null)

      console.log("[v0] Pasture saved locally:", newPasture)
    } catch (err) {
      console.error("[v0] Error saving pasture:", err)
      setError("Erro ao salvar pasto.")
    }
  }

  const deletePasture = (id: string) => {
    setPastures(pastures.filter((p) => p.id !== id))
    setSelectedPasture(null)
    console.log("[v0] Pasture deleted:", id)
  }

  const cancelDrawing = () => {
    setIsDrawing(false)
    setSelectedPasture(null)
    setNewPastureName("")
    setNewPastureNumber("")

    if (drawnItemsRef.current) {
      const layers = drawnItemsRef.current.getLayers()
      if (layers.length > 0) {
        const lastLayer = layers[layers.length - 1]
        drawnItemsRef.current.removeLayer(lastLayer)
      }
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Satellite className="h-5 w-5" />
                Mapeamento de Pastos - Imagens de Satélite
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={mapType === "satellite" ? "default" : "outline"}
                  onClick={() => switchMapType("satellite")}
                  disabled={loading}
                >
                  <Satellite className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={mapType === "street" ? "default" : "outline"}
                  onClick={() => switchMapType("street")}
                  disabled={loading}
                >
                  <Map className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={mapType === "terrain" ? "default" : "outline"}
                  onClick={() => switchMapType("terrain")}
                  disabled={loading}
                >
                  <Layers className="h-4 w-4" />
                </Button>
                <Button size="sm" onClick={centerOnGoiania} variant="outline" disabled={loading}>
                  <Navigation className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div
                ref={mapContainerRef}
                data-map-container="true"
                className="map-container h-96 w-full rounded-lg border"
                style={{ minHeight: "500px" }}
              />

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Carregando mapa de satélite...</p>
                    <p className="text-sm text-gray-500 mt-2">Inicializando imagens de satélite</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
                  <div className="text-center">
                    <div className="text-red-500 mb-4">⚠️</div>
                    <p className="text-red-600">{error}</p>
                    <Button onClick={() => window.location.reload()} className="mt-4">
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ... existing code for sidebar ... */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Pastos ({pastures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pastures.map((pasture) => (
                <div
                  key={pasture.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPasture?.id === pasture.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedPasture(pasture)
                    centerOnPasture(pasture)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: pasture.cor }}></div>
                      <div>
                        <p className="font-medium text-sm">{pasture.nome}</p>
                        {pasture.numero && <p className="text-xs text-gray-500">#{pasture.numero}</p>}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {pasture.area_hectares.toFixed(1)} ha
                    </Badge>
                  </div>
                </div>
              ))}

              {pastures.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">
                  Desenhe um polígono no mapa para criar um pasto
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPasture && !isDrawing && selectedPasture.id && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Pasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <p className="text-sm text-gray-600">{selectedPasture.nome}</p>
                </div>

                {selectedPasture.numero && (
                  <div>
                    <Label className="text-sm font-medium">Número</Label>
                    <p className="text-sm text-gray-600">{selectedPasture.numero}</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium">Área</Label>
                  <p className="text-sm text-gray-600">{selectedPasture.area_hectares.toFixed(2)} hectares</p>
                </div>

                <div>
                  <Label className="text-sm font-medium">Cor</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedPasture.cor }}></div>
                    <span className="text-sm text-gray-600">{selectedPasture.cor}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => deletePasture(selectedPasture.id)}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isDrawing && selectedPasture && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Novo Pasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pasture-name">Nome do Pasto *</Label>
                  <Input
                    id="pasture-name"
                    value={newPastureName}
                    onChange={(e) => setNewPastureName(e.target.value)}
                    placeholder="Ex: Pasto Norte"
                  />
                </div>

                <div>
                  <Label htmlFor="pasture-number">Número (opcional)</Label>
                  <Input
                    id="pasture-number"
                    value={newPastureNumber}
                    onChange={(e) => setNewPastureNumber(e.target.value)}
                    placeholder="Ex: 001"
                  />
                </div>

                <div>
                  <Label>Área Calculada</Label>
                  <p className="text-sm text-gray-600">{selectedPasture.area_hectares.toFixed(2)} hectares</p>
                </div>

                <div>
                  <Label>Cor</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border" style={{ backgroundColor: selectedPasture.cor }}></div>
                    <span className="text-sm text-gray-600">{selectedPasture.cor}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={savePasture} disabled={!newPastureName.trim()} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button onClick={cancelDrawing} variant="outline">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mapeamento por Satélite - Instruções</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-600 space-y-2">
              <p>
                🛰️ <strong>Imagens de satélite em alta resolução</strong>
              </p>
              <p>🔧 Use as ferramentas de desenho no canto superior direito</p>
              <p>📐 Polígono: Para áreas irregulares</p>
              <p>⬜ Retângulo: Para áreas regulares</p>
              <p>⭕ Círculo: Para áreas circulares</p>
              <p>🎯 Botão de navegação: Voltar para Goiânia</p>
              <p>🗺️ Alterne entre Satélite, Ruas e Terreno</p>
              <p>📐 Área calculada automaticamente em hectares</p>
              <p>🖱️ Clique nos pastos para ver detalhes</p>
              <p>
                🧭 <strong>Clique na lista de pastos para navegar até eles</strong>
              </p>
              <p>
                🏷️ <strong>Labels permanentes mostram número e área</strong>
              </p>
              <p>
                📍 <strong>Mapa inicia na localização do último pasto criado</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
