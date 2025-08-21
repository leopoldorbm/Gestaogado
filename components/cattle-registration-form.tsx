"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Save, Loader2, AlertTriangle, Database } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Fazenda {
  id: string
  nome: string
}

interface Lote {
  id: string
  nome: string
  fazenda_id: string
}

interface Animal {
  id: string
  marca_fogo: string
  sexo: "Macho" | "Fêmea"
}

export function CattleRegistrationForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fazendas, setFazendas] = useState<Fazenda[]>([])
  const [lotes, setLotes] = useState<Lote[]>([])
  const [animais, setAnimais] = useState<Animal[]>([])
  const [selectedFazenda, setSelectedFazenda] = useState("")
  const [databaseError, setDatabaseError] = useState<string | null>(null)
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(true)

  useEffect(() => {
    checkDatabaseSetup()
  }, [])

  useEffect(() => {
    if (selectedFazenda) {
      loadLotes(selectedFazenda)
    } else {
      setLotes([])
    }
  }, [selectedFazenda])

  const checkDatabaseSetup = async () => {
    setIsCheckingDatabase(true)
    try {
      const { data, error } = await supabase.from("fazendas").select("id").limit(1)

      if (error && error.message.includes("table") && error.message.includes("does not exist")) {
        setDatabaseError("As tabelas do banco de dados ainda não foram criadas. Execute os scripts SQL primeiro.")
        return
      }

      if (error && error.message.includes("schema cache")) {
        setDatabaseError("As tabelas do banco de dados não foram encontradas. Execute os scripts SQL primeiro.")
        return
      }

      if (error) {
        console.error("Erro ao verificar banco:", error)
        setDatabaseError(`Erro de conexão: ${error.message}`)
        return
      }

      setDatabaseError(null)
      loadFazendas()
      loadAnimais()
    } catch (error: any) {
      console.error("Erro ao verificar configuração do banco:", error)
      setDatabaseError("Erro ao verificar configuração do banco de dados")
    } finally {
      setIsCheckingDatabase(false)
    }
  }

  const loadFazendas = async () => {
    try {
      const { data, error } = await supabase.from("fazendas").select("id, nome").order("nome")

      if (error) {
        console.error("Erro ao carregar fazendas:", error)
        if (error.message.includes("schema cache") || error.message.includes("does not exist")) {
          setDatabaseError("Tabelas não encontradas. Execute os scripts SQL primeiro.")
        }
        return
      }

      setFazendas(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar fazendas:", error)
      setDatabaseError("Erro ao carregar dados das fazendas")
    }
  }

  const loadLotes = async (fazendaId: string) => {
    try {
      const { data, error } = await supabase
        .from("lotes")
        .select("id, nome, fazenda_id")
        .eq("fazenda_id", fazendaId)
        .order("nome")

      if (error) {
        console.error("Erro ao carregar lotes:", error)
        return
      }

      setLotes(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar lotes:", error)
    }
  }

  const loadAnimais = async () => {
    try {
      const { data, error } = await supabase
        .from("gado")
        .select("id, marca_fogo, sexo")
        .eq("ativo", true)
        .order("marca_fogo")

      if (error) {
        console.error("Erro ao carregar animais:", error)
        return
      }

      setAnimais(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar animais:", error)
    }
  }

  const [formData, setFormData] = useState({
    marca_fogo: "",
    brinco_eletronico: "",
    sexo: "" as "Macho" | "Fêmea" | "",
    origem: "",
    status_reproducao: "Não se aplica" as "Prenha" | "Vazia" | "Não se aplica",
    data_nascimento: "",
    pai_id: "",
    mae_id: "",
    fazenda_id: "",
    lote_id: "",
    data_entrada: new Date().toISOString().split("T")[0],
    valor_compra: "",
    peso_inicial: "",
    observacoes_peso: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))

    if (field === "fazenda_id") {
      setSelectedFazenda(value)
      setFormData((prev) => ({
        ...prev,
        lote_id: "",
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.marca_fogo || !formData.sexo || !formData.fazenda_id) {
        toast({
          title: "Erro de validação",
          description: "Preencha todos os campos obrigatórios",
          variant: "destructive",
        })
        return
      }

      const { data: animalData, error: animalError } = await supabase
        .from("gado")
        .insert({
          marca_fogo: formData.marca_fogo,
          brinco_eletronico: formData.brinco_eletronico || null,
          sexo: formData.sexo,
          origem: formData.origem || null,
          status_reproducao: formData.status_reproducao,
          data_nascimento: formData.data_nascimento || null,
          pai_id: formData.pai_id || null,
          mae_id: formData.mae_id || null,
          fazenda_id: formData.fazenda_id,
          lote_id: formData.lote_id || null,
          data_entrada: formData.data_entrada,
          valor_compra: formData.valor_compra ? Number.parseFloat(formData.valor_compra) : null,
        })
        .select()
        .single()

      if (animalError) {
        throw animalError
      }

      if (formData.peso_inicial && animalData) {
        const { error: pesagemError } = await supabase.from("pesagens").insert({
          gado_id: animalData.id,
          peso: Number.parseFloat(formData.peso_inicial),
          data_pesagem: formData.data_entrada,
          observacoes: formData.observacoes_peso || null,
        })

        if (pesagemError) {
          console.error("Erro ao inserir pesagem:", pesagemError)
        }
      }

      toast({
        title: "Sucesso!",
        description: "Animal cadastrado com sucesso",
      })

      router.push("/gado")
    } catch (error: any) {
      console.error("Erro ao cadastrar animal:", error)
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar animal",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const animaisMachos = animais.filter((a) => a.sexo === "Macho")
  const animaisFemeas = animais.filter((a) => a.sexo === "Fêmea")

  if (isCheckingDatabase) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Verificando configuração do banco de dados...</p>
        </div>
      </div>
    )
  }

  if (databaseError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <strong>Erro de Configuração do Banco de Dados</strong>
            <br />
            {databaseError}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configuração Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para usar o sistema de gestão de gado, você precisa primeiro criar as tabelas do banco de dados.
            </p>

            <div className="space-y-2">
              <h4 className="font-medium">Passos para configurar:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>
                  Execute o script: <code className="bg-muted px-1 rounded">scripts/01-create-cattle-tables.sql</code>
                </li>
                <li>
                  Execute o script: <code className="bg-muted px-1 rounded">scripts/02-seed-sample-data.sql</code>
                </li>
                <li>Recarregue esta página</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={checkDatabaseSetup} variant="outline" size="sm">
                <Database className="h-4 w-4 mr-2" />
                Verificar Novamente
              </Button>
              <Button onClick={() => router.push("/")} variant="outline" size="sm">
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="marca_fogo">Marca a Fogo *</Label>
            <Input
              id="marca_fogo"
              value={formData.marca_fogo}
              onChange={(e) => handleInputChange("marca_fogo", e.target.value)}
              placeholder="Ex: SF001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brinco_eletronico">Brinco Eletrônico</Label>
            <Input
              id="brinco_eletronico"
              value={formData.brinco_eletronico}
              onChange={(e) => handleInputChange("brinco_eletronico", e.target.value)}
              placeholder="Código do brinco eletrônico"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sexo">Sexo *</Label>
            <Select value={formData.sexo} onValueChange={(value) => handleInputChange("sexo", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o sexo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Macho">Macho</SelectItem>
                <SelectItem value="Fêmea">Fêmea</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origem">Origem</Label>
            <Input
              id="origem"
              value={formData.origem}
              onChange={(e) => handleInputChange("origem", e.target.value)}
              placeholder="Ex: Fazenda Vizinha, Leilão"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status_reproducao">Status Reprodutivo</Label>
            <Select
              value={formData.status_reproducao}
              onValueChange={(value) => handleInputChange("status_reproducao", value)}
              disabled={formData.sexo === "Macho"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não se aplica">Não se aplica</SelectItem>
                <SelectItem value="Vazia">Vazia</SelectItem>
                <SelectItem value="Prenha">Prenha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Genealogia</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
            <Input
              id="data_nascimento"
              type="date"
              value={formData.data_nascimento}
              onChange={(e) => handleInputChange("data_nascimento", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pai_id">Pai</Label>
            <Select value={formData.pai_id} onValueChange={(value) => handleInputChange("pai_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o pai" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {animaisMachos.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.marca_fogo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mae_id">Mãe</Label>
            <Select value={formData.mae_id} onValueChange={(value) => handleInputChange("mae_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a mãe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {animaisFemeas.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.marca_fogo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Localização</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fazenda_id">Fazenda *</Label>
            <Select value={formData.fazenda_id} onValueChange={(value) => handleInputChange("fazenda_id", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a fazenda" />
              </SelectTrigger>
              <SelectContent>
                {fazendas.map((fazenda) => (
                  <SelectItem key={fazenda.id} value={fazenda.id}>
                    {fazenda.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lote_id">Lote/Pasto</Label>
            <Select
              value={formData.lote_id}
              onValueChange={(value) => handleInputChange("lote_id", value)}
              disabled={!selectedFazenda}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {lotes.map((lote) => (
                  <SelectItem key={lote.id} value={lote.id}>
                    {lote.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Financeiras e Datas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="data_entrada">Data de Entrada *</Label>
            <Input
              id="data_entrada"
              type="date"
              value={formData.data_entrada}
              onChange={(e) => handleInputChange("data_entrada", e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor_compra">Valor de Compra (R$)</Label>
            <Input
              id="valor_compra"
              type="number"
              step="0.01"
              value={formData.valor_compra}
              onChange={(e) => handleInputChange("valor_compra", e.target.value)}
              placeholder="0,00"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Peso Inicial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="peso_inicial">Peso (kg)</Label>
            <Input
              id="peso_inicial"
              type="number"
              step="0.1"
              value={formData.peso_inicial}
              onChange={(e) => handleInputChange("peso_inicial", e.target.value)}
              placeholder="Ex: 450.5"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="observacoes_peso">Observações da Pesagem</Label>
            <Textarea
              id="observacoes_peso"
              value={formData.observacoes_peso}
              onChange={(e) => handleInputChange("observacoes_peso", e.target.value)}
              placeholder="Observações sobre a pesagem inicial"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
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
              Cadastrar Animal
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
