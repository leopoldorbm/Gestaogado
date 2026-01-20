import { XR5000QueryInterface } from "@/components/xr5000-query-interface"

export default function ConsultaBalancaPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consulta a Balanca XR5000</h1>
          <p className="text-muted-foreground">
            Referencia de comandos SCP e teste de conexao HTTP com a balanca
          </p>
        </div>
      </div>
      <XR5000QueryInterface />
    </div>
  )
}
