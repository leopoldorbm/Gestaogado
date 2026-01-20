"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Calendar, Users, FileText, Eye, BarChart3, Activity, MoreVertical, Play, Trash2 } from "lucide-react"
import { ActiveSessionDashboard } from "./active-session-dashboard"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface Session {
  id: string
  nome_sessao: string
  tipo_manejo: string
  descricao_manejo?: string
  data_sessao: string
  hora_inicio?: string
  hora_fim?: string
  status: "ativa" | "finalizada" | "cancelada"
  observacoes?: string
  total_animais?: number
}

interface SessionAnimal {
  id: string
  gado_id: string
  idv: string
  ide?: string
  sexo: "M" | "F"
  peso_registrado?: number
  observacoes_animal?: string
  procedimentos_realizados?: string[]
  medicamentos_aplicados?: string[]
}

interface SessionReport {
  total_animais: number
  machos: number
  femeas: number
  bois_corte: number
  vacas_solteiras: number
  vacas_paridas: number
  vacas_cheias: number
  vacas_vazias: number
  peso_medio: number
}

export function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [sessionAnimals, setSessionAnimals] = useState<SessionAnimal[]>([])
  const [sessionReport, setSessionReport] = useState<SessionReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)

  const [formData, setFormData] = useState({
    nome_sessao: "",
    tipo_manejo: "",
    descricao_manejo: "",
    observacoes: "",
  })

  const tiposManejo = [
    { value: "sanitario", label: "Sanitário/Vacina" },
    { value: "medicacao", label: "Aplicação de Medicação" },
    { value: "iatf", label: "Protocolo IATF" },
    { value: "pesagem", label: "Pesagem Periódica" },
    { value: "outros", label: "Outros" },
  ]

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    const mockSessions: Session[] = [
      {
        id: "1",
        nome_sessao: "Vacinação Aftosa - Lote 1",
        tipo_manejo: "sanitario",
        descricao_manejo: "Vacinação contra febre aftosa",
        data_sessao: "2024-01-15",
        hora_inicio: "08:00",
        hora_fim: "12:00",
        status: "finalizada",
        total_animais: 45,
      },
      {
        id: "2",
        nome_sessao: "IATF - Novilhas",
        tipo_manejo: "iatf",
        descricao_manejo: "Protocolo de inseminação artificial",
        data_sessao: "2024-01-20",
        hora_inicio: "07:00",
        status: "ativa",
        total_animais: 23,
      },
    ]
    setSessions(mockSessions)
  }

  const createSession = async () => {
    if (!formData.nome_sessao || !formData.tipo_manejo) {
      alert("Preencha os campos obrigatórios")
      return
    }

    setIsLoading(true)

    const newSession: Session = {
      id: Date.now().toString(),
      nome_sessao: formData.nome_sessao,
      tipo_manejo: formData.tipo_manejo,
      descricao_manejo: formData.descricao_manejo,
      data_sessao: new Date().toISOString().split("T")[0],
      status: "ativa",
      observacoes: formData.observacoes,
      total_animais: 0,
    }

    setSessions((prev) => [newSession, ...prev])
    setFormData({ nome_sessao: "", tipo_manejo: "", descricao_manejo: "", observacoes: "" })
    setIsCreateDialogOpen(false)
    setIsLoading(false)

    setActiveSession(newSession)
  }

  const handleFinishSession = () => {
    if (activeSession) {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession.id ? { ...session, status: "finalizada" as const } : session,
        ),
      )
      setActiveSession(null)
    }
  }

  const startActiveSession = (session: Session) => {
    if (session.status === "ativa") {
      setActiveSession(session)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ativa":
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>
      case "finalizada":
        return <Badge className="bg-blue-100 text-blue-800">Finalizada</Badge>
      case "cancelada":
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTipoManejoLabel = (tipo: string) => {
    const found = tiposManejo.find((t) => t.value === tipo)
    return found ? found.label : tipo
  }

  const loadSessionDetails = (session: Session) => {
    // Placeholder for loading session details logic
    setSelectedSession(session)
    // Example session report data
    const report: SessionReport = {
      total_animais: session.total_animais || 0,
      machos: 10,
      femeas: 15,
      bois_corte: 5,
      vacas_solteiras: 3,
      vacas_paridas: 4,
      vacas_cheias: 2,
      vacas_vazias: 1,
      peso_medio: 150,
    }
    setSessionReport(report)
    // Example session animals data
    const animals: SessionAnimal[] = [
      { id: "1", gado_id: "G1", idv: "IDV1", sexo: "M", peso_registrado: 160 },
      { id: "2", gado_id: "G2", idv: "IDV2", sexo: "F", peso_registrado: 140 },
    ]
    setSessionAnimals(animals)
  }

  const reopenSession = (session: Session) => {
    if (session.status === "finalizada") {
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: "ativa" as const } : s)))
      setActiveSession(session)
    }
  }

  const deleteSession = (sessionId: string) => {
    if (confirm("Tem certeza que deseja deletar esta sessão? Esta ação não pode ser desfeita.")) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setSessionReport(null)
        setSessionAnimals([])
      }
    }
  }

  if (activeSession) {
    return (
      <ActiveSessionDashboard
        session={activeSession}
        onFinishSession={handleFinishSession}
        onBackToSessions={() => setActiveSession(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Sessões de Curral</h2>
          <p className="text-muted-foreground">Gerencie os eventos de manejo do rebanho</p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Sessão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Nova Sessão</DialogTitle>
              <DialogDescription>Configure uma nova sessão de manejo para o curral</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="nome_sessao">Nome da Sessão *</Label>
                <Input
                  id="nome_sessao"
                  value={formData.nome_sessao}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome_sessao: e.target.value }))}
                  placeholder="Ex: Vacinação Aftosa - Lote 1"
                />
              </div>

              <div>
                <Label htmlFor="tipo_manejo">Tipo de Manejo *</Label>
                <Select
                  value={formData.tipo_manejo}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo_manejo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposManejo.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="descricao_manejo">Descrição do Manejo</Label>
                <Input
                  id="descricao_manejo"
                  value={formData.descricao_manejo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, descricao_manejo: e.target.value }))}
                  placeholder="Descreva o procedimento"
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações gerais da sessão"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={createSession} disabled={isLoading} className="flex-1">
                  {isLoading ? "Criando..." : "Criar Sessão"}
                </Button>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Sessões</CardTitle>
          <CardDescription>Visualize e gerencie todas as sessões de manejo realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Sessão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Animais</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.nome_sessao}</TableCell>
                  <TableCell>{getTipoManejoLabel(session.tipo_manejo)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(session.data_sessao).toLocaleDateString("pt-BR")}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(session.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {session.total_animais || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {session.status === "ativa" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => startActiveSession(session)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Activity className="h-4 w-4 mr-1" />
                          Continuar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => loadSessionDetails(session)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {session.status === "finalizada" && (
                            <DropdownMenuItem onClick={() => reopenSession(session)}>
                              <Play className="h-4 w-4 mr-2" />
                              Reabrir Sessão
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => deleteSession(session.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar Sessão
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedSession && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatório da Sessão
              </CardTitle>
              <CardDescription>{selectedSession.nome_sessao}</CardDescription>
            </CardHeader>
            <CardContent>
              {sessionReport && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Animais</p>
                    <p className="text-2xl font-bold">{sessionReport.total_animais}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Peso Médio</p>
                    <p className="text-2xl font-bold">{sessionReport.peso_medio} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Machos</p>
                    <p className="text-xl font-semibold text-blue-600">{sessionReport.machos}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fêmeas</p>
                    <p className="text-xl font-semibold text-pink-600">{sessionReport.femeas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bois de Corte</p>
                    <p className="text-lg font-semibold">{sessionReport.bois_corte}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vacas Paridas</p>
                    <p className="text-lg font-semibold">{sessionReport.vacas_paridas}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vacas Cheias</p>
                    <p className="text-lg font-semibold text-green-600">{sessionReport.vacas_cheias}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vacas Vazias</p>
                    <p className="text-lg font-semibold text-orange-600">{sessionReport.vacas_vazias}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Animais Manejados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessionAnimals.map((animal) => (
                  <div key={animal.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">IDV: {animal.idv}</p>
                        {animal.ide && <p className="text-sm text-muted-foreground">IDE: {animal.ide}</p>}
                      </div>
                      <Badge variant={animal.sexo === "M" ? "default" : "secondary"}>
                        {animal.sexo === "M" ? "Macho" : "Fêmea"}
                      </Badge>
                    </div>

                    {animal.peso_registrado && (
                      <p className="text-sm">
                        <strong>Peso:</strong> {animal.peso_registrado} kg
                      </p>
                    )}

                    {animal.procedimentos_realizados && animal.procedimentos_realizados.length > 0 && (
                      <p className="text-sm">
                        <strong>Procedimentos:</strong> {animal.procedimentos_realizados.join(", ")}
                      </p>
                    )}

                    {animal.observacoes_animal && (
                      <p className="text-sm text-muted-foreground mt-1">{animal.observacoes_animal}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
