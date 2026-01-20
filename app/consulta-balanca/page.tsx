import { XR5000QueryInterface } from "@/components/xr5000-query-interface"

export default function ConsultaBalancaPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Consulta à Balança XR5000</h1>
        <p className="text-gray-600 mt-2">
          Interface completa para consultas e operações com a balança XR5000 via Animal Data Transfer REST API
        </p>
      </div>
      <XR5000QueryInterface />
    </div>
  )
}
