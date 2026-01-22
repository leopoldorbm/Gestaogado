import PastureMapClient from "./pasture-map-client"

export default function MapeamentoPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Mapeamento de Pastos</h1>
        <p className="text-muted-foreground">
          Gerencie os pastos da propriedade selecionada, registre ocupacao de rebanho e aplicacao de defensivos
        </p>
      </div>

      <PastureMapClient />
    </div>
  )
}
