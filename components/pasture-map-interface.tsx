"use client"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, Save, X, Layers, Satellite, Map, Navigation, Users, Calendar, Leaf, Plus, AlertCircle, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useFarm } from "@/contexts/farm-context"

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

interface OcupacaoPasto {
  id: string
  pasto_id: string
  lote_id: string
  lote_nome?: string
  quantidade_animais: number
  data_entrada: string
  data_saida_prevista?: string
  data_saida_real?: string
  status: "ativo" | "finalizado"
  observacoes?: string
}

interface AplicacaoDefensivo {
  id: string
  pasto_id: string
  produto: string
  dosagem: string
  data_aplicacao: string
  periodo_carencia_dias: number
  responsavel?: string
  observacoes?: string
}

interface Lote {
  id: string
  nome: string
  quantidade: number
  fazenda_id: string
}

const PASTURE_COLORS = [
  "#22c55e", // green
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
]

declare global {
  interface Window {
    L: any
  }
}

export default function PastureMapInterface() {
  const { selectedFarm, fazendas } = useFarm()
  const [pastures, setPastures] = useState<Pasture[]>([])
  const [ocupacoes, setOcupacoes] = useState<OcupacaoPasto[]>([])
  const [aplicacoes, setAplicacoes] = useState<AplicacaoDefensivo[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [selectedPasture, setSelectedPasture] = useState<Pasture | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [newPastureName, setNewPastureName] = useState("")
  const [newPastureNumber, setNewPastureNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapInitialized, setMapInitialized] = useState(false)
  const [mapType, setMapType] = useState<"satellite" | "street" | "terrain">("satellite")
  
  // Dialog states
  const [isOcupacaoDialogOpen, setIsOcupacaoDialogOpen] = useState(false)
  const [isDefensivoDialogOpen, setIsDefensivoDialogOpen] = useState(false)
  const [ocupacaoForm, setOcupacaoForm] = useState({
    lote_id: "",
    quantidade_animais: "",
    data_entrada: new Date().toISOString().split("T")[0],
    data_saida_prevista: "",
    observacoes: "",
  })
  const [defensivoForm, setDefensivoForm] = useState({
    produto: "",
    dosagem: "",
    data_aplicacao: new Date().toISOString().split("T")[0],
    periodo_carencia_dias: "14",
    responsavel: "",
    observacoes: "",
  })

  const mapRef = useRef<any>(null)
  const drawControlRef = useRef<any>(null)
  const drawnItemsRef = useRef<any>(null)
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const selectedFarmName = fazendas.find((f) => f.id === selectedFarm)?.nome || "Todas as Fazendas"

  useEffect(() => {
    loadData()
  }, [selectedFarm])

  useEffect(() => {
    initializeLeafletMap()
  }, [])

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load pastures
      let pasturesQuery = supabase.from("pastos").select("*")
      if (selectedFarm) {
        pasturesQuery = pasturesQuery.eq("fazenda_id", selectedFarm)
      }
      const { data: pasturesData } = await pasturesQuery

      // Load lotes
      let lotesQuery = supabase.from("lotes").select("id, nome, quantidade, fazenda_id")
      if (selectedFarm) {
        lotesQuery = lotesQuery.eq("fazenda_id", selectedFarm)
      }
      const { data: lotesData } = await lotesQuery

      // Load ocupacoes
      const { data: ocupacoesData } = await supabase
        .from("ocupacao_pastos")
        .select("*, lotes(nome)")
        .eq("status", "ativo")

      // Load aplicacoes
      const { data: aplicacoesData } = await supabase
        .from("aplicacao_defensivos")
        .select("*")
        .order("data_aplicacao", { ascending: false })

      setPastures(pasturesData || [])
      setLotes(lotesData || [])
      setOcupacoes(
        (ocupacoesData || []).map((o: any) => ({
          ...o,
          lote_nome: o.lotes?.nome,
        }))
      )
      setAplicacoes(aplicacoesData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    }
  }

  const initializeLeafletMap = async () => {
    try {
      await loadLeafletLibraries()

      if (!mapContainerRef.current) {
        throw new Error("Map container not found")
      }

      const lastPastureLocation = localStorage.getItem("lastPastureLocation")
      let initialCenter = [-16.6869, -49.2648]
      let initialZoom = 12

      if (lastPastureLocation) {
        try {
          const location = JSON.parse(lastPastureLocation)
          initialCenter = [location.lat, location.lng]
          initialZoom = 16
        } catch (e) {}
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
          attribution: "&copy; Esri",
          maxZoom: 18,
        }
      )

      const streetLayer = window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 18,
      })

      const terrainLayer = window.L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenTopoMap",
        maxZoom: 17,
      })

      satelliteLayer.addTo(map)

      const baseLayers = {
        Satelite: satelliteLayer,
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
            shapeOptions: { color: "#22c55e", fillOpacity: 0.3, weight: 3 },
          },
          rectangle: {
            shapeOptions: { color: "#22c55e", fillOpacity: 0.3, weight: 3 },
          },
          circle: false,
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
          area = window.L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) / 10000
        } else if (type === "rectangle") {
          const bounds = layer.getBounds()
          coordinates = [
            [bounds.getNorth(), bounds.getEast()],
            [bounds.getNorth(), bounds.getWest()],
            [bounds.getSouth(), bounds.getWest()],
            [bounds.getSouth(), bounds.getEast()],
          ]
          area = window.L.GeometryUtil.geodesicArea([
            window.L.latLng(bounds.getNorth(), bounds.getEast()),
            window.L.latLng(bounds.getNorth(), bounds.getWest()),
            window.L.latLng(bounds.getSouth(), bounds.getWest()),
            window.L.latLng(bounds.getSouth(), bounds.getEast()),
          ]) / 10000
        }

        const color = PASTURE_COLORS[pastures.length % PASTURE_COLORS.length]
        layer.setStyle({ color, fillColor: color, fillOpacity: 0.3, weight: 3 })
        drawnItems.addLayer(layer)

        const lats = coordinates.map((c) => c[0])
        const lngs = coordinates.map((c) => c[1])
        const centerLat = lats.reduce((s, l) => s + l, 0) / lats.length
        const centerLng = lngs.reduce((s, l) => s + l, 0) / lngs.length
        localStorage.setItem("lastPastureLocation", JSON.stringify({ lat: centerLat, lng: centerLng }))

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
    } catch (error) {
      console.error("Erro ao inicializar mapa:", error)
      setError(`Erro ao carregar mapa: ${error}`)
      setLoading(false)
    }
  }

  const loadLeafletLibraries = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve()
        return
      }

      const cssLink = document.createElement("link")
      cssLink.rel = "stylesheet"
      cssLink.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      document.head.appendChild(cssLink)

      const drawCssLink = document.createElement("link")
      drawCssLink.rel = "stylesheet"
      drawCssLink.href = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
      document.head.appendChild(drawCssLink)

      const leafletScript = document.createElement("script")
      leafletScript.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      leafletScript.async = true

      leafletScript.onload = () => {
        const drawScript = document.createElement("script")
        drawScript.src = "https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"
        drawScript.async = true

        drawScript.onload = () => {
          const geometryScript = document.createElement("script")
          geometryScript.src = "https://unpkg.com/leaflet-geometryutil@0.10.1/src/leaflet.geometryutil.js"
          geometryScript.async = true
          geometryScript.onload = () => resolve()
          geometryScript.onerror = () => reject(new Error("Failed to load GeometryUtil"))
          document.head.appendChild(geometryScript)
        }
        drawScript.onerror = () => reject(new Error("Failed to load Leaflet Draw"))
        document.head.appendChild(drawScript)
      }
      leafletScript.onerror = () => reject(new Error("Failed to load Leaflet"))
      document.head.appendChild(leafletScript)
    })
  }

  const getOcupacaoForPasture = (pastureId: string) => {
    return ocupacoes.find((o) => o.pasto_id === pastureId && o.status === "ativo")
  }

  const getAplicacoesForPasture = (pastureId: string) => {
    return aplicacoes.filter((a) => a.pasto_id === pastureId)
  }

  useEffect(() => {
    if (!mapRef.current || !drawnItemsRef.current || !window.L) return

    drawnItemsRef.current.clearLayers()

    pastures.forEach((pasture) => {
      if (pasture.coordenadas && pasture.coordenadas.length > 0) {
        const coordinates = pasture.coordenadas.map((coord) => [coord[0], coord[1]])
        const ocupacao = getOcupacaoForPasture(pasture.id)

        const polygon = window.L.polygon(coordinates, {
          color: pasture.cor,
          fillColor: pasture.cor,
          fillOpacity: ocupacao ? 0.5 : 0.3,
          weight: 3,
        })

        const ocupacaoInfo = ocupacao
          ? `<p><strong>Lote:</strong> ${ocupacao.lote_nome || "N/A"}</p>
             <p><strong>Animais:</strong> ${ocupacao.quantidade_animais}</p>
             <p><strong>Entrada:</strong> ${new Date(ocupacao.data_entrada).toLocaleDateString("pt-BR")}</p>`
          : "<p><em>Pasto vazio</em></p>"

        polygon.bindPopup(`
          <div style="padding: 8px; min-width: 150px;">
            <h3 style="margin: 0 0 8px 0; font-weight: bold;">${pasture.nome}</h3>
            ${pasture.numero ? `<p><strong>Numero:</strong> ${pasture.numero}</p>` : ""}
            <p><strong>Area:</strong> ${pasture.area_hectares.toFixed(2)} ha</p>
            <hr style="margin: 8px 0;">
            ${ocupacaoInfo}
          </div>
        `)

        polygon.on("click", () => setSelectedPasture(pasture))
        drawnItemsRef.current.addLayer(polygon)

        // Add label with cattle count
        const lats = coordinates.map((c) => c[0])
        const lngs = coordinates.map((c) => c[1])
        const centerLat = lats.reduce((s, l) => s + l, 0) / lats.length
        const centerLng = lngs.reduce((s, l) => s + l, 0) / lngs.length

        const labelContent = ocupacao
          ? `<div style="
              background: rgba(34, 197, 94, 0.95);
              border: 2px solid white;
              border-radius: 8px;
              padding: 6px 10px;
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              color: white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            ">
              <div style="font-size: 14px;">${ocupacao.quantidade_animais}</div>
              <div style="font-size: 9px; opacity: 0.9;">animais</div>
            </div>`
          : `<div style="
              background: rgba(255, 255, 255, 0.95);
              border: 2px solid ${pasture.cor};
              border-radius: 6px;
              padding: 4px 8px;
              font-size: 11px;
              font-weight: bold;
              text-align: center;
              color: #333;
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">${pasture.numero || pasture.nome}<br/>${pasture.area_hectares.toFixed(1)} ha</div>`

        const label = window.L.marker([centerLat, centerLng], {
          icon: window.L.divIcon({
            className: "pasture-label",
            html: labelContent,
            iconSize: [80, 50],
            iconAnchor: [40, 25],
          }),
        })

        drawnItemsRef.current.addLayer(label)
      }
    })
  }, [pastures, ocupacoes])

  const savePasture = async () => {
    if (!selectedPasture || !newPastureName.trim()) return
    if (!selectedFarm) {
      alert("Selecione uma fazenda no cabecalho antes de criar um pasto.")
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("pastos")
        .insert({
          nome: newPastureName.trim(),
          numero: newPastureNumber.trim() || null,
          area_hectares: selectedPasture.area_hectares,
          cor: selectedPasture.cor,
          coordenadas: selectedPasture.coordenadas,
          fazenda_id: selectedFarm,
        })
        .select()
        .single()

      if (error) throw error

      setPastures([...pastures, data])
      setNewPastureName("")
      setNewPastureNumber("")
      setSelectedPasture(null)
      setIsDrawing(false)
    } catch (err) {
      console.error("Erro ao salvar pasto:", err)
      alert("Erro ao salvar pasto. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const deletePasture = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este pasto?")) return

    try {
      const { error } = await supabase.from("pastos").delete().eq("id", id)
      if (error) throw error

      setPastures(pastures.filter((p) => p.id !== id))
      setSelectedPasture(null)
    } catch (err) {
      console.error("Erro ao excluir pasto:", err)
      alert("Erro ao excluir pasto.")
    }
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

  const handleSaveOcupacao = async () => {
    if (!selectedPasture?.id || !ocupacaoForm.lote_id || !ocupacaoForm.quantidade_animais) return

    setSaving(true)
    try {
      const { error } = await supabase.from("ocupacao_pastos").insert({
        pasto_id: selectedPasture.id,
        lote_id: ocupacaoForm.lote_id,
        quantidade_animais: parseInt(ocupacaoForm.quantidade_animais),
        data_entrada: ocupacaoForm.data_entrada,
        data_saida_prevista: ocupacaoForm.data_saida_prevista || null,
        observacoes: ocupacaoForm.observacoes || null,
        status: "ativo",
      })

      if (error) throw error

      await loadData()
      setIsOcupacaoDialogOpen(false)
      setOcupacaoForm({
        lote_id: "",
        quantidade_animais: "",
        data_entrada: new Date().toISOString().split("T")[0],
        data_saida_prevista: "",
        observacoes: "",
      })
    } catch (err) {
      console.error("Erro ao salvar ocupacao:", err)
      alert("Erro ao registrar ocupacao.")
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDefensivo = async () => {
    if (!selectedPasture?.id || !defensivoForm.produto || !defensivoForm.dosagem) return

    setSaving(true)
    try {
      const { error } = await supabase.from("aplicacao_defensivos").insert({
        pasto_id: selectedPasture.id,
        produto: defensivoForm.produto,
        dosagem: defensivoForm.dosagem,
        data_aplicacao: defensivoForm.data_aplicacao,
        periodo_carencia_dias: parseInt(defensivoForm.periodo_carencia_dias),
        responsavel: defensivoForm.responsavel || null,
        observacoes: defensivoForm.observacoes || null,
      })

      if (error) throw error

      await loadData()
      setIsDefensivoDialogOpen(false)
      setDefensivoForm({
        produto: "",
        dosagem: "",
        data_aplicacao: new Date().toISOString().split("T")[0],
        periodo_carencia_dias: "14",
        responsavel: "",
        observacoes: "",
      })
    } catch (err) {
      console.error("Erro ao salvar defensivo:", err)
      alert("Erro ao registrar aplicacao.")
    } finally {
      setSaving(false)
    }
  }

  const finalizarOcupacao = async (ocupacaoId: string) => {
    if (!confirm("Deseja finalizar esta ocupacao?")) return

    try {
      const { error } = await supabase
        .from("ocupacao_pastos")
        .update({
          status: "finalizado",
          data_saida_real: new Date().toISOString().split("T")[0],
        })
        .eq("id", ocupacaoId)

      if (error) throw error
      await loadData()
    } catch (err) {
      console.error("Erro ao finalizar ocupacao:", err)
    }
  }

  const centerOnPasture = (pasture: Pasture) => {
    if (!mapRef.current || !pasture.coordenadas?.length) return
    const lats = pasture.coordenadas.map((c) => c[0])
    const lngs = pasture.coordenadas.map((c) => c[1])
    const centerLat = lats.reduce((s, l) => s + l, 0) / lats.length
    const centerLng = lngs.reduce((s, l) => s + l, 0) / lngs.length
    mapRef.current.setView([centerLat, centerLng], 16)
  }

  const totalAnimais = ocupacoes.reduce((sum, o) => sum + o.quantidade_animais, 0)
  const pastosOcupados = ocupacoes.length
  const areaTotal = pastures.reduce((sum, p) => sum + p.area_hectares, 0)

  return (
    <div className="space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propriedade</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{selectedFarmName}</div>
            <p className="text-xs text-muted-foreground">{pastures.length} pastos mapeados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Area Total</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{areaTotal.toFixed(1)} ha</div>
            <p className="text-xs text-muted-foreground">{pastures.length} pastos</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animais nos Pastos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnimais}</div>
            <p className="text-xs text-muted-foreground">{pastosOcupados} pastos ocupados</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lotacao Media</CardTitle>
            <Leaf className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {areaTotal > 0 ? (totalAnimais / areaTotal).toFixed(2) : "0"} cab/ha
            </div>
            <p className="text-xs text-muted-foreground">Capacidade de suporte</p>
          </CardContent>
        </Card>
      </div>

      {!selectedFarm && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <p className="text-amber-800">
              Selecione uma fazenda no cabecalho para visualizar e criar pastos.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Satellite className="h-5 w-5" />
                  Mapeamento de Pastos
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => mapRef.current?.setView([-16.6869, -49.2648], 12)} className="bg-transparent">
                    <Navigation className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div
                  ref={mapContainerRef}
                  className="h-[500px] w-full rounded-lg border"
                />

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <p>Carregando mapa...</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pasture List */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4" />
                Pastos ({pastures.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pastures.map((pasture) => {
                  const ocupacao = getOcupacaoForPasture(pasture.id)
                  return (
                    <div
                      key={pasture.id}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                        selectedPasture?.id === pasture.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setSelectedPasture(pasture)
                        centerOnPasture(pasture)
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pasture.cor }}></div>
                          <div>
                            <p className="font-medium text-sm">{pasture.nome}</p>
                            <p className="text-xs text-muted-foreground">{pasture.area_hectares.toFixed(1)} ha</p>
                          </div>
                        </div>
                        {ocupacao && (
                          <Badge variant="default" className="text-xs">
                            {ocupacao.quantidade_animais}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )
                })}

                {pastures.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Desenhe no mapa para criar um pasto
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected Pasture Details */}
          {selectedPasture && !isDrawing && selectedPasture.id && (
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{selectedPasture.nome}</CardTitle>
                <CardDescription>{selectedPasture.area_hectares.toFixed(2)} hectares</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="ocupacao" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ocupacao">Ocupacao</TabsTrigger>
                    <TabsTrigger value="defensivos">Defensivos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="ocupacao" className="space-y-3 mt-3">
                    {(() => {
                      const ocupacao = getOcupacaoForPasture(selectedPasture.id)
                      return ocupacao ? (
                        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-green-800">Ocupado</span>
                            <Badge variant="default">{ocupacao.quantidade_animais} animais</Badge>
                          </div>
                          <p className="text-sm text-green-700">Lote: {ocupacao.lote_nome}</p>
                          <p className="text-xs text-green-600">
                            Entrada: {new Date(ocupacao.data_entrada).toLocaleDateString("pt-BR")}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full mt-2 bg-transparent"
                            onClick={() => finalizarOcupacao(ocupacao.id)}
                          >
                            Finalizar Ocupacao
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-sm text-muted-foreground mb-2">Pasto vazio</p>
                          <Button size="sm" onClick={() => setIsOcupacaoDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-1" />
                            Alocar Lote
                          </Button>
                        </div>
                      )
                    })()}
                  </TabsContent>

                  <TabsContent value="defensivos" className="space-y-3 mt-3">
                    <Button size="sm" className="w-full" onClick={() => setIsDefensivoDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Registrar Aplicacao
                    </Button>

                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {getAplicacoesForPasture(selectedPasture.id).map((app) => (
                        <div key={app.id} className="p-2 bg-muted/50 rounded text-xs">
                          <p className="font-medium">{app.produto}</p>
                          <p className="text-muted-foreground">
                            {new Date(app.data_aplicacao).toLocaleDateString("pt-BR")} - {app.dosagem}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 mt-4 pt-3 border-t">
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
              </CardContent>
            </Card>
          )}

          {/* New Pasture Form */}
          {isDrawing && selectedPasture && (
            <Card className="hover:shadow-lg transition-shadow border-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Novo Pasto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="pasture-name">Nome *</Label>
                  <Input
                    id="pasture-name"
                    value={newPastureName}
                    onChange={(e) => setNewPastureName(e.target.value)}
                    placeholder="Ex: Pasto Norte"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="pasture-number">Numero</Label>
                  <Input
                    id="pasture-number"
                    value={newPastureNumber}
                    onChange={(e) => setNewPastureNumber(e.target.value)}
                    placeholder="Ex: 001"
                    className="mt-1"
                  />
                </div>

                <div className="p-2 bg-muted/50 rounded">
                  <p className="text-sm"><strong>Area:</strong> {selectedPasture.area_hectares.toFixed(2)} ha</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={savePasture} disabled={!newPastureName.trim() || saving} className="flex-1">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button onClick={cancelDrawing} variant="outline" className="bg-transparent">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Ocupacao Dialog */}
      <Dialog open={isOcupacaoDialogOpen} onOpenChange={setIsOcupacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alocar Lote no Pasto</DialogTitle>
            <DialogDescription>
              Registre a entrada de um lote de animais no pasto {selectedPasture?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Lote *</Label>
              <Select value={ocupacaoForm.lote_id} onValueChange={(v) => setOcupacaoForm({ ...ocupacaoForm, lote_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um lote" />
                </SelectTrigger>
                <SelectContent>
                  {lotes.map((lote) => (
                    <SelectItem key={lote.id} value={lote.id}>
                      {lote.nome} ({lote.quantidade} animais)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade de Animais *</Label>
              <Input
                type="number"
                value={ocupacaoForm.quantidade_animais}
                onChange={(e) => setOcupacaoForm({ ...ocupacaoForm, quantidade_animais: e.target.value })}
                placeholder="Ex: 50"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data de Entrada</Label>
              <Input
                type="date"
                value={ocupacaoForm.data_entrada}
                onChange={(e) => setOcupacaoForm({ ...ocupacaoForm, data_entrada: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Previsao de Saida</Label>
              <Input
                type="date"
                value={ocupacaoForm.data_saida_prevista}
                onChange={(e) => setOcupacaoForm({ ...ocupacaoForm, data_saida_prevista: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={ocupacaoForm.observacoes}
                onChange={(e) => setOcupacaoForm({ ...ocupacaoForm, observacoes: e.target.value })}
                placeholder="Observacoes sobre a alocacao"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOcupacaoDialogOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSaveOcupacao} disabled={saving || !ocupacaoForm.lote_id || !ocupacaoForm.quantidade_animais}>
              {saving ? "Salvando..." : "Registrar Entrada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Defensivo Dialog */}
      <Dialog open={isDefensivoDialogOpen} onOpenChange={setIsDefensivoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Aplicacao de Defensivo</DialogTitle>
            <DialogDescription>
              Registre a aplicacao de herbicida, adubo ou outro produto no pasto {selectedPasture?.nome}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Produto *</Label>
              <Input
                value={defensivoForm.produto}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, produto: e.target.value })}
                placeholder="Ex: Glifosato, Ureia, etc."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Dosagem *</Label>
              <Input
                value={defensivoForm.dosagem}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, dosagem: e.target.value })}
                placeholder="Ex: 2L/ha, 100kg/ha"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Data da Aplicacao</Label>
              <Input
                type="date"
                value={defensivoForm.data_aplicacao}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, data_aplicacao: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Periodo de Carencia (dias)</Label>
              <Input
                type="number"
                value={defensivoForm.periodo_carencia_dias}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, periodo_carencia_dias: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Responsavel</Label>
              <Input
                value={defensivoForm.responsavel}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, responsavel: e.target.value })}
                placeholder="Nome do responsavel"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Observacoes</Label>
              <Textarea
                value={defensivoForm.observacoes}
                onChange={(e) => setDefensivoForm({ ...defensivoForm, observacoes: e.target.value })}
                placeholder="Observacoes adicionais"
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDefensivoDialogOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSaveDefensivo} disabled={saving || !defensivoForm.produto || !defensivoForm.dosagem}>
              {saving ? "Salvando..." : "Registrar Aplicacao"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
