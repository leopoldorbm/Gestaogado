import { CattleYardInterface } from "@/components/cattle-yard-interface"

export default function CattleYardPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Módulo de Curral e Pesagem</h1>
          <p className="text-muted-foreground">Dashboard ao vivo para manejo e acompanhamento de animais</p>
        </div>

        <CattleYardInterface />
      </div>
    </div>
  )
}
