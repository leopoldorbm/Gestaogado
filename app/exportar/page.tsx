import { ExcelExportInterface } from "@/components/excel-export-interface"

export default function ExportPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Exportar Dados</h1>
          <p className="text-muted-foreground">Exporte dados completos dos animais em planilhas Excel</p>
        </div>

        <ExcelExportInterface />
      </div>
    </div>
  )
}
