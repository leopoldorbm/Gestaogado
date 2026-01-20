"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Scale, TrendingUp, Heart, Activity, Usb, Settings, Zap, Wifi, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import Link from "next/link"
import { useScaleConnection } from "@/contexts/scale-connection-context"
import { SessionManagement } from "./session-management"

interface CattleData {
  id: string
  idv: string // ID Visual (marca a fogo)
  ide?: string // ID Eletrônico (brinco)
  sexo: "M" | "F"
  dataNascimento?: string
  dataCompra?: string
  dataEntrada: string
  pesoAtual: number
  origem: string
  fazendaNascimento?: string

  // Dados de peso
  historicoPeso: Array<{
    data: string
    peso: number
    gmd?: number
  }>

  // Para fêmeas
  statusReprodutivo?: "bezerra" | "novilha" | "vaca"
  statusAtual?: "solteira_vazia" | "solteira_cheia" | "parida_vazia" | "parida_cheia"
  reprodutor?: string
  previsaoParto?: string
  crias?: Array<{
    id: string
    dataNascimento: string
  }>
}

export function CattleYardInterface() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAnimal, setSelectedAnimal] = useState<CattleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    isConnected: scaleConnected,
    connectionStatus,
    liveWeight,
    lastReadingTime,
    connectToScale,
    disconnectFromScale,
  } = useScaleConnection()

  const [isConnecting, setIsConnecting] = useState(false)

  const exampleData: CattleData = {
    id: "1",
    idv: "123",
    ide: "BR001234567890",
    sexo: "M",
    dataNascimento: "2022-03-15",
    dataEntrada: "2022-03-15",
    pesoAtual: 450,
    origem: "nascido",
    fazendaNascimento: "Fazenda Principal",
    historicoPeso: [
      { data: "2022-03-15", peso: 35 },
      { data: "2022-06-15", peso: 120, gmd: 0.93 },
      { data: "2022-09-15", peso: 200, gmd: 0.87 },
      { data: "2022-12-15", peso: 280, gmd: 0.87 },
      { data: "2023-03-15", peso: 350, gmd: 0.78 },
      { data: "2023-06-15", peso: 420, gmd: 0.76 },
      { data: "2023-09-15", peso: 450, gmd: 0.33 },
    ],
  }

  const searchAnimal = async () => {
    if (!searchTerm.trim()) return

    setIsLoading(true)

    setTimeout(() => {
      if (searchTerm === "123" || searchTerm === "BR001234567890") {
        setSelectedAnimal(exampleData)
      } else {
        setSelectedAnimal(null)
        alert("Animal não encontrado")
      }
      setIsLoading(false)
    }, 1000)
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - birth.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 30) return `${diffDays} dias`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`
    return `${Math.floor(diffDays / 365)} anos e ${Math.floor((diffDays % 365) / 30)} meses`
  }

  const calculateDaysSinceLastWeighing = (historicoPeso: any[]) => {
    if (historicoPeso.length === 0) return 0
    const lastWeighing = new Date(historicoPeso[historicoPeso.length - 1].data)
    const today = new Date()
    return Math.floor((today.getTime() - lastWeighing.getTime()) / (1000 * 60 * 60 * 24))
  }

  const calculateProjectedExitDate = (currentWeight: number, gmd: number, targetWeight = 600) => {
    if (currentWeight >= targetWeight) return "Meta já atingida"
    if (gmd <= 0) return "GMD insuficiente"

    const daysToTarget = Math.ceil((targetWeight - currentWeight) / gmd)
    const exitDate = new Date()
    exitDate.setDate(exitDate.getDate() + daysToTarget)

    return exitDate.toLocaleDateString("pt-BR")
  }

  const getLastGMD = (historicoPeso: any[]) => {
    if (historicoPeso.length < 2) return 0
    return historicoPeso[historicoPeso.length - 1].gmd || 0
  }

  const getAverageGMD = (historicoPeso: any[]) => {
    const gmds = historicoPeso.filter((p) => p.gmd).map((p) => p.gmd)
    if (gmds.length === 0) return 0
    return gmds.reduce((sum, gmd) => sum + gmd, 0) / gmds.length
  }

  const handleQuickConnect = async () => {
    setIsConnecting(true)
    const success = await connectToScale()
    setIsConnecting(false)

    if (!success) {
      alert(
        "Balanca nao encontrada.\n\n" +
        "Para conectar a balanca XR5000:\n" +
        "1. Va para o menu 'Comunicacao'\n" +
        "2. Conecte via Bluetooth ou porta serial\n" +
        "3. Volte ao Curral - a conexao sera compartilhada automaticamente"
      )
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sessions" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Sessões de Curral
          </TabsTrigger>
          <TabsTrigger value="individual" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Manejo Individual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          <SessionManagement />
        </TabsContent>

        <TabsContent value="individual" className="space-y-6">
          {/* Scale Connection Status */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Balança Tru-Test XR5000</p>
                    <p className={`text-sm ${scaleConnected ? "text-green-600" : "text-muted-foreground"}`}>
                      {connectionStatus}
                    </p>
                    {lastReadingTime && (
                      <p className="text-xs text-muted-foreground">Última leitura: {lastReadingTime}</p>
                    )}
                  </div>
                  {liveWeight && (
                    <Badge variant="outline" className="ml-4">
                      Peso ao vivo: {liveWeight} kg
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  {!scaleConnected ? (
                    <Button
                      onClick={handleQuickConnect}
                      disabled={isConnecting}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {isConnecting ? "Conectando..." : "Conectar"}
                    </Button>
                  ) : (
                    <Button onClick={disconnectFromScale} variant="outline" size="sm">
                      <Wifi className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  )}
                  <Link href="/comunicacao">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Busca de Animal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Identificar Animal
                {scaleConnected && (
                  <Badge variant="secondary" className="ml-2">
                    <Usb className="h-3 w-3 mr-1" />
                    Leitura Automática
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {scaleConnected
                  ? "A identificação será feita automaticamente pela balança ou digite manualmente"
                  : "Digite o IDV (marca a fogo) ou IDE (brinco eletrônico) do animal"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Ex: 123 ou BR001234567890"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchAnimal()}
                  className="flex-1"
                  disabled={scaleConnected && isLoading}
                />
                <Button onClick={searchAnimal} disabled={isLoading}>
                  {isLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>

              {scaleConnected ? (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <Usb className="h-4 w-4 inline mr-1" />
                    Balanca conectada - A identificacao do animal sera feita automaticamente quando pesado
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <Settings className="h-4 w-4 inline mr-1" />
                    Balanca desconectada - Para receber dados automaticos, conecte primeiro via{" "}
                    <Link href="/comunicacao" className="underline font-medium">
                      menu Comunicacao
                    </Link>
                    {" "}(Bluetooth ou Serial)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dashboard do Animal */}
          {selectedAnimal && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Dados do Animal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">IDV (Marca a Fogo)</p>
                    <p className="font-semibold">{selectedAnimal.idv}</p>
                  </div>

                  {selectedAnimal.ide && (
                    <div>
                      <p className="text-sm text-muted-foreground">IDE (Brinco Eletrônico)</p>
                      <p className="font-semibold">{selectedAnimal.ide}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground">Sexo</p>
                    <Badge variant={selectedAnimal.sexo === "M" ? "default" : "secondary"}>
                      {selectedAnimal.sexo === "M" ? "Macho" : "Fêmea"}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedAnimal.dataNascimento ? "Data de Nascimento" : "Data de Compra"}
                    </p>
                    <p className="font-semibold">
                      {new Date(selectedAnimal.dataNascimento || selectedAnimal.dataCompra || "").toLocaleDateString(
                        "pt-BR",
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">
                      {selectedAnimal.dataNascimento ? "Idade" : "Tempo na Fazenda"}
                    </p>
                    <p className="font-semibold">
                      {calculateAge(selectedAnimal.dataNascimento || selectedAnimal.dataEntrada)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Origem</p>
                    <p className="font-semibold">
                      {selectedAnimal.origem === "nascido" ? `Nascido - ${selectedAnimal.fazendaNascimento}` : "Compra"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Dados de Peso e GMD */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Dados de Peso
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Atual</p>
                    <p className="text-2xl font-bold">{selectedAnimal.pesoAtual} kg</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Último GMD</p>
                    <p className="font-semibold text-green-600">
                      {getLastGMD(selectedAnimal.historicoPeso).toFixed(3)} kg/dia
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">GMD Histórico (Média)</p>
                    <p className="font-semibold text-blue-600">
                      {getAverageGMD(selectedAnimal.historicoPeso).toFixed(3)} kg/dia
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Dias desde última pesagem</p>
                    <p className="font-semibold">{calculateDaysSinceLastWeighing(selectedAnimal.historicoPeso)} dias</p>
                  </div>

                  {selectedAnimal.sexo === "M" && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Previsão de saída (último GMD)</p>
                        <p className="font-semibold text-orange-600">
                          {calculateProjectedExitDate(
                            selectedAnimal.pesoAtual,
                            getLastGMD(selectedAnimal.historicoPeso),
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Previsão de saída (GMD histórico)</p>
                        <p className="font-semibold text-purple-600">
                          {calculateProjectedExitDate(
                            selectedAnimal.pesoAtual,
                            getAverageGMD(selectedAnimal.historicoPeso),
                          )}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Dados Reprodutivos (apenas para fêmeas) */}
              {selectedAnimal.sexo === "F" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5" />
                      Dados Reprodutivos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant="outline">
                        {selectedAnimal.statusReprodutivo === "bezerra" && "Bezerra"}
                        {selectedAnimal.statusReprodutivo === "novilha" && "Novilha"}
                        {selectedAnimal.statusReprodutivo === "vaca" && "Vaca"}
                      </Badge>
                    </div>

                    {selectedAnimal.statusReprodutivo === "vaca" && (
                      <>
                        <div>
                          <p className="text-sm text-muted-foreground">Status Atual</p>
                          <p className="font-semibold">
                            {selectedAnimal.statusAtual === "solteira_vazia" && "Solteira Vazia"}
                            {selectedAnimal.statusAtual === "solteira_cheia" && "Solteira Cheia"}
                            {selectedAnimal.statusAtual === "parida_vazia" && "Parida Vazia"}
                            {selectedAnimal.statusAtual === "parida_cheia" && "Parida Cheia"}
                          </p>
                        </div>

                        {selectedAnimal.reprodutor && (
                          <div>
                            <p className="text-sm text-muted-foreground">Reprodutor</p>
                            <p className="font-semibold">{selectedAnimal.reprodutor}</p>
                          </div>
                        )}

                        {selectedAnimal.previsaoParto && (
                          <div>
                            <p className="text-sm text-muted-foreground">Previsão de Parto</p>
                            <p className="font-semibold">
                              {new Date(selectedAnimal.previsaoParto).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        )}

                        {selectedAnimal.crias && selectedAnimal.crias.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground">Crias ({selectedAnimal.crias.length})</p>
                            <div className="space-y-1">
                              {selectedAnimal.crias.map((cria, index) => (
                                <p key={index} className="text-sm">
                                  {cria.id} - {new Date(cria.dataNascimento).toLocaleDateString("pt-BR")}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {(selectedAnimal.statusReprodutivo === "bezerra" ||
                      selectedAnimal.statusReprodutivo === "novilha") && (
                      <p className="text-sm text-muted-foreground italic">
                        Dados reprodutivos não aplicáveis para {selectedAnimal.statusReprodutivo}s
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Gráfico de Evolução de Peso */}
          {selectedAnimal && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Evolução de Peso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedAnimal.historicoPeso}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" tickFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")} />
                      <YAxis label={{ value: "Peso (kg)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        labelFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")}
                        formatter={(value: any, name: string) => [
                          name === "peso" ? `${value} kg` : `${value} kg/dia`,
                          name === "peso" ? "Peso" : "GMD",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="peso"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
