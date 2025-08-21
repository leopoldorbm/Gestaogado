"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, X, Eye } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"

interface AlertSummary {
  total: number
  high: number
  medium: number
  weighingNeeded: number
}

export function AlertNotification() {
  const [alertSummary, setAlertSummary] = useState<AlertSummary>({
    total: 0,
    high: 0,
    medium: 0,
    weighingNeeded: 0,
  })
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAlertSummary()
  }, [])

  const loadAlertSummary = async () => {
    try {
      console.log("[v0] Loading alert summary...")

      const { data: cattle, error } = await supabase
        .from("gado")
        .select(`
          id,
          data_entrada,
          pesagens(data_pesagem)
        `)
        .eq("ativo", true)

      if (error) {
        console.log("[v0] Alert summary error:", error)
        if (
          error.message.includes("Could not find the table") ||
          (error.message.includes("relation") && error.message.includes("does not exist"))
        ) {
          setError("tables_not_found")
          return
        }
        throw error
      }

      let total = 0
      let high = 0
      let medium = 0
      let weighingNeeded = 0

      const now = new Date()

      cattle?.forEach((animal) => {
        let needsWeighing = false
        let daysSinceWeighing = 0

        if (!animal.pesagens || animal.pesagens.length === 0) {
          needsWeighing = true
          daysSinceWeighing = Math.ceil(
            (now.getTime() - new Date(animal.data_entrada).getTime()) / (1000 * 60 * 60 * 24),
          )
        } else {
          const sortedWeighings = animal.pesagens.sort(
            (a, b) => new Date(b.data_pesagem).getTime() - new Date(a.data_pesagem).getTime(),
          )
          const lastWeighing = sortedWeighings[0]
          daysSinceWeighing = Math.ceil(
            (now.getTime() - new Date(lastWeighing.data_pesagem).getTime()) / (1000 * 60 * 60 * 24),
          )

          if (daysSinceWeighing > 120) {
            needsWeighing = true
          }
        }

        if (needsWeighing) {
          total++
          weighingNeeded++

          if (daysSinceWeighing > 180) {
            high++
          } else if (daysSinceWeighing > 120) {
            medium++
          }
        }
      })

      setAlertSummary({ total, high, medium, weighingNeeded })
    } catch (error) {
      console.error("Erro ao carregar resumo de alertas:", error)
      setError("generic_error")
    } finally {
      setLoading(false)
    }
  }

  if (loading || dismissed || error) {
    return null
  }

  return (
    <Card className="border-orange-200 bg-orange-50 mb-6">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800 mb-1">Alertas Pendentes</h3>
              <p className="text-sm text-orange-700 mb-3">
                Você tem {alertSummary.total} alerta{alertSummary.total !== 1 ? "s" : ""} que precisa
                {alertSummary.total === 1 ? "" : "m"} de atenção.
              </p>
              <div className="flex items-center gap-2 mb-3">
                {alertSummary.high > 0 && <Badge variant="destructive">{alertSummary.high} Alta Prioridade</Badge>}
                {alertSummary.medium > 0 && <Badge variant="default">{alertSummary.medium} Média Prioridade</Badge>}
                {alertSummary.weighingNeeded > 0 && (
                  <Badge variant="outline">{alertSummary.weighingNeeded} Precisam Pesagem</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href="/alertas">
                  <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver Alertas
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
