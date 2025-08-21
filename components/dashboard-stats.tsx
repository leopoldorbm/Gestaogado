"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MilkIcon as Cow, BarChart3, AlertTriangle, TrendingUp, Database } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface DashboardData {
  totalAnimals: number
  totalMales: number
  totalFemales: number
  averageWeight: number
  animalsNeedingWeighing: number
  pregnantFemales: number
  totalValue: number
}

export function DashboardStats() {
  const [data, setData] = useState<DashboardData>({
    totalAnimals: 0,
    totalMales: 0,
    totalFemales: 0,
    averageWeight: 0,
    animalsNeedingWeighing: 0,
    pregnantFemales: 0,
    totalValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      console.log("[v0] Attempting to load dashboard data...")

      const { data: cattle, error: cattleError } = await supabase
        .from("gado")
        .select(`
          *,
          pesagens(peso, data_pesagem)
        `)
        .eq("ativo", true)

      if (cattleError) {
        console.log("[v0] Database error:", cattleError)
        if (
          cattleError.message.includes("Could not find the table") ||
          (cattleError.message.includes("relation") && cattleError.message.includes("does not exist"))
        ) {
          setError("tables_not_found")
          return
        }
        throw cattleError
      }

      console.log("[v0] Successfully loaded cattle data:", cattle?.length || 0, "animals")

      const totalAnimals = cattle?.length || 0
      const totalMales = cattle?.filter((animal) => animal.sexo === "Macho").length || 0
      const totalFemales = cattle?.filter((animal) => animal.sexo === "Fêmea").length || 0
      const pregnantFemales = cattle?.filter((animal) => animal.status_reproducao === "Prenha").length || 0

      let totalWeight = 0
      let animalsWithWeight = 0
      let animalsNeedingWeighing = 0

      cattle?.forEach((animal) => {
        if (animal.pesagens && animal.pesagens.length > 0) {
          const sortedWeighings = animal.pesagens.sort(
            (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
          )
          const lastWeighing = sortedWeighings[0]
          totalWeight += lastWeighing.peso
          animalsWithWeight++

          const daysSinceWeighing = Math.ceil(
            (new Date().getTime() - new Date(lastWeighing.data_pesagem).getTime()) / (1000 * 60 * 60 * 24),
          )
          if (daysSinceWeighing > 120) {
            animalsNeedingWeighing++
          }
        } else {
          animalsNeedingWeighing++
        }
      })

      const averageWeight = animalsWithWeight > 0 ? totalWeight / animalsWithWeight : 0

      const totalValue =
        cattle?.reduce((sum, animal) => {
          return sum + (animal.valor_compra || 0)
        }, 0) || 0

      setData({
        totalAnimals,
        totalMales,
        totalFemales,
        averageWeight: Math.round(averageWeight * 10) / 10,
        animalsNeedingWeighing,
        pregnantFemales,
        totalValue,
      })
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error)
      setError("generic_error")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (error === "tables_not_found") {
    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Database className="h-5 w-5" />
              Configuração Inicial Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              O sistema de gestão de gado está pronto, mas as tabelas do banco de dados ainda não foram criadas.
            </p>
            <div className="bg-yellow-100 p-4 rounded-md mb-4">
              <p className="text-sm text-yellow-800 font-medium mb-3">📋 Passos para configurar o banco de dados:</p>
              <ol className="text-sm text-yellow-700 space-y-2 ml-4 list-decimal">
                <li>
                  <strong>Execute o script principal:</strong>{" "}
                  <code className="bg-yellow-200 px-2 py-1 rounded text-xs">



</code>
                  <br />
                  <span className="text-xs text-yellow-600">
                    Este script cria todas as tabelas necessárias (fazendas, lotes, gado, pesagens, pastos)
                  </span>
                </li>
                <li>
                  <strong>Execute o script de dados exemplo (opcional):</strong>{" "}
                  <code className="bg-yellow-200 px-2 py-1 rounded text-xs">scripts/02-seed-sample-data.sql</code>
                  <br />
                  <span className="text-xs text-yellow-600">Adiciona dados de exemplo para testar o sistema</span>
                </li>
                <li>
                  <strong>Execute o script de pastos (se usar mapeamento):</strong>{" "}
                  <code className="bg-yellow-200 px-2 py-1 rounded text-xs">scripts/03-create-pasture-table.sql</code>
                </li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setError(null)
                  setLoading(true)
                  loadDashboardData()
                }}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                <Database className="h-4 w-4 mr-2" />
                Verificar Status do Banco
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Recarregar Página
              </Button>
            </div>
            {/* </CHANGE> */}
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <TrendingUp className="h-5 w-5" />
              Funcionalidades Disponíveis Sem Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-3">Enquanto configura o banco de dados, você já pode usar:</p>
            <ul className="text-sm text-blue-600 space-y-1 ml-4 list-disc">
              <li>
                <strong>Mapeamento de Pastos:</strong> Funciona com armazenamento local
              </li>
              <li>
                <strong>Importação de Planilhas:</strong> Preview e validação funcionam normalmente
              </li>
              <li>
                <strong>Templates Excel:</strong> Download de modelos para cadastro e pesagem
              </li>
            </ul>
          </CardContent>
        </Card>
        {/* </CHANGE> */}
      </div>
    )
  }

  if (error === "generic_error") {
    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Erro ao Carregar Dados</span>
            </div>
            <p className="text-red-700 mb-4">
              Ocorreu um erro ao carregar os dados do dashboard. Verifique a conexão com o banco de dados.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Animais</CardTitle>
          <Cow className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalAnimals}</div>
          <p className="text-xs text-muted-foreground">Animais ativos no rebanho</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peso Médio</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.averageWeight} kg</div>
          <p className="text-xs text-muted-foreground">Baseado nas últimas pesagens</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.animalsNeedingWeighing}</div>
          <p className="text-xs text-muted-foreground">Animais sem pesagem há 120+ dias</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor do Rebanho</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalValue)}</div>
          <p className="text-xs text-muted-foreground">Valor total investido</p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Machos</CardTitle>
          <Cow className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalMales}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalAnimals > 0 ? Math.round((data.totalMales / data.totalAnimals) * 100) : 0}% do rebanho
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fêmeas</CardTitle>
          <Cow className="h-4 w-4 text-pink-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalFemales}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalAnimals > 0 ? Math.round((data.totalFemales / data.totalAnimals) * 100) : 0}% do rebanho
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Fêmeas Prenhas</CardTitle>
          <Cow className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pregnantFemales}</div>
          <p className="text-xs text-muted-foreground">
            {data.totalFemales > 0 ? Math.round((data.pregnantFemales / data.totalFemales) * 100) : 0}% das fêmeas
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Média por Animal</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.totalAnimals > 0 ? formatCurrency(data.totalValue / data.totalAnimals) : formatCurrency(0)}
          </div>
          <p className="text-xs text-muted-foreground">Valor médio por cabeça</p>
        </CardContent>
      </Card>
    </div>
  )
}
