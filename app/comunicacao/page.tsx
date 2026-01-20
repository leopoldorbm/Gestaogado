import { CommunicationInterface } from "@/components/communication-interface"

export default function CommunicationPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comunicacao com Balanca</h1>
          <p className="text-muted-foreground">
            Configure a conexao com a balanca Tru-Test XR5000 via Bluetooth, porta serial ou rede
          </p>
        </div>
      </div>
      <CommunicationInterface />
    </div>
  )
}
