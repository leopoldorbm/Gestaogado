import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ConfirmarEmailPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Confirme seu email</CardTitle>
              <CardDescription>Verifique sua caixa de entrada</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de confirmação para seu email. Clique no link para ativar sua conta e fazer login no
                sistema.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
