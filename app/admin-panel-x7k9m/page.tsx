"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Search,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Calendar,
  LogOut,
  RefreshCw,
  Shield,
} from "lucide-react"
import { format, differenceInDays, subDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useSearchParams } from "next/navigation"
import Loading from "./loading"

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  created_at: string
  status_acesso: "ativo" | "suspenso" | "cancelado" | "pendente"
  tipo_acesso: "ilimitado" | "por_prazo" | "por_dias"
  data_expiracao_acesso: string | null
  dias_acesso_restantes: number | null
  ultimo_acesso: string | null
  is_admin: boolean
}

interface DashboardStats {
  totalUsers: number
  newUsers: number
  activeUsers: number
  inactiveUsers: number
}

export default function AdminPanelPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    newUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
  })

  // Form state for editing
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    status_acesso: "ativo" as UserProfile["status_acesso"],
    tipo_acesso: "ilimitado" as UserProfile["tipo_acesso"],
    data_expiracao_acesso: "",
    dias_acesso_restantes: 0,
  })

  useEffect(() => {
    const adminAuth = sessionStorage.getItem("admin_authenticated")
    if (adminAuth !== "true") {
      router.push("/auth/login")
      return
    }
    setIsAuthenticated(true)
    loadUsers()
  }, [router])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Get all profiles with user info
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get auth users to get emails
      const userProfiles: UserProfile[] = []
      
      for (const profile of profiles || []) {
        // Try to get user email from auth.users via RPC or just use profile data
        userProfiles.push({
          id: profile.id,
          email: profile.email || `user_${profile.id.slice(0, 8)}@unknown.com`,
          first_name: profile.first_name,
          last_name: profile.last_name,
          created_at: profile.created_at,
          status_acesso: profile.status_acesso || "ativo",
          tipo_acesso: profile.tipo_acesso || "ilimitado",
          data_expiracao_acesso: profile.data_expiracao_acesso,
          dias_acesso_restantes: profile.dias_acesso_restantes,
          ultimo_acesso: profile.ultimo_acesso,
          is_admin: profile.is_admin || false,
        })
      }

      setUsers(userProfiles)

      // Calculate stats
      const now = new Date()
      const sevenDaysAgo = subDays(now, 7)
      const fifteenDaysAgo = subDays(now, 15)

      const newUsers = userProfiles.filter((u) => {
        const createdAt = new Date(u.created_at)
        return differenceInDays(now, createdAt) <= 7
      }).length

      const activeUsers = userProfiles.filter((u) => {
        if (!u.ultimo_acesso) return false
        const lastAccess = new Date(u.ultimo_acesso)
        return differenceInDays(now, lastAccess) <= 7
      }).length

      const inactiveUsers = userProfiles.filter((u) => {
        if (!u.ultimo_acesso) return true
        const lastAccess = new Date(u.ultimo_acesso)
        return differenceInDays(now, lastAccess) > 15
      }).length

      setStats({
        totalUsers: userProfiles.length,
        newUsers,
        activeUsers,
        inactiveUsers,
      })
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user)
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      status_acesso: user.status_acesso,
      tipo_acesso: user.tipo_acesso,
      data_expiracao_acesso: user.data_expiracao_acesso || "",
      dias_acesso_restantes: user.dias_acesso_restantes || 0,
    })
    setEditDialogOpen(true)
  }

  const handleSaveUser = async () => {
    if (!selectedUser) return

    try {
      const supabase = createClient()

      const updateData: Record<string, unknown> = {
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        status_acesso: editForm.status_acesso,
        tipo_acesso: editForm.tipo_acesso,
      }

      if (editForm.tipo_acesso === "por_prazo" && editForm.data_expiracao_acesso) {
        updateData.data_expiracao_acesso = editForm.data_expiracao_acesso
      } else {
        updateData.data_expiracao_acesso = null
      }

      if (editForm.tipo_acesso === "por_dias") {
        updateData.dias_acesso_restantes = editForm.dias_acesso_restantes
      } else {
        updateData.dias_acesso_restantes = null
      }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", selectedUser.id)

      if (error) throw error

      setEditDialogOpen(false)
      loadUsers()
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  const handleQuickAction = async (userId: string, action: "suspend" | "cancel" | "activate" | "unlimited") => {
    try {
      const supabase = createClient()

      let updateData: Record<string, unknown> = {}

      switch (action) {
        case "suspend":
          updateData = { status_acesso: "suspenso" }
          break
        case "cancel":
          updateData = { status_acesso: "cancelado" }
          break
        case "activate":
          updateData = { status_acesso: "ativo" }
          break
        case "unlimited":
          updateData = { status_acesso: "ativo", tipo_acesso: "ilimitado", data_expiracao_acesso: null, dias_acesso_restantes: null }
          break
      }

      const { error } = await supabase.from("profiles").update(updateData).eq("id", userId)

      if (error) throw error

      loadUsers()
    } catch (error) {
      console.error("Error updating user:", error)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated")
    router.push("/auth/login")
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

    const matchesStatus = statusFilter === "todos" || user.status_acesso === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: UserProfile["status_acesso"]) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500 text-white">Ativo</Badge>
      case "suspenso":
        return <Badge className="bg-yellow-500 text-white">Suspenso</Badge>
      case "cancelado":
        return <Badge className="bg-red-500 text-white">Cancelado</Badge>
      case "pendente":
        return <Badge className="bg-gray-500 text-white">Pendente</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getTipoAcessoBadge = (tipo: UserProfile["tipo_acesso"]) => {
    switch (tipo) {
      case "ilimitado":
        return <Badge variant="outline" className="border-green-500 text-green-700">Ilimitado</Badge>
      case "por_prazo":
        return <Badge variant="outline" className="border-blue-500 text-blue-700">Por Prazo</Badge>
      case "por_dias":
        return <Badge variant="outline" className="border-orange-500 text-orange-700">Por Dias</Badge>
      default:
        return <Badge variant="outline">{tipo}</Badge>
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Painel Administrativo</h1>
          </div>
          <Button variant="outline" onClick={handleLogout} className="bg-transparent">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container py-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">usuarios cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Usuarios</CardTitle>
              <UserPlus className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.newUsers}</div>
              <p className="text-xs text-muted-foreground">nos ultimos 7 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Ativos</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">acessaram nos ultimos 7 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Inativos</CardTitle>
              <UserX className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.inactiveUsers}</div>
              <p className="text-xs text-muted-foreground">sem acesso ha mais de 15 dias</p>
            </CardContent>
          </Card>
        </div>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Gerenciamento de Usuarios</CardTitle>
                <CardDescription>Visualize e gerencie todos os usuarios do sistema</CardDescription>
              </div>
              <Button onClick={loadUsers} variant="outline" size="sm" className="bg-transparent">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por email ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="suspenso">Suspensos</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tipo de Acesso</TableHead>
                      <TableHead>Ultimo Acesso</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum usuario encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                  : "Sem nome"}
                              </div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.status_acesso)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getTipoAcessoBadge(user.tipo_acesso)}
                              {user.tipo_acesso === "por_prazo" && user.data_expiracao_acesso && (
                                <div className="text-xs text-muted-foreground">
                                  Expira: {format(new Date(user.data_expiracao_acesso), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              )}
                              {user.tipo_acesso === "por_dias" && user.dias_acesso_restantes !== null && (
                                <div className="text-xs text-muted-foreground">
                                  {user.dias_acesso_restantes} dias restantes
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.ultimo_acesso ? (
                              <div className="text-sm">
                                {format(new Date(user.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Nunca acessou</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                title="Editar"
                                className="bg-transparent"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {user.status_acesso === "ativo" ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickAction(user.id, "suspend")}
                                  title="Suspender"
                                  className="text-yellow-600 hover:text-yellow-700 bg-transparent"
                                >
                                  <Ban className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQuickAction(user.id, "activate")}
                                  title="Ativar"
                                  className="text-green-600 hover:text-green-700 bg-transparent"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleQuickAction(user.id, "cancel")}
                                title="Cancelar acesso"
                                className="text-red-600 hover:text-red-700 bg-transparent"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  placeholder="Nome"
                />
              </div>
              <div className="space-y-2">
                <Label>Sobrenome</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  placeholder="Sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status do Acesso</Label>
              <Select
                value={editForm.status_acesso}
                onValueChange={(v) => setEditForm({ ...editForm, status_acesso: v as UserProfile["status_acesso"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Acesso</Label>
              <Select
                value={editForm.tipo_acesso}
                onValueChange={(v) => setEditForm({ ...editForm, tipo_acesso: v as UserProfile["tipo_acesso"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ilimitado">Ilimitado</SelectItem>
                  <SelectItem value="por_prazo">Por Prazo (data)</SelectItem>
                  <SelectItem value="por_dias">Por Dias (contador)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editForm.tipo_acesso === "por_prazo" && (
              <div className="space-y-2">
                <Label>Data de Expiracao</Label>
                <Input
                  type="date"
                  value={editForm.data_expiracao_acesso}
                  onChange={(e) => setEditForm({ ...editForm, data_expiracao_acesso: e.target.value })}
                />
              </div>
            )}

            {editForm.tipo_acesso === "por_dias" && (
              <div className="space-y-2">
                <Label>Dias de Acesso Restantes</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.dias_acesso_restantes}
                  onChange={(e) => setEditForm({ ...editForm, dias_acesso_restantes: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="bg-transparent">
              Cancelar
            </Button>
            <Button onClick={handleSaveUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
