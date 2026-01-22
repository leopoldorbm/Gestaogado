"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, Plus, Pencil, Trash2, Users, Layers, MapPin} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useFarm } from "@/contexts/farm-context"

interface Lote {
  id: string
  nome: string
  fazenda_id: string
  area_hectares: number | null
  capacidade_animais: number | null
  created_at: string
  fazendas?: { nome: string } | null
  animal_count?: number
}

export default function LotesPage() {
  const { toast } = useToast()
  const { selectedFarm, fazendas } = useFarm()
  const [lotes, setLotes] = useState<Lote[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLote, setSelectedLote] = useState<Lote | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nome: "",
    fazenda_id: "",
    area_hectares: "",
    capacidade_animais: "",
  })

  useEffect(() => {
    loadLotes()
  }, [selectedFarm])

  const loadLotes = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      let query = supabase
        .from("lotes")
        .select(`
          *,
          fazendas:fazenda_id(nome)
        `)
        .order("nome")

      if (selectedFarm) {
        query = query.eq("fazenda_id", selectedFarm)
      }

      const { data: lotesData, error } = await query

      if (error) {
        console.error("[v0] Error loading lotes:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar lotes",
          variant: "destructive",
        })
        setLotes([])
        return
      }

      // Count animals per lote
      const lotesWithCount = await Promise.all(
        (lotesData || []).map(async (lote) => {
          const { count } = await supabase
            .from("gado")
            .select("*", { count: "exact", head: true })
            .eq("lote_id", lote.id)
            .eq("ativo", true)

          return {
            ...lote,
            animal_count: count || 0,
          }
        })
      )

      setLotes(lotesWithCount)
    } catch (err) {
      console.error("[v0] Unexpected error:", err)
      toast({
        title: "Erro",
        description: "Erro inesperado ao carregar lotes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (lote?: Lote) => {
    if (lote) {
      setSelectedLote(lote)
      setFormData({
        nome: lote.nome,
        fazenda_id: lote.fazenda_id,
        area_hectares: lote.area_hectares?.toString() || "",
        capacidade_animais: lote.capacidade_animais?.toString() || "",
      })
    } else {
      setSelectedLote(null)
      setFormData({
        nome: "",
        fazenda_id: selectedFarm || (fazendas.length > 0 ? fazendas[0].id : ""),
        area_hectares: "",
        capacidade_animais: "",
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do lote e obrigatorio",
        variant: "destructive",
      })
      return
    }

    if (!formData.fazenda_id) {
      toast({
        title: "Erro",
        description: "Selecione uma fazenda",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()

      const loteData = {
        nome: formData.nome.trim(),
        fazenda_id: formData.fazenda_id,
        area_hectares: formData.area_hectares ? parseFloat(formData.area_hectares) : null,
        capacidade_animais: formData.capacidade_animais ? parseInt(formData.capacidade_animais) : null,
      }

      if (selectedLote) {
        const { error } = await supabase
          .from("lotes")
          .update(loteData)
          .eq("id", selectedLote.id)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Lote atualizado com sucesso",
        })
      } else {
        const { error } = await supabase.from("lotes").insert(loteData)

        if (error) throw error

        toast({
          title: "Sucesso",
          description: "Lote criado com sucesso",
        })
      }

      setDialogOpen(false)
      loadLotes()
    } catch (err) {
      console.error("[v0] Error saving lote:", err)
      toast({
        title: "Erro",
        description: "Erro ao salvar lote",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedLote) return

    setSaving(true)
    try {
      const supabase = createClient()

      // Check if there are animals in this lote
      const { count } = await supabase
        .from("gado")
        .select("*", { count: "exact", head: true })
        .eq("lote_id", selectedLote.id)
        .eq("ativo", true)

      if (count && count > 0) {
        toast({
          title: "Erro",
          description: `Nao e possivel excluir o lote pois existem ${count} animais vinculados`,
          variant: "destructive",
        })
        setDeleteDialogOpen(false)
        setSaving(false)
        return
      }

      const { error } = await supabase.from("lotes").delete().eq("id", selectedLote.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Lote excluido com sucesso",
      })

      setDeleteDialogOpen(false)
      setSelectedLote(null)
      loadLotes()
    } catch (err) {
      console.error("[v0] Error deleting lote:", err)
      toast({
        title: "Erro",
        description: "Erro ao excluir lote",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const totalAnimals = lotes.reduce((sum, lote) => sum + (lote.animal_count || 0), 0)
  const totalCapacity = lotes.reduce((sum, lote) => sum + (lote.capacidade_animais || 0), 0)

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div>
        <Link href="/gado">
          <Button variant="ghost" className="mb-4 bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Rebanho
          </Button>
        </Link>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciamento de Lotes</h1>
            <p className="text-muted-foreground">
              Organize seu rebanho em lotes para melhor controle e manejo
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Lote
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Lotes</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lotes.length}</div>
            <p className="text-xs text-muted-foreground">
              {selectedFarm ? "Na fazenda selecionada" : "Em todas as fazendas"}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Animais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnimals}</div>
            <p className="text-xs text-muted-foreground">Animais nos lotes</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacity || "-"}</div>
            <p className="text-xs text-muted-foreground">Capacidade definida</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ocupacao</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCapacity > 0 ? `${Math.round((totalAnimals / totalCapacity) * 100)}%` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">Taxa de ocupacao</p>
          </CardContent>
        </Card>
      </div>

      {/* Lotes Table */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Lotes Cadastrados</CardTitle>
          <CardDescription>
            Gerencie os lotes de animais da sua propriedade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : lotes.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lote cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie lotes para organizar melhor seu rebanho
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Lote
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Lote</TableHead>
                    <TableHead>Fazenda</TableHead>
                    <TableHead>Animais</TableHead>
                    <TableHead>Capacidade</TableHead>
                    <TableHead>Area (ha)</TableHead>
                    <TableHead>Ocupacao</TableHead>
                    <TableHead>Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lotes.map((lote) => {
                    const ocupacao = lote.capacidade_animais
                      ? Math.round(((lote.animal_count || 0) / lote.capacidade_animais) * 100)
                      : null

                    return (
                      <TableRow key={lote.id}>
                        <TableCell className="font-medium">{lote.nome}</TableCell>
                        <TableCell>{lote.fazendas?.nome || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lote.animal_count || 0}</Badge>
                        </TableCell>
                        <TableCell>{lote.capacidade_animais || "-"}</TableCell>
                        <TableCell>{lote.area_hectares || "-"}</TableCell>
                        <TableCell>
                          {ocupacao !== null ? (
                            <Badge
                              variant={
                                ocupacao > 100
                                  ? "destructive"
                                  : ocupacao > 80
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {ocupacao}%
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(lote)}
                              className="bg-transparent"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLote(lote)
                                setDeleteDialogOpen(true)
                              }}
                              className="bg-transparent text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedLote ? "Editar Lote" : "Novo Lote"}</DialogTitle>
            <DialogDescription>
              {selectedLote
                ? "Atualize as informacoes do lote"
                : "Preencha as informacoes para criar um novo lote"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Lote *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Lote 1, Bezerros, Vacas em lactacao"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fazenda">Fazenda *</Label>
              <select
                id="fazenda"
                value={formData.fazenda_id}
                onChange={(e) => setFormData({ ...formData, fazenda_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="">Selecione uma fazenda</option>
                {fazendas.map((fazenda) => (
                  <option key={fazenda.id} value={fazenda.id}>
                    {fazenda.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacidade">Capacidade (animais)</Label>
                <Input
                  id="capacidade"
                  type="number"
                  value={formData.capacidade_animais}
                  onChange={(e) => setFormData({ ...formData, capacidade_animais: e.target.value })}
                  placeholder="Ex: 50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (hectares)</Label>
                <Input
                  id="area"
                  type="number"
                  step="0.01"
                  value={formData.area_hectares}
                  onChange={(e) => setFormData({ ...formData, area_hectares: e.target.value })}
                  placeholder="Ex: 10.5"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : selectedLote ? "Atualizar" : "Criar Lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lote &quot;{selectedLote?.nome}&quot;? Esta acao nao pode ser desfeita.
              {selectedLote?.animal_count && selectedLote.animal_count > 0 && (
                <span className="block mt-2 text-destructive">
                  Atencao: Este lote possui {selectedLote.animal_count} animais vinculados.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
