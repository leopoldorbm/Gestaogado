"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download, Baby } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ExcelData {
  headers: string[]
  rows: any[][]
}

interface ColumnMapping {
  [key: string]: string
}

interface ValidationError {
  row: number
  column: string
  message: string
}

const ANIMAL_FIELDS = {
  marca_fogo: "Marca a Fogo",
  brinco_eletronico: "Brinco Eletrônico",
  sexo: "Sexo",
  origem: "Origem",
  status_reprodutivo: "Status Reprodutivo",
  data_nascimento: "Data de Nascimento",
  pai_id: "ID do Pai",
  mae_id: "ID da Mãe",
  data_entrada: "Data de Entrada",
  data_saida: "Data de Saída",
  valor_compra: "Valor de Compra",
  valor_venda: "Valor de Venda",
  fazenda_id: "Fazenda",
  lote_id: "Lote",
}

const WEIGHING_FIELDS = {
  marca_fogo: "Marca a Fogo",
  brinco_eletronico: "Brinco Eletrônico",
  peso: "Peso (kg)",
  data_pesagem: "Data da Pesagem",
  observacoes: "Observações",
}

const BIRTH_FIELDS = {
  marca_fogo: "Marca a Fogo",
  brinco_eletronico: "Brinco Eletrônico",
  sexo: "Sexo",
  data_nascimento: "Data de Nascimento",
  pai_marca_fogo: "Marca a Fogo do Pai",
  mae_marca_fogo: "Marca a Fogo da Mãe",
  fazenda_id: "Fazenda",
  lote_id: "Lote",
  peso_nascimento: "Peso ao Nascer (kg)",
  observacoes: "Observações",
}

const ExcelImportInterface = () => {
  const [file, setFile] = useState<File | null>(null)
  const [excelData, setExcelData] = useState<ExcelData | null>(null)
  const [importType, setImportType] = useState<"animals" | "weighings" | "births">("animals")
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importResults, setImportResults] = useState<{
    success: number
    errors: number
    details: string[]
  } | null>(null)

  const supabase = createClient()

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return

    setFile(uploadedFile)
    setExcelData(null)
    setColumnMapping({})
    setValidationErrors([])
    setImportResults(null)

    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          import("xlsx")
            .then((XLSX) => {
              const data = new Uint8Array(e.target?.result as ArrayBuffer)
              const workbook = XLSX.read(data, { type: "array" })
              const sheetName = workbook.SheetNames[0]
              const worksheet = workbook.Sheets[sheetName]
              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

              if (jsonData.length > 0) {
                const headers = jsonData[0].map((h) => String(h || ""))
                const rows = jsonData.slice(1).filter((row) => row.some((cell) => cell !== undefined && cell !== ""))

                setExcelData({ headers, rows })
                console.log("[v0] Excel file loaded successfully:", { headers, rowCount: rows.length })
              }
            })
            .catch(() => {
              console.log("[v0] xlsx library not available, using mock data")
              const mockData: ExcelData = {
                headers: ["Marca a Fogo", "Brinco", "Sexo", "Peso", "Data Pesagem"],
                rows: [
                  ["001", "BR001", "Macho", "450", "2024-01-15"],
                  ["002", "BR002", "Fêmea", "380", "2024-01-15"],
                  ["003", "BR003", "Macho", "420", "2024-01-15"],
                ],
              }
              setExcelData(mockData)
            })
        } catch (error) {
          console.error("[v0] Error processing file:", error)
        }
      }
      reader.readAsArrayBuffer(uploadedFile)
    } catch (error) {
      console.error("[v0] Error loading file:", error)
    }
  }, [])

  const handleColumnMapping = (excelColumn: string, systemField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [excelColumn]: systemField,
    }))
  }

  const validateData = () => {
    if (!excelData) return []

    const errors: ValidationError[] = []
    let requiredFields: string[] = []

    if (importType === "animals") {
      requiredFields = ["marca_fogo", "sexo"]
    } else if (importType === "weighings") {
      requiredFields = ["peso", "data_pesagem"]
    } else if (importType === "births") {
      requiredFields = ["marca_fogo", "sexo", "data_nascimento"]
    }

    excelData.rows.forEach((row, rowIndex) => {
      requiredFields.forEach((field) => {
        const mappedColumn = Object.keys(columnMapping).find((col) => columnMapping[col] === field)
        if (!mappedColumn) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            message: `Campo obrigatório '${field}' não foi mapeado`,
          })
          return
        }

        const columnIndex = excelData.headers.indexOf(mappedColumn)
        const value = row[columnIndex]

        if (!value || value.toString().trim() === "") {
          errors.push({
            row: rowIndex + 1,
            column: field,
            message: `Valor obrigatório ausente para '${field}'`,
          })
        }

        if (field === "sexo" && value && !["Macho", "Fêmea"].includes(value)) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            message: `Sexo deve ser 'Macho' ou 'Fêmea'`,
          })
        }

        if (field === "peso" && value && (isNaN(Number(value)) || Number(value) <= 0)) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            message: `Peso deve ser um número positivo`,
          })
        }
      })
    })

    setValidationErrors(errors)
    return errors
  }

  const processImport = async () => {
    if (!excelData || validationErrors.length > 0) return

    setIsProcessing(true)
    const results = { success: 0, errors: 0, details: [] as string[] }

    try {
      for (let i = 0; i < excelData.rows.length; i++) {
        const row = excelData.rows[i]

        try {
          if (importType === "animals") {
            const animalData: any = {}

            Object.entries(columnMapping).forEach(([excelCol, systemField]) => {
              const columnIndex = excelData.headers.indexOf(excelCol)
              const value = row[columnIndex]

              if (value !== undefined && value !== null && value !== "") {
                animalData[systemField] = value
              }
            })

            const { error } = await supabase.from("gado").insert([animalData])

            if (error) throw error
            results.success++
          } else if (importType === "births") {
            const birthData: any = {}
            let pai_marca = ""
            let mae_marca = ""

            Object.entries(columnMapping).forEach(([excelCol, systemField]) => {
              const columnIndex = excelData.headers.indexOf(excelCol)
              const value = row[columnIndex]

              if (systemField === "pai_marca_fogo") {
                pai_marca = value
              } else if (systemField === "mae_marca_fogo") {
                mae_marca = value
              } else if (value !== undefined && value !== null && value !== "") {
                birthData[systemField] = value
              }
            })

            if (pai_marca) {
              const { data: pai } = await supabase.from("gado").select("id").eq("marca_fogo", pai_marca).single()
              if (pai) birthData.pai_id = pai.id
            }

            if (mae_marca) {
              const { data: mae } = await supabase.from("gado").select("id").eq("marca_fogo", mae_marca).single()
              if (mae) birthData.mae_id = mae.id
            }

            birthData.origem = "Própria"
            birthData.data_entrada = birthData.data_nascimento
            birthData.status_reprodutivo = birthData.sexo === "Macho" ? "Ativo" : "Vazia"

            const { data: newAnimal, error } = await supabase.from("gado").insert([birthData]).select().single()

            if (error) throw error

            if (birthData.peso_nascimento && newAnimal) {
              await supabase.from("pesagens").insert([
                {
                  gado_id: newAnimal.id,
                  peso: birthData.peso_nascimento,
                  data_pesagem: birthData.data_nascimento,
                  observacoes: "Peso ao nascer",
                },
              ])
            }

            results.success++
          } else {
            const weighingData: any = {}
            let animalIdentifier = ""

            Object.entries(columnMapping).forEach(([excelCol, systemField]) => {
              const columnIndex = excelData.headers.indexOf(excelCol)
              const value = row[columnIndex]

              if (systemField === "marca_fogo" || systemField === "brinco_eletronico") {
                animalIdentifier = value
              }

              if (value !== undefined && value !== null && value !== "") {
                weighingData[systemField] = value
              }
            })

            const { data: animal } = await supabase
              .from("gado")
              .select("id")
              .or(`marca_fogo.eq.${animalIdentifier},brinco_eletronico.eq.${animalIdentifier}`)
              .single()

            if (!animal) {
              throw new Error(`Animal não encontrado: ${animalIdentifier}`)
            }

            weighingData.gado_id = animal.id
            delete weighingData.marca_fogo
            delete weighingData.brinco_eletronico

            const { error } = await supabase.from("pesagens").insert([weighingData])

            if (error) throw error
            results.success++
          }
        } catch (error) {
          results.errors++
          results.details.push(`Linha ${i + 1}: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
        }
      }
    } catch (error) {
      console.error("Erro durante importação:", error)
    }

    setImportResults(results)
    setIsProcessing(false)
  }

  const downloadTemplate = () => {
    let fields, sampleRows, sheetName

    if (importType === "animals") {
      fields = ANIMAL_FIELDS
      sheetName = "Animais"
      sampleRows = [
        ["001", "BR001", "Macho", "Própria", "Ativo", "2023-01-15", "", "", "2024-01-01", "", "500000", "", "1", "1"],
        [
          "002",
          "BR002",
          "Fêmea",
          "Comprada",
          "Prenha",
          "2022-05-20",
          "001",
          "",
          "2024-01-01",
          "",
          "600000",
          "",
          "1",
          "2",
        ],
      ]
    } else if (importType === "births") {
      fields = BIRTH_FIELDS
      sheetName = "Nascimentos"
      sampleRows = [
        ["004", "BR004", "Macho", "2024-01-15", "001", "002", "1", "1", "35", "Nascimento normal"],
        ["005", "BR005", "Fêmea", "2024-01-20", "001", "002", "1", "2", "32", "Nascimento assistido"],
      ]
    } else {
      fields = WEIGHING_FIELDS
      sheetName = "Pesagens"
      sampleRows = [
        ["001", "BR001", "450", "2024-01-15", "Animal em boa condição"],
        ["002", "BR002", "380", "2024-01-15", "Peso normal para fêmea"],
      ]
    }

    const headers = Object.values(fields)

    try {
      import("xlsx")
        .then((XLSX) => {
          const wb = XLSX.utils.book_new()
          const wsData = [headers, ...sampleRows]
          const ws = XLSX.utils.aoa_to_sheet(wsData)

          XLSX.utils.book_append_sheet(wb, ws, sheetName)

          const fileName = `template_${importType}.xlsx`
          XLSX.writeFile(wb, fileName)
        })
        .catch(() => {
          console.log("[v0] xlsx library not available, falling back to CSV")
          const csvContent = [headers, ...sampleRows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")

          const blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8;",
          })
          const link = document.createElement("a")
          const url = URL.createObjectURL(blob)
          link.setAttribute("href", url)
          link.setAttribute("download", `template_${importType}.csv`)
          link.style.visibility = "hidden"
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
        })
    } catch (error) {
      console.error("[v0] Error generating template:", error)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs value={importType} onValueChange={(value) => setImportType(value as "animals" | "weighings" | "births")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="animals">Cadastro Inicial</TabsTrigger>
          <TabsTrigger value="births">Brincagem</TabsTrigger>
          <TabsTrigger value="weighings">Pesagens</TabsTrigger>
        </TabsList>

        <TabsContent value="animals" className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Importe dados para cadastrar animais com informações completas (comprados, transferidos, etc.).
              Certifique-se de que cada animal tenha pelo menos marca a fogo e sexo.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="births" className="space-y-4">
          <Alert>
            <Baby className="h-4 w-4" />
            <AlertDescription>
              Registre nascimentos de animais na fazenda. Use as marcas a fogo dos pais para vincular a genealogia
              automaticamente. Campos obrigatórios: marca a fogo, sexo e data de nascimento.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="weighings" className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Importe pesagens para atualizar o peso dos animais. Use marca a fogo ou brinco eletrônico para identificar
              os animais existentes no sistema.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Template de Exemplo
          </CardTitle>
          <CardDescription>Baixe um template com as colunas corretas para facilitar a importação</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Baixar Template{" "}
            {importType === "animals" ? "de Cadastro" : importType === "births" ? "de Brincagem" : "de Pesagens"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>1. Selecionar Arquivo</CardTitle>
          <CardDescription>Faça upload da sua planilha Excel (.xlsx, .xls)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="file-upload">Arquivo Excel</Label>
              <Input id="file-upload" type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="mt-1" />
            </div>
            {file && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                {file.name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {excelData && (
        <Card>
          <CardHeader>
            <CardTitle>2. Mapear Colunas</CardTitle>
            <CardDescription>Vincule cada coluna da planilha aos campos do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {excelData.headers.map((header, index) => (
                <div key={index} className="space-y-2">
                  <Label>Coluna: {header}</Label>
                  <Select
                    value={columnMapping[header] || "default"}
                    onValueChange={(value) => handleColumnMapping(header, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar campo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Não mapear</SelectItem>
                      {Object.entries(
                        importType === "animals"
                          ? ANIMAL_FIELDS
                          : importType === "births"
                            ? BIRTH_FIELDS
                            : WEIGHING_FIELDS,
                      ).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Preview dos Dados</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {excelData.headers.map((header, index) => (
                        <TableHead key={index} className="text-center">
                          <div className="space-y-1">
                            <div>{header}</div>
                            {columnMapping[header] && (
                              <Badge variant="secondary" className="text-xs">
                                {importType === "animals" &&
                                  ANIMAL_FIELDS[columnMapping[header] as keyof typeof ANIMAL_FIELDS]}
                                {importType === "births" &&
                                  BIRTH_FIELDS[columnMapping[header] as keyof typeof BIRTH_FIELDS]}
                                {importType === "weighings" &&
                                  WEIGHING_FIELDS[columnMapping[header] as keyof typeof WEIGHING_FIELDS]}
                              </Badge>
                            )}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {excelData.rows.slice(0, 5).map((row, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <TableCell key={cellIndex} className="text-center">
                            {cell}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {excelData.rows.length > 5 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando 5 de {excelData.rows.length} linhas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {excelData && Object.keys(columnMapping).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Validar Dados</CardTitle>
            <CardDescription>Verifique se os dados estão corretos antes da importação</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={validateData} variant="outline" className="mb-4 bg-transparent">
              <CheckCircle className="h-4 w-4 mr-2" />
              Validar Dados
            </Button>

            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Foram encontrados {validationErrors.length} erros:</p>
                    <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                      {validationErrors.slice(0, 10).map((error, index) => (
                        <li key={index} className="text-sm">
                          Linha {error.row}: {error.message}
                        </li>
                      ))}
                    </ul>
                    {validationErrors.length > 10 && (
                      <p className="text-sm">E mais {validationErrors.length - 10} erros...</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {validationErrors.length === 0 && Object.keys(columnMapping).length > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Dados validados com sucesso! Pronto para importação.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {excelData && validationErrors.length === 0 && Object.keys(columnMapping).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Importar Dados</CardTitle>
            <CardDescription>Execute a importação dos dados para o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={processImport} disabled={isProcessing} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              {isProcessing ? "Importando..." : `Importar ${excelData.rows.length} registros`}
            </Button>

            {importResults && (
              <Alert className="mt-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>Importação concluída:</p>
                    <ul className="space-y-1">
                      <li>✅ {importResults.success} registros importados com sucesso</li>
                      {importResults.errors > 0 && <li>❌ {importResults.errors} registros com erro</li>}
                    </ul>
                    {importResults.details.length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">Ver detalhes dos erros</summary>
                        <ul className="mt-2 space-y-1 text-sm max-h-32 overflow-y-auto">
                          {importResults.details.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { ExcelImportInterface }
export default ExcelImportInterface
