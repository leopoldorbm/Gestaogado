"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { Building2, User, Lock, Trash2, Plus, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Farm {
  id: string
  nome: string
  endereco?: string
  telefone?: string
  email?: string
  responsavel?: string
}

export default function ConfiguracoesPage() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [userEmail, setUserEmail] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Farm form state
  const [newFarm, setNewFarm] = useState({
    nome: "",
    endereco: "",
    telefone: "",
    email: "",
    responsavel: "",
  })

  // Password change state
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  })

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserEmail(user.email || "")

      // Load farms
      const { data: farmsData, error } = await supabase
        .from("fazendas")
        .select("*")
        .eq("user_id", user.id)
        .order("nome")

      if (error) {
        console.error("[v0] Error loading farms:", error)
        toast({
          title: "Erro",
          description: "Erro ao carregar fazendas",
          variant: "destructive",
        })
      } else {
        setFarms(farmsData || [])
      }
    } catch (error) {
      console.error("[v0] Error loading user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFarm = async () => {
    if (!newFarm.nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da fazenda é obrigatório",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("fazendas").insert([
        {
          ...newFarm,
          user_id: user.id,
        },
      ])

      if (error) {
        console.error("[v0] Error creating farm:", error)
        toast({
          title: "Erro",
          description: "Erro ao criar fazenda",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Fazenda criada com sucesso",
        })
        setNewFarm({
          nome: "",
          endereco: "",
          telefone: "",
          email: "",
          responsavel: "",
        })
        loadUserData()
      }
    } catch (error) {
      console.error("[v0] Error creating farm:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFarm = async (farmId: string) => {
    try {
      const { error } = await supabase.from("fazendas").delete().eq("id", farmId)

      if (error) {
        console.error("[v0] Error deleting farm:", error)
        toast({
          title: "Erro",
          description: "Erro ao deletar fazenda",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Fazenda deletada com sucesso",
        })
        loadUserData()

        // Clear selected farm if it was deleted
        const selectedFarm = localStorage.getItem("selectedFarm")
        if (selectedFarm === farmId) {
          localStorage.removeItem("selectedFarm")
        }
      }
    } catch (error) {
      console.error("[v0] Error deleting farm:", error)
    }
  }

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      toast({
        title: "Erro",
        description: "Nova senha e confirmação não coincidem",
        variant: "destructive",
      })
      return
    }

    if (passwords.new.length < 6) {
      toast({
        title: "Erro",
        description: "Nova senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      })

      if (error) {
        console.error("[v0] Error changing password:", error)
        toast({
          title: "Erro",
          description: "Erro ao alterar senha",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sucesso",
          description: "Senha alterada com sucesso",
        })
        setPasswords({
          current: "",
          new: "",
          confirm: "",
        })
      }
    } catch (error) {
      console.error("[v0] Error changing password:", error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas fazendas, perfil e configurações da conta</p>
      </div>

      <Tabs defaultValue="fazendas" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="fazendas">
            <Building2 className="h-4 w-4 mr-2" />
            Fazendas
          </TabsTrigger>
          <TabsTrigger value="perfil">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Lock className="h-4 w-4 mr-2" />
            Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fazendas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Fazenda</CardTitle>
              <CardDescription>Adicione uma nova fazenda ao seu sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome da Fazenda *</Label>
                  <Input
                    id="nome"
                    value={newFarm.nome}
                    onChange={(e) => setNewFarm({ ...newFarm, nome: e.target.value })}
                    placeholder="Ex: Fazenda São João"
                  />
                </div>
                <div>
                  <Label htmlFor="responsavel">Responsável</Label>
                  <Input
                    id="responsavel"
                    value={newFarm.responsavel}
                    onChange={(e) => setNewFarm({ ...newFarm, responsavel: e.target.value })}
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="endereco">Endereço</Label>
                <Textarea
                  id="endereco"
                  value={newFarm.endereco}
                  onChange={(e) => setNewFarm({ ...newFarm, endereco: e.target.value })}
                  placeholder="Endereço completo da fazenda"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={newFarm.telefone}
                    onChange={(e) => setNewFarm({ ...newFarm, telefone: e.target.value })}
                    placeholder="(XX) XXXXX-XXXX"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newFarm.email}
                    onChange={(e) => setNewFarm({ ...newFarm, email: e.target.value })}
                    placeholder="contato@fazenda.com"
                  />
                </div>
              </div>

              <Button onClick={handleCreateFarm} disabled={saving}>
                <Plus className="h-4 w-4 mr-2" />
                {saving ? "Criando..." : "Criar Fazenda"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fazendas Cadastradas</CardTitle>
              <CardDescription>Gerencie suas fazendas existentes</CardDescription>
            </CardHeader>
            <CardContent>
              {farms.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma fazenda cadastrada. Crie sua primeira fazenda acima.
                </p>
              ) : (
                <div className="space-y-4">
                  {farms.map((farm) => (
                    <div key={farm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{farm.nome}</h3>
                        {farm.endereco && <p className="text-sm text-muted-foreground">{farm.endereco}</p>}
                        {farm.responsavel && (
                          <p className="text-sm text-muted-foreground">Responsável: {farm.responsavel}</p>
                        )}
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar Fazenda</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja deletar a fazenda "{farm.nome}"? Esta ação não pode ser desfeita e
                              todos os dados relacionados serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteFarm(farm.id)}>Deletar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perfil" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Suas informações de conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={userEmail} disabled className="bg-muted" />
                <p className="text-sm text-muted-foreground mt-1">
                  Para alterar o email, entre em contato com o suporte
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Mantenha sua conta segura com uma senha forte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwords.new}
                  onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                  placeholder="Digite sua nova senha"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  placeholder="Confirme sua nova senha"
                />
              </div>

              <Button onClick={handleChangePassword} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Alterando..." : "Alterar Senha"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
