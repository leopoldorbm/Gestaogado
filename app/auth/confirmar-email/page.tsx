"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, RefreshCw, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Suspense } from "react"
import Loading from "./loading"

export default function ConfirmarEmailPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [resendStatus, setResendStatus] = useState<"idle" | "success" | "error">("idle")
  const [resendMessage, setResendMessage] = useState("")
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (!email || countdown > 0) return

    setIsResending(true)
    setResendStatus("idle")
    setResendMessage("")

    try {
      const supabase = createClient()
      
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        throw error
      }

      setResendStatus("success")
      setResendMessage("Email reenviado com sucesso! Verifique sua caixa de entrada e spam.")
      setCountdown(60)
    } catch (error: unknown) {
      setResendStatus("error")
      setResendMessage(error instanceof Error ? error.message : "Erro ao reenviar email. Tente novamente.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <Suspense fallback={<Loading />}>
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Confirme seu email</CardTitle>
                <CardDescription>Verifique sua caixa de entrada para ativar sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                  <p>
                    Enviamos um link de confirmacao para{" "}
                    {email ? <strong className="text-foreground">{email}</strong> : "seu email"}. 
                    Clique no link para ativar sua conta e fazer login no sistema.
                  </p>
                  <p className="mt-2">
                    Nao esqueca de verificar a pasta de <strong>spam</strong> ou <strong>lixo eletronico</strong>.
                  </p>
                </div>

                {resendStatus === "success" && (
                  <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    {resendMessage}
                  </div>
                )}

                {resendStatus === "error" && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    {resendMessage}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="resend-email">Email para reenvio</Label>
                    <Input
                      id="resend-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleResendEmail}
                    disabled={!email || isResending || countdown > 0}
                    variant="outline"
                    className="w-full bg-transparent"
                  >
                    {isResending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Reenviando...
                      </>
                    ) : countdown > 0 ? (
                      <>Reenviar em {countdown}s</>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reenviar email de confirmacao
                      </>
                    )}
                  </Button>
                </div>

                <div className="pt-4 text-center text-sm">
                  <Link href="/auth/login" className="text-primary underline underline-offset-4">
                    Voltar para o login
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Suspense>
    </div>
  )
}
