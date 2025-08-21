"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Building2 } from "lucide-react"

interface Fazenda {
  id: string
  nome: string
  endereco: string
  proprietario: string
}

export function FarmSelector() {
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [selectedFarm, setSelectedFarm] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newFarm, setNewFarm] = useState({
    nome: "",
    endereco: "",
    proprietario: "",
  })

  const supabase = createClient()

  useEffect(() => {
    loadFazendas()
    // Load selected farm from localStorage
    const saved = localStorage.getItem("selectedFarm")
    if (saved) {
      setSelectedFarm(saved)
    }
  }, [])

  const loadFazendas = async () => {
    try {
      const { data, error } = await supabase.from("fazendas").select("*").order("nome")

      if (error) throw error
      setFazendas(data || [])
    } catch (error) {
      console.error("Erro ao carregar fazendas:", error)
    }
  }

  const handleFarmChange = (farmId: string) => {
    setSelectedFarm(farmId)
    localStorage.setItem("selectedFarm", farmId)
    // Trigger a page refresh to update all components with new farm context
    window.location.reload()
  }

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Usuário não autenticado")

      const { error } = await supabase.from("fazendas").insert({
        nome: newFarm.nome,
        endereco: newFarm.endereco,
        proprietario: newFarm.proprietario,
        user_id: user.user.id,
      })

      if (error) throw error

      setNewFarm({ nome: "", endereco: "", proprietario: "" })
      setIsDialogOpen(false)
      loadFazendas()
    } catch (error) {
      console.error("Erro ao criar fazenda:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const selectedFarmName = fazendas.find((f) => f.id === selectedFarm)?.nome || "Selecione uma fazenda"

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium">Fazenda:</span>
      </div>

      <Select value={selectedFarm} onValueChange={handleFarmChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecione uma fazenda">{selectedFarmName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fazendas.map((fazenda) => (
            <SelectItem key={fazenda.id} value={fazenda.id}>
              {fazenda.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Fazenda
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Fazenda</DialogTitle>
            <DialogDescription>Adicione uma nova fazenda ao seu sistema de gestão.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFarm} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Fazenda</Label>
              <Input
                id="nome"
                required
                value={newFarm.nome}
                onChange={(e) => setNewFarm({ ...newFarm, nome: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="proprietario">Proprietário</Label>
              <Input
                id="proprietario"
                required
                value={newFarm.proprietario}
                onChange={(e) => setNewFarm({ ...newFarm, proprietario: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endereco">Endereço</Label>
              <Textarea
                id="endereco"
                value={newFarm.endereco}
                onChange={(e) => setNewFarm({ ...newFarm, endereco: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Criando..." : "Criar Fazenda"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
