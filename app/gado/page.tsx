import { CattleManagementInterface } from "@/components/cattle-management-interface"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from "lucide-react"
import Link from "next/link"

export default function GadoPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Gerenciar Rebanho</h1>
              <p className="text-muted-foreground">Visualize e gerencie todos os animais do seu rebanho</p>
            </div>
            <Link href="/gado/novo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Animal
              </Button>
            </Link>
          </div>
        </div>

        <CattleManagementInterface />
      </div>
    </div>
  )
}
