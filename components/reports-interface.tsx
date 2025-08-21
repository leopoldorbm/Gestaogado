"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { supabase } from "@/lib/supabase/client"
import { TrendingUp, TrendingDown } from "lucide-react"

interface ReportData {
  genderDistribution: { name: string; value: number; color: string }[]
  weightEvolution: { month: string; averageWeight: number; count: number }[]
  reproductiveStatus: { name: string; value: number; color: string }[]
  ageDistribution: { range: string; count: number }[]
  farmDistribution: { name: string; count: number; percentage: number }[]
  alerts: {
    needWeighing: number
    overweight: number
    underweight: number
    noRecentWeighing: number
  }
}

export function ReportsInterface() {
  const [data, setData] = useState<ReportData>({
    genderDistribution: [],
    weightEvolution: [],
    reproductiveStatus: [],
    ageDistribution: [],
    farmDistribution: [],
    alerts: {
      needWeighing: 0,
      overweight: 0,
      underweight: 0,
      noRecentWeighing: 0,
    },
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("6")

  useEffect(() => {
    loadReportData()
  }, [selectedPeriod])

  const loadReportData = async () => {
    try {
      // Buscar dados dos animais com pesagens
      const { data: cattle, error } = await supabase
        .from("gado")
        .select(`
          *,
          fazendas:fazenda_id(nome),
          pesagens(peso, data_pesagem)
        `)
        .eq("ativo", true)

      if (error) throw error

      // Distribuição por sexo
      const males = cattle?.filter((animal) => animal.sexo === "Macho").length || 0
      const females = cattle?.filter((animal) => animal.sexo === "Fêmea").length || 0

      const genderDistribution = [
        { name: "Machos", value: males, color: "#3b82f6" },
        { name: "Fêmeas", value: females, color: "#ec4899" },
      ]

      // Status reprodutivo (apenas fêmeas)
      const femaleAnimals = cattle?.filter((animal) => animal.sexo === "Fêmea") || []
      const pregnant = femaleAnimals.filter((animal) => animal.status_reproducao === "Prenha").length
      const empty = femaleAnimals.filter((animal) => animal.status_reproducao === "Vazia").length
      const notApplicable = femaleAnimals.filter((animal) => animal.status_reproducao === "Não se aplica").length

      const reproductiveStatus = [
        { name: "Prenhas", value: pregnant, color: "#10b981" },
        { name: "Vazias", value: empty, color: "#f59e0b" },
        { name: "N/A", value: notApplicable, color: "#6b7280" },
      ]

      // Evolução de peso por mês
      const monthsBack = Number.parseInt(selectedPeriod)
      const weightEvolution = []
      const now = new Date()

      for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })

        let totalWeight = 0
        let count = 0

        cattle?.forEach((animal) => {
          if (animal.pesagens && animal.pesagens.length > 0) {
            // Encontrar pesagem mais próxima do mês
            const monthWeighings = animal.pesagens.filter((p) => {
              const weighingDate = new Date(p.data_pesagem)
              return weighingDate.getMonth() === date.getMonth() && weighingDate.getFullYear() === date.getFullYear()
            })

            if (monthWeighings.length > 0) {
              const avgWeight = monthWeighings.reduce((sum, w) => sum + w.peso, 0) / monthWeighings.length
              totalWeight += avgWeight
              count++
            }
          }
        })

        weightEvolution.push({
          month: monthName,
          averageWeight: count > 0 ? Math.round((totalWeight / count) * 10) / 10 : 0,
          count,
        })
      }

      // Distribuição por idade
      const ageDistribution = [
        { range: "0-1 ano", count: 0 },
        { range: "1-2 anos", count: 0 },
        { range: "2-3 anos", count: 0 },
        { range: "3-5 anos", count: 0 },
        { range: "5+ anos", count: 0 },
        { range: "Sem data", count: 0 },
      ]

      cattle?.forEach((animal) => {
        if (!animal.data_nascimento) {
          ageDistribution[5].count++
          return
        }

        const birthDate = new Date(animal.data_nascimento)
        const ageInYears = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365)

        if (ageInYears < 1) ageDistribution[0].count++
        else if (ageInYears < 2) ageDistribution[1].count++
        else if (ageInYears < 3) ageDistribution[2].count++
        else if (ageInYears < 5) ageDistribution[3].count++
        else ageDistribution[4].count++
      })

      // Distribuição por fazenda
      const farmCounts: { [key: string]: number } = {}
      const totalAnimals = cattle?.length || 0

      cattle?.forEach((animal) => {
        const farmName = animal.fazendas?.nome || "Sem fazenda"
        farmCounts[farmName] = (farmCounts[farmName] || 0) + 1
      })

      const farmDistribution = Object.entries(farmCounts).map(([name, count]) => ({
        name,
        count,
        percentage: totalAnimals > 0 ? Math.round((count / totalAnimals) * 100) : 0,
      }))

      // Alertas
      let needWeighing = 0
      let noRecentWeighing = 0

      cattle?.forEach((animal) => {
        if (!animal.pesagens || animal.pesagens.length === 0) {
          noRecentWeighing++
          needWeighing++
          return
        }

        const lastWeighing = animal.pesagens.sort(
          (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
        )[0]

        const daysSinceWeighing = Math.ceil(
          (now.getTime() - new Date(lastWeighing.data_pesagem).getTime()) / (1000 * 60 * 60 * 24),
        )

        if (daysSinceWeighing > 120) {
          needWeighing++
        }
      })

      setData({
        genderDistribution,
        weightEvolution,
        reproductiveStatus,
        ageDistribution,
        farmDistribution,
        alerts: {
          needWeighing,
          overweight: 0, // Implementar lógica se necessário
          underweight: 0, // Implementar lógica se necessário
          noRecentWeighing,
        },
      })
    } catch (error) {
      console.error("Erro ao carregar dados dos relatórios:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse">
                <div className="h-64 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{data.alerts.needWeighing}</div>
                <p className="text-sm text-orange-600">Precisam pesagem</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{data.alerts.noRecentWeighing}</div>
                <p className="text-sm text-red-600">Sem pesagem</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{data.alerts.overweight}</div>
                <p className="text-sm text-blue-600">Acima do peso</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-600">{data.alerts.underweight}</div>
                <p className="text-sm text-gray-600">Abaixo do peso</p>
              </div>
              <TrendingDown className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por sexo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Sexo</CardTitle>
            <CardDescription>Proporção de machos e fêmeas no rebanho</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Quantidade",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.genderDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.genderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status reprodutivo */}
        <Card>
          <CardHeader>
            <CardTitle>Status Reprodutivo</CardTitle>
            <CardDescription>Status das fêmeas do rebanho</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: {
                  label: "Quantidade",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.reproductiveStatus}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.reproductiveStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolução de peso */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Evolução do Peso Médio</CardTitle>
            <CardDescription>Acompanhe a evolução do peso médio do rebanho</CardDescription>
          </div>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              averageWeight: {
                label: "Peso Médio (kg)",
                color: "#3b82f6",
              },
            }}
            className="h-64"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.weightEvolution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="averageWeight"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Distribuição por idade e fazenda */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Idade</CardTitle>
            <CardDescription>Faixas etárias do rebanho</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Quantidade",
                  color: "#10b981",
                },
              }}
              className="h-64"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fazenda</CardTitle>
            <CardDescription>Animais por propriedade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.farmDistribution.map((farm, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="font-medium">{farm.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{farm.count} animais</Badge>
                    <span className="text-sm text-muted-foreground">{farm.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
