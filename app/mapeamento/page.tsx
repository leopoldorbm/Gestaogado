import PastureMapClient from "./pasture-map-client"

export default function MapeamentoPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Mapeamento de Pastos</h1>
        <p className="text-gray-600 mt-2">
          Identifique e gerencie os pastos da fazenda usando ferramentas de mapeamento
        </p>
      </div>

      <PastureMapClient />
    </div>
  )
}
