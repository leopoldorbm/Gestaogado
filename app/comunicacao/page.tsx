import { CommunicationInterface } from "@/components/communication-interface"

export default function CommunicationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Comunicação com Balança</h1>
        <p className="text-muted-foreground">
          Configure a conexão USB com a balança Tru-Test XR5000 para recebimento automático de dados
        </p>
      </div>
      <CommunicationInterface />
    </div>
  )
}
