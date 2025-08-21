"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Settings, LogOut, User, Building2, Plus, Home, ArrowLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Farm {
  id: string
  nome: string
  endereco?: string
}

export function AppHeader() {
  const [farms, setFarms] = useState<Farm[]>([])
  const [selectedFarm, setSelectedFarm] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUserAndFarms()
  }, [])

  const loadUserAndFarms = async () => {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || "")

        // Load user's farms
        const { data: farmsData, error } = await supabase
          .from("fazendas")
          .select("id, nome, endereco")
          .eq("user_id", user.id)
          .order("nome")

        if (error) {
          console.error("[v0] Error loading farms:", error)
        } else {
          setFarms(farmsData || [])

          // Get selected farm from localStorage or select first farm
          const savedFarm = localStorage.getItem("selectedFarm")
          if (savedFarm && farmsData?.find((f) => f.id === savedFarm)) {
            setSelectedFarm(savedFarm)
          } else if (farmsData && farmsData.length > 0) {
            setSelectedFarm(farmsData[0].id)
            localStorage.setItem("selectedFarm", farmsData[0].id)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user and farms:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFarmChange = (farmId: string) => {
    setSelectedFarm(farmId)
    localStorage.setItem("selectedFarm", farmId)
    // Trigger a page refresh to update data for the new farm
    window.location.reload()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem("selectedFarm")
    router.push("/auth/login")
  }

  const getUserInitials = (email: string) => {
    return email.split("@")[0].substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">Agro DPE</h1>
          </div>
          <div className="animate-pulse h-8 w-32 bg-muted rounded"></div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
              className="flex items-center space-x-1"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Início</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center space-x-1">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <h1 className="text-xl font-semibold">Agro DPE</h1>

          {farms.length > 0 && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedFarm} onValueChange={handleFarmChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione uma fazenda" />
                </SelectTrigger>
                <SelectContent>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {farms.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => router.push("/configuracoes")}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Fazenda
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(userEmail)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userEmail}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
