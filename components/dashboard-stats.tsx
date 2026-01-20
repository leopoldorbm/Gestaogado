"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Cog as Cow, BarChart3, AlertTriangle, TrendingUp, Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useFarm } from "@/contexts/farm-context"

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
  const [isCheckingDatabase, setIsCheckingDatabase] = useState(false)
  const { selectedFarm } = useFarm()

  useEffect(() => {
    loadDashboardData(selectedFarm)
  }, [selectedFarm])

  const loadDashboardData = async (farmId?: string | null) => {
    try {
      console.log("[v0] Attempting to load dashboard data for farm:", farmId)
      setLoading(true)
      setError(null)

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Database operation timed out")), 15000)
      })

      const supabase = createClient()

      let animalsQuery = supabase
        .from("gado")
        .select("id, sexo, valor_compra, status_reproducao, data_entrada, fazenda_id")
        .eq("ativo", true)

      if (farmId && farmId !== "all" && farmId !== "null" && farmId !== null) {
        animalsQuery = animalsQuery.eq("fazenda_id", farmId)
      }

      const { data: animals, error: animalsError } = (await Promise.race([animalsQuery, timeoutPromise])) as any

      if (animalsError) {
        console.error("Error fetching animals:", animalsError)
        throw animalsError
      }

      let weighingsQuery = supabase
        .from("pesagens")
        .select("gado_id, peso, data_pesagem")
        .order("data_pesagem", { ascending: false })

      if (farmId && farmId !== "all" && farmId !== "null" && farmId !== null && animals && animals.length > 0) {
        const animalIds = animals.map((animal) => animal.id)
        weighingsQuery = weighingsQuery.in("gado_id", animalIds)
      }

      const { data: weighings, error: weighingsError } = (await Promise.race([weighingsQuery, timeoutPromise])) as any

      if (weighingsError) {
        console.error("Error fetching weighings:", weighingsError)
      }

      const totalAnimals = animals?.length || 0

      console.log(
        "[v0] Animals data for sex analysis:",
        animals?.map((animal) => ({ id: animal.id, sexo: animal.sexo })),
      )

      const totalMales = animals?.filter((animal) => animal.sexo?.toLowerCase() === "macho").length || 0
      const totalFemales = animals?.filter((animal) => animal.sexo?.toLowerCase() === "fêmea").length || 0

      console.log("[v0] Sex counts - Males:", totalMales, "Females:", totalFemales, "Total:", totalAnimals)

      const pregnantFemales =
        animals?.filter(
          (animal) => animal.sexo?.toLowerCase() === "fêmea" && animal.status_reproducao?.toLowerCase() === "prenha",
        ).length || 0

      const totalValue =
        animals?.reduce((sum, animal) => {
          return sum + (Number.parseFloat(animal.valor_compra) || 0)
        }, 0) || 0

      let averageWeight = 0
      if (weighings && weighings.length > 0) {
        const latestWeighings = new Map()
        weighings.forEach((weighing) => {
          if (
            !latestWeighings.has(weighing.gado_id) ||
            weighing.data_pesagem > latestWeighings.get(weighing.gado_id).data_pesagem
          ) {
            latestWeighings.set(weighing.gado_id, weighing)
          }
        })

        const totalWeight = Array.from(latestWeighings.values()).reduce((sum, weighing) => {
          return sum + (Number.parseFloat(weighing.peso) || 0)
        }, 0)

        averageWeight = latestWeighings.size > 0 ? Math.round(totalWeight / latestWeighings.size) : 0
      }

      let animalsNeedingWeighing = 0
      if (weighings && weighings.length > 0) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - 120)

        const recentWeighings = new Set()
        weighings.forEach((weighing) => {
          if (new Date(weighing.data_pesagem) >= cutoffDate) {
            recentWeighings.add(weighing.gado_id)
          }
        })

        animalsNeedingWeighing = totalAnimals - recentWeighings.size
      } else {
        animalsNeedingWeighing = totalAnimals
      }

      const dashboardData = {
        totalAnimals,
        totalMales,
        totalFemales,
        averageWeight,
        animalsNeedingWeighing,
        pregnantFemales,
        totalValue,
      }

      console.log("[v0] Successfully loaded cattle data:", totalAnimals, "animals for farm:", farmId)
      setData(dashboardData)
      setError(null)
    } catch (error: any) {
      console.error("Erro ao carregar dados do dashboard:", error)

      if (error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
        setError("tables_not_found")
      } else if (error?.message?.includes("NetworkError") || error?.message?.includes("fetch")) {
        setError("network_error")
      } else if (error?.message?.includes("timed out")) {
        setError("timeout_error")
      } else {
        setError("generic_error")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyDatabase = async () => {
    setIsCheckingDatabase(true)
    setError(null)
    setLoading(true)

    try {
      await loadDashboardData(selectedFarm)

      // If we successfully loaded data, show success message
      if (!error) {
        console.log("[v0] Database verification successful - tables are ready!")
      }
    } catch (err) {
      console.error("[v0] Database verification failed:", err)
    } finally {
      setIsCheckingDatabase(false)
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
                  <code className="bg-yellow-200 px-2 py-1 rounded text-xs">scripts/01-create-cattle-tables.sql</code>
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
                  <strong>Clique em "Verificar Status do Banco" abaixo após executar os scripts</strong>
                </li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleVerifyDatabase}
                className="bg-yellow-600 hover:bg-yellow-700"
                disabled={isCheckingDatabase}
              >
                {isCheckingDatabase ? (
                  <>
                    <Database className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Verificar Status do Banco
                  </>
                )}
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
              >
                Recarregar Página
              </Button>
            </div>
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
      </div>
    )
  }

  if (error === "network_error") {
    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-orange-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Erro de Conexão</span>
            </div>
            <p className="text-orange-700 mb-4">
              Não foi possível conectar ao banco de dados. Verifique sua conexão com a internet e tente novamente.
            </p>
            <Button
              onClick={() => {
                setError(null)
                loadDashboardData(selectedFarm)
              }}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error === "timeout_error") {
    return (
      <div className="grid grid-cols-1 gap-6 mb-8">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Timeout de Conexão</span>
            </div>
            <p className="text-yellow-700 mb-4">
              A operação demorou muito para responder. Isso pode indicar problemas de conectividade ou sobrecarga do
              servidor.
            </p>
            <Button
              onClick={() => {
                setError(null)
                loadDashboardData(selectedFarm)
              }}
              variant="outline"
              className="border-yellow-300 text-yellow-700 hover:bg-yellow-100"
            >
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
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
