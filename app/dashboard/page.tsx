import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardStats } from "@/components/dashboard-stats"
import { AlertNotification } from "@/components/alert-notification"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cog as Cow, BarChart3, Plus, AlertTriangle, MapPin, Scale, Usb, Search } from "lucide-react"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      // Only redirect if we have a real Supabase configuration
      const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (hasSupabaseConfig) {
        redirect("/auth/login")
      }
      // If no Supabase config, continue without authentication
    }
  } catch (error) {
    console.log("[v0] Authentication check failed, continuing without auth:", error)
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Gestão de Gado</h1>
          <p className="text-muted-foreground">
            Controle completo do seu rebanho com relatórios e alertas inteligentes
          </p>
        </div>
      </div>

      <AlertNotification />

      <DashboardStats />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse as principais funcionalidades do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/gado/novo">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Novo Animal
              </Button>
            </Link>
            <Link href="/gado">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Cow className="mr-2 h-4 w-4" />
                Gerenciar Rebanho
              </Button>
            </Link>
            <Link href="/curral">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Scale className="mr-2 h-4 w-4" />
                Módulo de Curral e Pesagem
              </Button>
            </Link>
            <Link href="/comunicacao">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Usb className="mr-2 h-4 w-4" />
                Comunicação com Balança
              </Button>
            </Link>
            <Link href="/consulta-balanca">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Search className="mr-2 h-4 w-4" />
                Consulta à Balança XR5000
              </Button>
            </Link>
            <Link href="/relatorios">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Ver Relatórios
              </Button>
            </Link>
            <Link href="/alertas">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Ver Alertas
              </Button>
            </Link>
            <Link href="/mapeamento">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <MapPin className="mr-2 h-4 w-4" />
                Mapeamento de Pastos
              </Button>
            </Link>
            <Link href="/importar">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Importar Dados
              </Button>
            </Link>
            <Link href="/exportar">
              <Button className="w-full justify-start bg-transparent" variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Exportar Dados
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
            <CardDescription>Configure seu sistema para começar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">1. Execute os scripts do banco de dados</p>
              <p className="mb-2">2. Cadastre sua primeira fazenda</p>
              <p className="mb-2">3. Adicione lotes/pastos</p>
              <p>4. Comece a cadastrar seus animais</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
