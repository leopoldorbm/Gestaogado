"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Clock, Scale, Search, CheckCircle, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { AddWeighingModal } from "@/components/add-weighing-modal"

interface AlertItem {
  id: string
  type: "weighing" | "health" | "reproductive" | "financial"
  priority: "high" | "medium" | "low"
  title: string
  description: string
  animal: {
    id: string
    marca_fogo: string
    brinco_eletronico: string | null
    sexo: "Macho" | "Fêmea"
    fazendas: { nome: string } | null
    lotes: { nome: string } | null
  }
  daysOverdue?: number
  lastAction?: string
  actionRequired: string
  resolved: boolean
}

export function AlertsInterface() {
  const { toast } = useToast()
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [weighingAnimal, setWeighingAnimal] = useState<any>(null)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const supabase = createClient()

      const { data: cattle, error } = await supabase
        .from("gado")
        .select(`
          *,
          fazendas:fazenda_id(nome),
          lotes:lote_id(nome),
          pesagens(peso, data_pesagem, observacoes)
        `)
        .eq("ativo", true)

      if (error) throw error

      const alertItems: AlertItem[] = []
      const now = new Date()

      cattle?.forEach((animal) => {
        // Alerta de pesagem
        let needsWeighing = false
        let daysSinceWeighing = 0
        let lastWeighingDate: string | null = null

        if (!animal.pesagens || animal.pesagens.length === 0) {
          needsWeighing = true
          daysSinceWeighing = Math.ceil(
            (now.getTime() - new Date(animal.data_entrada).getTime()) / (1000 * 60 * 60 * 24),
          )
        } else {
          const sortedWeighings = animal.pesagens.sort(
            (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
          )
          const lastWeighing = sortedWeighings[0]
          lastWeighingDate = lastWeighing.data_pesagem
          daysSinceWeighing = Math.ceil(
            (now.getTime() - new Date(lastWeighing.data_pesagem).getTime()) / (1000 * 60 * 60 * 24),
          )

          if (daysSinceWeighing > 120) {
            needsWeighing = true
          }
        }

        if (needsWeighing) {
          alertItems.push({
            id: `weighing-${animal.id}`,
            type: "weighing",
            priority: daysSinceWeighing > 180 ? "high" : daysSinceWeighing > 120 ? "medium" : "low",
            title: "Pesagem Necessária",
            description: lastWeighingDate ? `Última pesagem há ${daysSinceWeighing} dias` : "Animal nunca foi pesado",
            animal: {
              id: animal.id,
              marca_fogo: animal.marca_fogo,
              brinco_eletronico: animal.brinco_eletronico,
              sexo: animal.sexo,
              fazendas: animal.fazendas,
              lotes: animal.lotes,
            },
            daysOverdue: daysSinceWeighing,
            lastAction: lastWeighingDate
              ? `Pesado em ${new Date(lastWeighingDate).toLocaleDateString("pt-BR")}`
              : "Nunca pesado",
            actionRequired: "Realizar pesagem",
            resolved: false,
          })
        }

        // Alerta reprodutivo para fêmeas
        if (animal.sexo === "Fêmea" && animal.status_reproducao === "Prenha") {
          // Calcular tempo de gestação se houver data de nascimento
          if (animal.data_nascimento) {
            const birthDate = new Date(animal.data_nascimento)
            const ageInMonths = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)

            if (ageInMonths > 24) {
              // Fêmea adulta prenha - monitorar
              alertItems.push({
                id: `reproductive-${animal.id}`,
                type: "reproductive",
                priority: "medium",
                title: "Fêmea Prenha",
                description: "Monitorar desenvolvimento da gestação",
                animal: {
                  id: animal.id,
                  marca_fogo: animal.marca_fogo,
                  brinco_eletronico: animal.brinco_eletronico,
                  sexo: animal.sexo,
                  fazendas: animal.fazendas,
                  lotes: animal.lotes,
                },
                actionRequired: "Acompanhar gestação",
                resolved: false,
              })
            }
          }
        }

        // Alerta financeiro - animais sem valor de compra
        if (!animal.valor_compra) {
          alertItems.push({
            id: `financial-${animal.id}`,
            type: "financial",
            priority: "low",
            title: "Valor de Compra Não Informado",
            description: "Animal sem valor de compra registrado",
            animal: {
              id: animal.id,
              marca_fogo: animal.marca_fogo,
              brinco_eletronico: animal.brinco_eletronico,
              sexo: animal.sexo,
              fazendas: animal.fazendas,
              lotes: animal.lotes,
            },
            actionRequired: "Informar valor de compra",
            resolved: false,
          })
        }
      })

      // Ordenar por prioridade e dias em atraso
      alertItems.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        }
        return (b.daysOverdue || 0) - (a.daysOverdue || 0)
      })

      setAlerts(alertItems)
    } catch (error) {
      console.error("Erro ao carregar alertas:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar alertas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const markAsResolved = async (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, resolved: true } : alert)))

    toast({
      title: "Alerta resolvido",
      description: "Alerta marcado como resolvido",
    })
  }

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch =
      alert.animal.marca_fogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alert.animal.brinco_eletronico?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPriority = priorityFilter === "all" || alert.priority === priorityFilter
    const matchesType = typeFilter === "all" || alert.type === typeFilter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !alert.resolved) ||
      (statusFilter === "resolved" && alert.resolved)

    return matchesSearch && matchesPriority && matchesType && matchesStatus
  })

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive"
      case "medium":
        return "default"
      case "low":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "weighing":
        return <Scale className="h-4 w-4" />
      case "health":
        return <AlertTriangle className="h-4 w-4" />
      case "reproductive":
        return <Clock className="h-4 w-4" />
      case "financial":
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "weighing":
        return "Pesagem"
      case "health":
        return "Saúde"
      case "reproductive":
        return "Reprodutivo"
      case "financial":
        return "Financeiro"
      default:
        return "Geral"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando alertas...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumo de alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {alerts.filter((a) => a.priority === "high" && !a.resolved).length}
                </div>
                <p className="text-sm text-red-600">Alta Prioridade</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {alerts.filter((a) => a.priority === "medium" && !a.resolved).length}
                </div>
                <p className="text-sm text-orange-600">Média Prioridade</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {alerts.filter((a) => a.type === "weighing" && !a.resolved).length}
                </div>
                <p className="text-sm text-blue-600">Precisam Pesagem</p>
              </div>
              <Scale className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{alerts.filter((a) => a.resolved).length}</div>
                <p className="text-sm text-green-600">Resolvidos</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Animal ou tipo de alerta..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority-filter">Prioridade</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="weighing">Pesagem</SelectItem>
                  <SelectItem value="reproductive">Reprodutivo</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="resolved">Resolvidos</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alertas */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum alerta encontrado</h3>
              <p className="text-muted-foreground">
                {statusFilter === "pending"
                  ? "Parabéns! Não há alertas pendentes no momento."
                  : "Nenhum alerta corresponde aos filtros selecionados."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card key={alert.id} className={alert.resolved ? "opacity-60" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(alert.type)}
                      {alert.resolved ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge variant={getPriorityColor(alert.priority)}>{alert.priority.toUpperCase()}</Badge>
                        <Badge variant="outline">{getTypeLabel(alert.type)}</Badge>
                      </div>

                      <p className="text-muted-foreground mb-2">{alert.description}</p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          <strong>Animal:</strong> {alert.animal.marca_fogo}
                          {alert.animal.brinco_eletronico && ` (${alert.animal.brinco_eletronico})`}
                        </span>
                        <span>
                          <strong>Fazenda:</strong> {alert.animal.fazendas?.nome || "N/A"}
                        </span>
                        <span>
                          <strong>Lote:</strong> {alert.animal.lotes?.nome || "N/A"}
                        </span>
                      </div>

                      {alert.lastAction && (
                        <p className="text-sm text-muted-foreground mt-1">
                          <strong>Última ação:</strong> {alert.lastAction}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {alert.type === "weighing" && !alert.resolved && (
                      <Button
                        size="sm"
                        onClick={() => setWeighingAnimal(alert.animal)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Scale className="h-4 w-4 mr-1" />
                        Pesar
                      </Button>
                    )}
                    {!alert.resolved && (
                      <Button size="sm" variant="outline" onClick={() => markAsResolved(alert.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de pesagem */}
      {weighingAnimal && (
        <AddWeighingModal
          animal={weighingAnimal}
          open={!!weighingAnimal}
          onClose={() => setWeighingAnimal(null)}
          onSuccess={() => {
            setWeighingAnimal(null)
            loadAlerts() // Recarregar alertas após pesagem
          }}
        />
      )}
    </div>
  )
}
