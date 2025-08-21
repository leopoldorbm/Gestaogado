"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface CattleData {
  id: string
  marca_fogo: string
  pesagens: { peso: number; data_pesagem: string }[]
}

interface AddWeighingModalProps {
  animal: CattleData
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddWeighingModal({ animal, open, onClose, onSuccess }: AddWeighingModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    peso: "",
    data_pesagem: new Date().toISOString().split("T")[0],
    observacoes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.peso || !formData.data_pesagem) {
        toast({
          title: "Erro de validação",
          description: "Peso e data são obrigatórios",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("pesagens").insert({
        gado_id: animal.id,
        peso: Number.parseFloat(formData.peso),
        data_pesagem: formData.data_pesagem,
        observacoes: formData.observacoes || null,
      })

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso!",
        description: "Pesagem registrada com sucesso",
      })

      onSuccess()
    } catch (error: any) {
      console.error("Erro ao registrar pesagem:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao registrar pesagem",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getLastWeight = () => {
    if (animal.pesagens.length === 0) return null

    const sorted = animal.pesagens.sort(
      (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
    )

    return sorted[0]
  }

  const lastWeight = getLastWeight()

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pesagem</DialogTitle>
          <DialogDescription>
            Animal: {animal.marca_fogo}
            {lastWeight && (
              <div className="mt-2 text-sm">
                Último peso: {lastWeight.peso} kg em {new Date(lastWeight.data_pesagem).toLocaleDateString("pt-BR")}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="peso">Peso (kg) *</Label>
            <Input
              id="peso"
              type="number"
              step="0.1"
              value={formData.peso}
              onChange={(e) => setFormData((prev) => ({ ...prev, peso: e.target.value }))}
              placeholder="Ex: 450.5"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_pesagem">Data da Pesagem *</Label>
            <Input
              id="data_pesagem"
              type="date"
              value={formData.data_pesagem}
              onChange={(e) => setFormData((prev) => ({ ...prev, data_pesagem: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações sobre a pesagem..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Pesagem
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
