import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ExcelImportInterface } from "@/components/excel-import-interface"

export default function ImportarPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importar Dados</h1>
          <p className="text-muted-foreground">
            Importe dados de planilhas Excel para cadastro ou atualização de animais
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Importação de Planilha Excel</CardTitle>
            <CardDescription>
              Faça upload de uma planilha Excel (.xlsx, .xls) para importar dados de animais ou atualizações de peso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Carregando...</div>}>
              <ExcelImportInterface />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
