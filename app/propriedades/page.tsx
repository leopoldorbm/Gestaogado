"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge"
import { Plus, Pencil, Trash2, Building2, MapPin, Calendar, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useFarm } from "@/contexts/farm-context"

interface Fazenda {
  id: string
  nome: string
  localizacao: string | null
  area_total: number | null
  created_at: string
  user_id: string
}

export default function PropriedadesPage() {
  const { setFazendas, setSelectedFarm } = useFarm()
  const [propriedades, setPropriedades] = useState<Fazenda[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingFazenda, setEditingFazenda] = useState<Fazenda | null>(null)
  const [fazendaToDelete, setFazendaToDelete] = useState<Fazenda | null>(null)
  
  const [formData, setFormData] = useState({
    nome: "",
    localizacao: "",
    area_total: "",
  })

  const supabase = createClient()

  useEffect(() => {
    loadPropriedades()
  }, [])

  const loadPropriedades = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("fazendas")
        .select("*")
        .eq("user_id", user.id)
        .order("nome")

      if (error) throw error
      setPropriedades(data || [])
      setFazendas(data || [])
    } catch (error) {
      console.error("Erro ao carregar propriedades:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (fazenda?: Fazenda) => {
    if (fazenda) {
      setEditingFazenda(fazenda)
      setFormData({
        nome: fazenda.nome,
        localizacao: fazenda.localizacao || "",
        area_total: fazenda.area_total?.toString() || "",
      })
    } else {
      setEditingFazenda(null)
      setFormData({ nome: "", localizacao: "", area_total: "" })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nome.trim()) return

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const fazendaData = {
        nome: formData.nome.trim(),
        localizacao: formData.localizacao.trim() || null,
        area_total: formData.area_total ? parseFloat(formData.area_total) : null,
        user_id: user.id,
      }

      if (editingFazenda) {
        const { error } = await supabase
          .from("fazendas")
          .update(fazendaData)
          .eq("id", editingFazenda.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("fazendas")
          .insert(fazendaData)

        if (error) throw error
      }

      await loadPropriedades()
      setIsDialogOpen(false)
    } catch (error) {
      console.error("Erro ao salvar propriedade:", error)
      alert("Erro ao salvar propriedade. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!fazendaToDelete) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("fazendas")
        .delete()
        .eq("id", fazendaToDelete.id)

      if (error) throw error

      await loadPropriedades()
      setSelectedFarm(null)
      setIsDeleteDialogOpen(false)
      setFazendaToDelete(null)
    } catch (error) {
      console.error("Erro ao excluir propriedade:", error)
      alert("Erro ao excluir propriedade. Verifique se nao ha dados vinculados.")
    } finally {
      setSaving(false)
    }
  }

  const openDeleteDialog = (fazenda: Fazenda) => {
    setFazendaToDelete(fazenda)
    setIsDeleteDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex-1 w-full flex flex-col gap-6 p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Propriedades</h1>
          <p className="text-muted-foreground">
            Cadastre, edite ou remova suas fazendas e propriedades rurais
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Propriedade
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingFazenda ? "Editar Propriedade" : "Nova Propriedade"}
              </DialogTitle>
              <DialogDescription>
                {editingFazenda
                  ? "Atualize os dados da propriedade"
                  : "Preencha os dados para cadastrar uma nova propriedade"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Propriedade *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Fazenda Santa Maria"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localizacao">Localizacao</Label>
                <Textarea
                  id="localizacao"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  placeholder="Ex: Rodovia BR-101, Km 45 - Municipio/UF"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area_total">Area Total (hectares)</Label>
                <Input
                  id="area_total"
                  type="number"
                  step="0.01"
                  value={formData.area_total}
                  onChange={(e) => setFormData({ ...formData, area_total: e.target.value })}
                  placeholder="Ex: 500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-transparent">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || !formData.nome.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingFazenda ? "Salvar Alteracoes" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {propriedades.length === 0 ? (
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhuma propriedade cadastrada</h3>
            <p className="text-muted-foreground text-center mb-6">
              Cadastre sua primeira propriedade para comecar a gerenciar seu rebanho
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Propriedade
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {propriedades.map((fazenda) => (
            <Card key={fazenda.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{fazenda.nome}</CardTitle>
                      {fazenda.area_total && (
                        <Badge variant="secondary" className="mt-1">
                          {fazenda.area_total.toLocaleString("pt-BR")} ha
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(fazenda)}
                      className="h-8 w-8 bg-transparent"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(fazenda)}
                      className="h-8 w-8 text-destructive hover:text-destructive bg-transparent"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {fazenda.localizacao && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{fazenda.localizacao}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Cadastrada em {new Date(fazenda.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Propriedade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a propriedade "{fazendaToDelete?.nome}"?
              Esta acao nao pode ser desfeita e todos os dados vinculados serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
