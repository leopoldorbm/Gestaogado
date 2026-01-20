"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Scale,
  Users,
  CheckCircle,
  Plus,
  ArrowLeft,
  Activity,
  Zap,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react"
import { useScaleConnection } from "@/contexts/scale-connection-context"

interface Session {
  id: string
  nome_sessao: string
  tipo_manejo: string
  descricao_manejo?: string
  data_sessao: string
  hora_inicio?: string
  status: "ativa" | "finalizada" | "cancelada"
  observacoes?: string
}

interface SessionAnimal {
  id: string
  idv: string
  ide?: string
  sexo: "M" | "F"
  peso_registrado: number
  hora_registro: string
  observacoes_animal?: string
  procedimentos_realizados?: string[]
  medicamentos_aplicados?: string[]
}

interface ActiveSessionDashboardProps {
  session: Session
  onFinishSession: () => void
  onBackToSessions: () => void
}

export function ActiveSessionDashboard({ session, onFinishSession, onBackToSessions }: ActiveSessionDashboardProps) {
  const [sessionAnimals, setSessionAnimals] = useState<SessionAnimal[]>([])
  const [currentAnimal, setCurrentAnimal] = useState<Partial<SessionAnimal>>({})
  const [isRecording, setIsRecording] = useState(false)
  const [sessionStartTime] = useState(new Date())
  const [manualEntry, setManualEntry] = useState({
    idv: "",
    ide: "",
    peso: "",
    observacoes: "",
  })

  const [specialSituations, setSpecialSituations] = useState({
    brincosPerdidos: false,
    idvIlegivel: false,
  })

  const {
    isConnected: scaleConnected,
    liveWeight,
    lastReadingTime,
    receivedData,
    connectToScale,
  } = useScaleConnection()

  useEffect(() => {
    if (scaleConnected && receivedData && receivedData.weight && receivedData.stable) {
      console.log("[v0] Processing scale data for session:", receivedData)

      const newAnimal: SessionAnimal = {
        id: Date.now().toString(),
        idv: receivedData.visualId || receivedData.id,
        ide: receivedData.electronicId,
        sexo: "M", // Default to male, can be updated later
        peso_registrado: receivedData.weight,
        hora_registro: new Date().toLocaleTimeString("pt-BR"),
        observacoes_animal: `Registro automático via balança XR5000 - ${receivedData.stable ? "Peso estável" : "Peso instável"}`,
      }

      setSessionAnimals((prev) => {
        // Check if animal already exists by IDV or IDE
        const exists = prev.find(
          (animal) => animal.idv === newAnimal.idv || (animal.ide && newAnimal.ide && animal.ide === newAnimal.ide),
        )

        if (!exists) {
          console.log("[v0] Adding new animal to session:", newAnimal)
          return [newAnimal, ...prev]
        } else {
          console.log("[v0] Animal already exists in session, skipping:", newAnimal.idv)
          return prev
        }
      })

      // Clear manual entry fields after automatic registration
      setCurrentAnimal({})
      setManualEntry({ idv: "", ide: "", peso: "", observacoes: "" })
    }
  }, [receivedData, scaleConnected])

  const addAnimalManually = () => {
    const hasValidId = manualEntry.idv || manualEntry.ide
    const hasSpecialSituation = specialSituations.brincosPerdidos || specialSituations.idvIlegivel

    if (!hasValidId && !hasSpecialSituation) {
      alert("IDV ou IDE são obrigatórios, exceto em situações especiais (brinco perdido ou IDV ilegível)")
      return
    }

    if (!manualEntry.peso) {
      alert("Peso é obrigatório")
      return
    }

    let finalIdv = manualEntry.idv
    const finalIde = manualEntry.ide
    let observacoes = manualEntry.observacoes || "Registro manual"

    if (specialSituations.brincosPerdidos) {
      finalIdv = `SEM_BRINCO_${Date.now()}`
      observacoes += " - Animal sem brinco eletrônico"
    }

    if (specialSituations.idvIlegivel) {
      if (!finalIdv) {
        finalIdv = `IDV_ILEGIVEL_${Date.now()}`
      }
      observacoes += " - IDV ilegível/borrado"
    }

    const newAnimal: SessionAnimal = {
      id: Date.now().toString(),
      idv: finalIdv,
      ide: finalIde || undefined,
      sexo: "M",
      peso_registrado: Number.parseFloat(manualEntry.peso),
      hora_registro: new Date().toLocaleTimeString("pt-BR"),
      observacoes_animal: observacoes,
    }

    setSessionAnimals((prev) => [newAnimal, ...prev])
    setManualEntry({ idv: "", ide: "", peso: "", observacoes: "" })
    setSpecialSituations({ brincosPerdidos: false, idvIlegivel: false })
  }

  const removeAnimal = (animalId: string) => {
    setSessionAnimals((prev) => prev.filter((animal) => animal.id !== animalId))
  }

  const finishSession = () => {
    if (sessionAnimals.length === 0) {
      alert("Adicione pelo menos um animal antes de finalizar a sessão")
      return
    }

    const confirmed = confirm(
      `Finalizar sessão "${session.nome_sessao}" com ${sessionAnimals.length} animais registrados?`,
    )
    if (confirmed) {
      console.log("[v0] Finalizing session:", {
        session,
        animals: sessionAnimals,
        duration: new Date().getTime() - sessionStartTime.getTime(),
      })

      onFinishSession()
    }
  }

  const getSessionDuration = () => {
    const now = new Date()
    const diff = now.getTime() - sessionStartTime.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const calculateStats = () => {
    const total = sessionAnimals.length
    const machos = sessionAnimals.filter((a) => a.sexo === "M").length
    const femeas = sessionAnimals.filter((a) => a.sexo === "F").length
    const pesoMedio = total > 0 ? sessionAnimals.reduce((sum, a) => sum + a.peso_registrado, 0) / total : 0

    return { total, machos, femeas, pesoMedio }
  }

  const stats = calculateStats()

  const getAnimalHistory = async (idv: string, ide?: string) => {
    try {
      const mockHistory = {
        lastWeight: 420,
        lastWeighingDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        totalWeighings: 3,
      }
      return mockHistory
    } catch (error) {
      console.log("[v0] Error fetching animal history:", error)
      return null
    }
  }

  const calculateGMD = (currentWeight: number, lastWeight: number, daysDifference: number) => {
    if (daysDifference === 0) return 0
    return (currentWeight - lastWeight) / daysDifference
  }

  const calculateDaysSinceLastWeighing = (lastDate: Date) => {
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBackToSessions}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-green-600">Sessão Ativa</h2>
            <p className="text-muted-foreground">{session.nome_sessao}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Duração</p>
            <p className="font-semibold">{getSessionDuration()}</p>
          </div>
          <Button onClick={finishSession} className="bg-red-600 hover:bg-red-700">
            <CheckCircle className="h-4 w-4 mr-2" />
            Finalizar Sessão
          </Button>
        </div>
      </div>

      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Scale className="h-5 w-5" />
            Entrada de Dados do Animal
          </CardTitle>
          <CardDescription>
            {scaleConnected ? "Dados sendo recebidos automaticamente da balança" : "Insira os dados manualmente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="current-idv" className="text-sm font-medium">
                    IDV (Marca a Fogo) *
                  </Label>
                  <Input
                    id="current-idv"
                    value={scaleConnected ? receivedData?.visualId || receivedData?.id || "" : manualEntry.idv}
                    onChange={(e) => !scaleConnected && setManualEntry((prev) => ({ ...prev, idv: e.target.value }))}
                    placeholder="123"
                    className="text-lg font-semibold"
                    disabled={scaleConnected || specialSituations.idvIlegivel}
                  />
                </div>
                <div>
                  <Label htmlFor="current-ide" className="text-sm font-medium">
                    IDE (Brinco Eletrônico) *
                  </Label>
                  <Input
                    id="current-ide"
                    value={scaleConnected ? receivedData?.electronicId || "" : manualEntry.ide}
                    onChange={(e) => !scaleConnected && setManualEntry((prev) => ({ ...prev, ide: e.target.value }))}
                    placeholder="BR001234567890"
                    className="text-lg"
                    disabled={scaleConnected || specialSituations.brincosPerdidos}
                  />
                </div>
              </div>

              {!scaleConnected && (
                <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <Label className="text-sm font-medium text-yellow-800">Situações Especiais</Label>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="brinco-perdido"
                        checked={specialSituations.brincosPerdidos}
                        onCheckedChange={(checked) =>
                          setSpecialSituations((prev) => ({ ...prev, brincosPerdidos: !!checked }))
                        }
                      />
                      <Label htmlFor="brinco-perdido" className="text-sm text-yellow-700">
                        Animal perdeu o brinco eletrônico
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="idv-ilegivel"
                        checked={specialSituations.idvIlegivel}
                        onCheckedChange={(checked) =>
                          setSpecialSituations((prev) => ({ ...prev, idvIlegivel: !!checked }))
                        }
                      />
                      <Label htmlFor="idv-ilegivel" className="text-sm text-yellow-700">
                        IDV (marca a fogo) está borrado/ilegível
                      </Label>
                    </div>
                  </div>

                  {(specialSituations.brincosPerdidos || specialSituations.idvIlegivel) && (
                    <div className="text-xs text-yellow-600 mt-2">
                      <p>{specialSituations.brincosPerdidos && "• ID automático será gerado para animal sem brinco"}</p>
                      <p>{specialSituations.idvIlegivel && "• ID automático será gerado para IDV ilegível"}</p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="current-weight" className="text-sm font-medium">
                  Peso Atual (kg) *
                </Label>
                <Input
                  id="current-weight"
                  type="number"
                  value={scaleConnected ? receivedData?.weight || liveWeight || "" : manualEntry.peso}
                  onChange={(e) => !scaleConnected && setManualEntry((prev) => ({ ...prev, peso: e.target.value }))}
                  placeholder="450"
                  className="text-2xl font-bold text-green-600"
                  disabled={scaleConnected}
                />
              </div>

              {!scaleConnected && (
                <div>
                  <Label htmlFor="current-obs" className="text-sm font-medium">
                    Observações
                  </Label>
                  <Input
                    id="current-obs"
                    value={manualEntry.observacoes}
                    onChange={(e) => setManualEntry((prev) => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações sobre o animal"
                  />
                </div>
              )}

              {!scaleConnected && (
                <Button onClick={addAnimalManually} className="w-full bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Animal
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-600 font-medium">GMD (Ganho Médio Diário)</p>
                        <p className="text-xl font-bold text-blue-700">
                          {receivedData?.weight || manualEntry.peso
                            ? `+${calculateGMD(Number(receivedData?.weight || manualEntry.peso || 0), 420, 45).toFixed(
                                2,
                              )} kg/dia`
                            : "Aguardando peso"}
                        </p>
                        <p className="text-xs text-blue-500">vs. última pesagem</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <div>
                        <p className="text-sm text-orange-600 font-medium">Dias desde última pesagem</p>
                        <p className="text-xl font-bold text-orange-700">45 dias</p>
                        <p className="text-xs text-orange-500">Última: 420 kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Histórico de Pesagens</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Peso Anterior:</span>
                        <span className="font-medium">420 kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Data Anterior:</span>
                        <span className="font-medium">
                          {new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total de Pesagens:</span>
                        <span className="font-medium">3</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Status da Balança</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={scaleConnected ? "default" : "secondary"} className="text-xs">
                      {scaleConnected ? "Conectada COM6" : "Desconectada"}
                    </Badge>
                    {scaleConnected && (
                      <span className="text-xs text-green-600">
                        Última leitura: {lastReadingTime || "Aguardando..."}
                      </span>
                    )}
                  </div>
                  {scaleConnected && receivedData && (
                    <div className="mt-2 text-xs text-green-700">
                      <p>
                        IDV: {receivedData.visualId || receivedData.id} | IDE: {receivedData.electronicId || "N/A"}
                      </p>
                      <p>
                        Peso: {receivedData.weight}kg | Status: {receivedData.stable ? "Estável" : "Instável"}
                      </p>
                    </div>
                  )}
                </div>
                {!scaleConnected && (
                  <Button size="sm" variant="outline" onClick={connectToScale}>
                    <Zap className="h-4 w-4 mr-1" />
                    Conectar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo de Manejo</p>
              <p className="font-semibold">{session.tipo_manejo}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data/Hora Início</p>
              <p className="font-semibold">
                {new Date(session.data_sessao).toLocaleDateString("pt-BR")} -{" "}
                {sessionStartTime.toLocaleTimeString("pt-BR")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Duração da Sessão</p>
              <p className="font-semibold">{getSessionDuration()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Animais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{stats.machos}</p>
                <p className="text-sm text-muted-foreground">Machos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-pink-600" />
              <div>
                <p className="text-2xl font-bold">{stats.femeas}</p>
                <p className="text-sm text-muted-foreground">Fêmeas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Animais Manejados ({sessionAnimals.length})
          </CardTitle>
          <CardDescription>
            {scaleConnected
              ? "Animais sendo registrados automaticamente pela balança"
              : "Lista de animais registrados manualmente"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionAnimals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum animal registrado ainda</p>
              <p className="text-sm">
                {scaleConnected ? "Aguardando leituras da balança..." : "Use o formulário acima para adicionar animais"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IDV</TableHead>
                  <TableHead>IDE</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionAnimals.map((animal) => (
                  <TableRow key={animal.id}>
                    <TableCell className="font-medium">{animal.idv}</TableCell>
                    <TableCell>{animal.ide || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={animal.sexo === "M" ? "default" : "secondary"}>
                        {animal.sexo === "M" ? "Macho" : "Fêmea"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{animal.peso_registrado}</TableCell>
                    <TableCell>{animal.hora_registro}</TableCell>
                    <TableCell className="max-w-xs truncate">{animal.observacoes_animal || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeAnimal(animal.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
