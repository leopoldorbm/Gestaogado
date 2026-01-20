"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { checkSupabaseHealth } from "@/lib/supabase/health-check"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Wifi, WifiOff, Info } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "healthy" | "unhealthy">("checking")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkConnection = async () => {
      console.log("[v0] Checking Supabase connection health...")
      const result = await checkSupabaseHealth()

      if (result.isHealthy) {
        console.log("[v0] Supabase connection is healthy")
        setConnectionStatus("healthy")
      } else {
        console.error("[v0] Supabase connection is unhealthy:", result.error, result.details)
        setConnectionStatus("unhealthy")
        setConnectionError(`${result.error}${result.details ? ": " + result.details : ""}`)
      }
    }

    checkConnection()
  }, [])

  const handleDemoLogin = () => {
    console.log("[v0] Demo mode: Simulating successful login")
    // Store demo mode flag in sessionStorage
    sessionStorage.setItem("demo_mode", "true")
    sessionStorage.setItem("demo_user", JSON.stringify({ email: email || "demo@example.com" }))
    router.push("/dashboard")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (connectionStatus === "unhealthy" && isDemoMode) {
      handleDemoLogin()
      return
    }

    if (connectionStatus === "unhealthy") {
      setError(
        "Não é possível fazer login: Supabase não está acessível. Use o modo de demonstração para testar a interface.",
      )
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    console.log("[v0] Attempting login with email:", email)

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })

      if (authError) {
        console.error("[v0] Login error:", authError)
        throw authError
      }

      console.log("[v0] Login successful, redirecting to dashboard")
      router.push("/dashboard")
    } catch (error: unknown) {
      console.error("[v0] Login exception:", error)

      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        setError(
          "Não foi possível conectar ao Supabase. O serviço pode estar temporariamente indisponível. Use o modo de demonstração para testar a interface.",
        )
        setConnectionStatus("unhealthy")
      } else if (error instanceof Error) {
        const message = error.message.toLowerCase()
        if (message.includes("invalid login credentials") || message.includes("invalid")) {
          setError("Email ou senha incorretos")
        } else if (message.includes("email not confirmed")) {
          setError("Por favor, confirme seu email antes de fazer login")
        } else if (message.includes("too many requests")) {
          setError("Muitas tentativas de login. Por favor, aguarde alguns minutos")
        } else {
          setError(error.message)
        }
      } else {
        setError("Erro ao fazer login. Por favor, tente novamente.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {connectionStatus === "checking" && (
            <Alert>
              <Wifi className="h-4 w-4" />
              <AlertTitle>Verificando conexão...</AlertTitle>
              <AlertDescription>Testando conectividade com o Supabase</AlertDescription>
            </Alert>
          )}

          {connectionStatus === "unhealthy" && (
            <>
              <Alert variant="destructive">
                <WifiOff className="h-4 w-4" />
                <AlertTitle>Problema de Conexão</AlertTitle>
                <AlertDescription className="mt-2 text-sm">{connectionError}</AlertDescription>
              </Alert>

              <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                <Info className="h-4 w-4" />
                <AlertTitle>Modo de Demonstração Disponível</AlertTitle>
                <AlertDescription className="mt-2 text-sm">
                  Você pode usar o modo de demonstração para testar a interface sem conexão com o Supabase. Os dados
                  serão simulados e não serão salvos.
                </AlertDescription>
              </Alert>
            </>
          )}

          {connectionStatus === "healthy" && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
              <Wifi className="h-4 w-4" />
              <AlertTitle>Conexão OK</AlertTitle>
              <AlertDescription>Supabase está acessível</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>
                {connectionStatus === "unhealthy" && isDemoMode
                  ? "Modo de demonstração - dados simulados"
                  : "Entre com seu email e senha para acessar o sistema"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  {connectionStatus === "unhealthy" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="demo-mode"
                        checked={isDemoMode}
                        onChange={(e) => setIsDemoMode(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="demo-mode" className="text-sm font-normal">
                        Usar modo de demonstração
                      </Label>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={isDemoMode ? "demo@example.com (opcional)" : "seu@email.com"}
                      required={!isDemoMode}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder={isDemoMode ? "(não necessário)" : ""}
                      required={!isDemoMode}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isDemoMode}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading || connectionStatus === "checking"}>
                    {isLoading ? "Entrando..." : isDemoMode ? "Entrar em Modo Demo" : "Entrar"}
                  </Button>
                </div>
                {!isDemoMode && (
                  <>
                    <div className="mt-4 text-center text-sm">
                      Não tem uma conta?{" "}
                      <Link href="/auth/cadastro" className="underline underline-offset-4">
                        Cadastre-se
                      </Link>
                    </div>
                    <div className="mt-2 text-center text-sm">
                      <Link href="/auth/recuperar-senha" className="underline underline-offset-4">
                        Esqueceu a senha?
                      </Link>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
