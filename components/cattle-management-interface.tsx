"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Eye, Scale, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { CattleDetailModal } from "@/components/cattle-detail-modal"
import { AddWeighingModal } from "@/components/add-weighing-modal"

interface CattleData {
  id: string
  marca_fogo: string
  brinco_eletronico: string | null
  sexo: "Macho" | "Fêmea"
  origem: string | null
  status_reproducao: "Prenha" | "Vazia" | "Não se aplica"
  data_nascimento: string | null
  data_entrada: string
  data_saida: string | null
  valor_compra: number | null
  valor_venda: number | null
  ativo: boolean
  fazendas: { nome: string } | null
  lotes: { nome: string } | null
  pesagens: { peso: number; data_pesagem: string }[]
}

interface Fazenda {
  id: string
  nome: string
}

export function CattleManagementInterface() {
  const { toast } = useToast()
  const [cattle, setCattle] = useState<CattleData[]>([])
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAnimal, setSelectedAnimal] = useState<CattleData | null>(null)
  const [weighingAnimal, setWeighingAnimal] = useState<CattleData | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [sexFilter, setSexFilter] = useState("Todos")
  const [fazendaFilter, setFazendaFilter] = useState("Todas")
  const [statusFilter, setStatusFilter] = useState("ativo")

  useEffect(() => {
    loadCattle()
    loadFazendas()
  }, [])

  const loadFazendas = async () => {
    const { data, error } = await supabase.from("fazendas").select("id, nome").order("nome")

    if (error) {
      console.error("Erro ao carregar fazendas:", error)
      return
    }

    setFazendas(data || [])
  }

  const loadCattle = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("gado")
      .select(`
        *,
        fazendas:fazenda_id(nome),
        lotes:lote_id(nome),
        pesagens(peso, data_pesagem)
      `)
      .order("marca_fogo")

    if (error) {
      console.error("Erro ao carregar gado:", error)
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do rebanho",
        variant: "destructive",
      })
      return
    }

    setCattle(data || [])
    setLoading(false)
  }

  const getLastWeighing = (pesagens: { peso: number; data_pesagem: string }[]) => {
    if (!pesagens || pesagens.length === 0) return null

    const sorted = pesagens.sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime())

    return sorted[0]
  }

  const getDaysSinceLastWeighing = (pesagens: { peso: number; data_pesagem: string }[]) => {
    const lastWeighing = getLastWeighing(pesagens)
    if (!lastWeighing) return null

    const today = new Date()
    const weighingDate = new Date(lastWeighing.data_pesagem)
    const diffTime = Math.abs(today.getTime() - weighingDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  const filteredCattle = cattle.filter((animal) => {
    const matchesSearch =
      animal.marca_fogo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (animal.brinco_eletronico?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesSex = sexFilter === "Todos" || animal.sexo === sexFilter
    const matchesFazenda = fazendaFilter === "Todas" || animal.fazendas?.nome === fazendaFilter
    const matchesStatus =
      statusFilter === "todos" ||
      (statusFilter === "ativo" && animal.ativo) ||
      (statusFilter === "inativo" && !animal.ativo)

    return matchesSearch && matchesSex && matchesFazenda && matchesStatus
  })

  const formatCurrency = (value: number | null) => {
    if (!value) return "-"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando rebanho...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Marca a fogo ou brinco..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sex-filter">Sexo</Label>
              <Select value={sexFilter} onValueChange={setSexFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Macho">Macho</SelectItem>
                  <SelectItem value="Fêmea">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fazenda-filter">Fazenda</Label>
              <Select value={fazendaFilter} onValueChange={setFazendaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  {fazendas.map((fazenda) => (
                    <SelectItem key={fazenda.id} value={fazenda.nome}>
                      {fazenda.nome}
                    </SelectItem>
                  ))}
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
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredCattle.length}</div>
            <p className="text-xs text-muted-foreground">Animais encontrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredCattle.filter((a) => a.sexo === "Macho").length}</div>
            <p className="text-xs text-muted-foreground">Machos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredCattle.filter((a) => a.sexo === "Fêmea").length}</div>
            <p className="text-xs text-muted-foreground">Fêmeas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {
                filteredCattle.filter((a) => {
                  const days = getDaysSinceLastWeighing(a.pesagens)
                  return days === null || days > 120
                }).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Precisam pesagem</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Rebanho</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Identificação</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Fazenda/Lote</TableHead>
                  <TableHead>Último Peso</TableHead>
                  <TableHead>Dias s/ Pesagem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCattle.map((animal) => {
                  const lastWeighing = getLastWeighing(animal.pesagens)
                  const daysSinceWeighing = getDaysSinceLastWeighing(animal.pesagens)

                  return (
                    <TableRow key={animal.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{animal.marca_fogo}</div>
                          {animal.brinco_eletronico && (
                            <div className="text-sm text-muted-foreground">{animal.brinco_eletronico}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={animal.sexo === "Macho" ? "default" : "secondary"}>{animal.sexo}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{animal.fazendas?.nome || "-"}</div>
                          <div className="text-sm text-muted-foreground">{animal.lotes?.nome || "Sem lote"}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lastWeighing ? (
                          <div>
                            <div className="font-medium">{lastWeighing.peso} kg</div>
                            <div className="text-sm text-muted-foreground">{formatDate(lastWeighing.data_pesagem)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Sem pesagem</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {daysSinceWeighing !== null ? (
                          <Badge variant={daysSinceWeighing > 120 ? "destructive" : "outline"}>
                            {daysSinceWeighing} dias
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Nunca</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={animal.ativo ? "default" : "secondary"}>
                          {animal.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedAnimal(animal)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setWeighingAnimal(animal)}>
                            <Scale className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modais */}
      {selectedAnimal && (
        <CattleDetailModal
          animal={selectedAnimal}
          open={!!selectedAnimal}
          onClose={() => setSelectedAnimal(null)}
          onUpdate={loadCattle}
        />
      )}

      {weighingAnimal && (
        <AddWeighingModal
          animal={weighingAnimal}
          open={!!weighingAnimal}
          onClose={() => setWeighingAnimal(null)}
          onSuccess={() => {
            setWeighingAnimal(null)
            loadCattle()
          }}
        />
      )}
    </div>
  )
}
