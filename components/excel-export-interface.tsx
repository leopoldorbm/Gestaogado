"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Download, FileSpreadsheet, Filter, Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Farm {
  id: number
  nome: string
}

interface ExportOptions {
  fazenda_id?: number
  incluir_pesagens: boolean
  incluir_genealogia: boolean
  incluir_financeiro: boolean
  apenas_ativos: boolean
}

export function ExcelExportInterface() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    incluir_pesagens: true,
    incluir_genealogia: true,
    incluir_financeiro: false,
    apenas_ativos: true,
  })
  const [isExporting, setIsExporting] = useState(false)
  const [animalCount, setAnimalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadFarms()
    updateAnimalCount()
  }, [exportOptions])

  const loadFarms = async () => {
    try {
      const { data, error } = await supabase.from("fazendas").select("id, nome").order("nome")

      if (error) throw error
      setFarms(data || [])
    } catch (error) {
      console.error("Erro ao carregar fazendas:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateAnimalCount = async () => {
    try {
      let query = supabase.from("gado").select("id", { count: "exact" })

      if (exportOptions.fazenda_id) {
        query = query.eq("fazenda_id", exportOptions.fazenda_id)
      }

      if (exportOptions.apenas_ativos) {
        query = query.is("data_saida", null)
      }

      const { count, error } = await query

      if (error) throw error
      setAnimalCount(count || 0)
    } catch (error) {
      console.error("Erro ao contar animais:", error)
      setAnimalCount(0)
    }
  }

  const exportData = async () => {
    if (animalCount === 0) return

    setIsExporting(true)

    try {
      // Buscar dados dos animais
      let query = supabase.from("gado").select(`
          *,
          fazenda:fazendas(nome),
          lote:lotes(nome),
          pai:gado!gado_pai_id_fkey(marca_fogo),
          mae:gado!gado_mae_id_fkey(marca_fogo)
        `)

      if (exportOptions.fazenda_id) {
        query = query.eq("fazenda_id", exportOptions.fazenda_id)
      }

      if (exportOptions.apenas_ativos) {
        query = query.is("data_saida", null)
      }

      const { data: animals, error } = await query

      if (error) throw error

      // Buscar pesagens se solicitado
      let weighingsData: any[] = []
      if (exportOptions.incluir_pesagens && animals) {
        const animalIds = animals.map((a) => a.id)
        const { data: weighings } = await supabase
          .from("pesagens")
          .select("*")
          .in("gado_id", animalIds)
          .order("data_pesagem", { ascending: false })

        weighingsData = weighings || []
      }

      // Gerar arquivo Excel
      await generateExcelFile(animals || [], weighingsData)
    } catch (error) {
      console.error("Erro durante exportação:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const generateExcelFile = async (animals: any[], weighings: any[]) => {
    try {
      const XLSX = await import("xlsx")

      const wb = XLSX.utils.book_new()

      // Planilha principal - Dados dos animais
      const animalHeaders = [
        "Marca a Fogo",
        "Brinco Eletrônico",
        "Sexo",
        "Origem",
        "Status Reprodutivo",
        "Data Nascimento",
        "Data Entrada",
        "Data Saída",
        "Fazenda",
        "Lote",
        ...(exportOptions.incluir_genealogia ? ["Pai", "Mãe"] : []),
        ...(exportOptions.incluir_financeiro ? ["Valor Compra", "Valor Venda"] : []),
        "Peso Atual",
        "Última Pesagem",
        "Observações",
      ]

      const animalRows = animals.map((animal) => {
        const lastWeighing = weighings
          .filter((w) => w.gado_id === animal.id)
          .sort((a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime())[0]

        const row = [
          animal.marca_fogo || "",
          animal.brinco_eletronico || "",
          animal.sexo || "",
          animal.origem || "",
          animal.status_reprodutivo || "",
          animal.data_nascimento ? new Date(animal.data_nascimento).toLocaleDateString("pt-BR") : "",
          animal.data_entrada ? new Date(animal.data_entrada).toLocaleDateString("pt-BR") : "",
          animal.data_saida ? new Date(animal.data_saida).toLocaleDateString("pt-BR") : "",
          animal.fazenda?.nome || "",
          animal.lote?.nome || "",
          ...(exportOptions.incluir_genealogia ? [animal.pai?.marca_fogo || "", animal.mae?.marca_fogo || ""] : []),
          ...(exportOptions.incluir_financeiro ? [animal.valor_compra || "", animal.valor_venda || ""] : []),
          lastWeighing?.peso || "",
          lastWeighing?.data_pesagem ? new Date(lastWeighing.data_pesagem).toLocaleDateString("pt-BR") : "",
          animal.observacoes || "",
        ]

        return row
      })

      const animalWs = XLSX.utils.aoa_to_sheet([animalHeaders, ...animalRows])
      XLSX.utils.book_append_sheet(wb, animalWs, "Animais")

      // Planilha de pesagens (se solicitado)
      if (exportOptions.incluir_pesagens && weighings.length > 0) {
        const weighingHeaders = ["Marca a Fogo", "Data Pesagem", "Peso (kg)", "Observações"]

        const weighingRows = weighings.map((weighing) => {
          const animal = animals.find((a) => a.id === weighing.gado_id)
          return [
            animal?.marca_fogo || "",
            new Date(weighing.data_pesagem).toLocaleDateString("pt-BR"),
            weighing.peso,
            weighing.observacoes || "",
          ]
        })

        const weighingWs = XLSX.utils.aoa_to_sheet([weighingHeaders, ...weighingRows])
        XLSX.utils.book_append_sheet(wb, weighingWs, "Histórico de Pesagens")
      }

      // Gerar nome do arquivo
      const farmName = exportOptions.fazenda_id
        ? farms.find((f) => f.id === exportOptions.fazenda_id)?.nome || "Fazenda"
        : "Todas_Fazendas"

      const fileName = `Dados_Gado_${farmName}_${new Date().toISOString().split("T")[0]}.xlsx`

      // Download do arquivo
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error("Erro ao gerar arquivo Excel:", error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando opções de exportação...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filtros de exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Exportação
          </CardTitle>
          <CardDescription>Configure quais dados deseja exportar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seleção de fazenda */}
          <div className="space-y-2">
            <Label>Fazenda</Label>
            <Select
              value={exportOptions.fazenda_id?.toString() || "all"}
              onValueChange={(value) =>
                setExportOptions((prev) => ({
                  ...prev,
                  fazenda_id: value === "all" ? undefined : Number.parseInt(value),
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar fazenda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Fazendas</SelectItem>
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id.toString()}>
                    {farm.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Opções de dados */}
          <div className="space-y-3">
            <Label>Dados a Incluir</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluir_pesagens"
                checked={exportOptions.incluir_pesagens}
                onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, incluir_pesagens: !!checked }))}
              />
              <Label htmlFor="incluir_pesagens">Histórico de Pesagens</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluir_genealogia"
                checked={exportOptions.incluir_genealogia}
                onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, incluir_genealogia: !!checked }))}
              />
              <Label htmlFor="incluir_genealogia">Dados de Genealogia (Pai/Mãe)</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="incluir_financeiro"
                checked={exportOptions.incluir_financeiro}
                onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, incluir_financeiro: !!checked }))}
              />
              <Label htmlFor="incluir_financeiro">Dados Financeiros</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="apenas_ativos"
                checked={exportOptions.apenas_ativos}
                onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, apenas_ativos: !!checked }))}
              />
              <Label htmlFor="apenas_ativos">Apenas Animais Ativos (não vendidos)</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview da exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Preview da Exportação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-3 py-1">
                {animalCount} animais
              </Badge>
              {exportOptions.fazenda_id && (
                <Badge variant="outline">{farms.find((f) => f.id === exportOptions.fazenda_id)?.nome}</Badge>
              )}
              {exportOptions.apenas_ativos && <Badge variant="outline">Apenas Ativos</Badge>}
            </div>

            <div className="text-sm text-muted-foreground">
              <p>Planilhas que serão geradas:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Dados dos Animais (informações principais)</li>
                {exportOptions.incluir_pesagens && <li>Histórico de Pesagens (todas as pesagens registradas)</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão de exportação */}
      <Card>
        <CardHeader>
          <CardTitle>Gerar Exportação</CardTitle>
          <CardDescription>Baixe um arquivo Excel com todos os dados selecionados</CardDescription>
        </CardHeader>
        <CardContent>
          {animalCount > 0 ? (
            <Button onClick={exportData} disabled={isExporting} className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Gerando arquivo..." : `Exportar ${animalCount} animais`}
            </Button>
          ) : (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>Nenhum animal encontrado com os filtros selecionados.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
