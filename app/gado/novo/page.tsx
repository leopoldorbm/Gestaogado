import { CattleRegistrationForm } from "@/components/cattle-registration-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NovoGadoPage() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Cadastrar Novo Animal</h1>
          <p className="text-muted-foreground">Preencha as informações completas do animal para adicionar ao rebanho</p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Informações do Animal</CardTitle>
            <CardDescription>Todos os campos marcados com * são obrigatórios</CardDescription>
          </CardHeader>
          <CardContent>
            <CattleRegistrationForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
