import { AlertsInterface } from "@/components/alerts-interface"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AlertasPage() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Sistema de Alertas</h1>
          <p className="text-muted-foreground">Monitore animais que precisam de atenção e ações prioritárias</p>
        </div>

        <AlertsInterface />
      </div>
    </div>
  )
}
