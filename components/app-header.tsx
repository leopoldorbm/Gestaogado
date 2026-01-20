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
import { useFarm } from "@/contexts/farm-context"

export function AppHeader() {
  const { selectedFarm, setSelectedFarm, fazendas, setFazendas, isLoading, setIsLoading } = useFarm()
  const [userEmail, setUserEmail] = useState<string>("")
  const router = useRouter()

  let supabase: any
  try {
    supabase = createClient()
  } catch (error) {
    console.error("[v0] Failed to create Supabase client:", error)
    supabase = null
  }

  useEffect(() => {
    if (supabase) {
      loadUserAndFarms()
    } else {
      console.warn("[v0] Supabase client not available - using offline mode")
      setIsLoading(false)
    }
  }, [])

  const loadUserAndFarms = async () => {
    if (!supabase) return

    setIsLoading(true)
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
          .select("id, nome")
          .eq("user_id", user.id)
          .order("nome")

        if (error) {
          console.error("[v0] Error loading farms:", error)
        } else {
          setFazendas(farmsData || [])

          const savedFarm = localStorage.getItem("selectedFarm")
          if (!selectedFarm && (!savedFarm || savedFarm === "null") && farmsData && farmsData.length > 0) {
            console.log("[v0] Auto-selecting first farm:", farmsData[0].id)
            setSelectedFarm(farmsData[0].id)
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error loading user and farms:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFarmChange = (farmId: string) => {
    const newFarmId = farmId === "all" ? null : farmId
    console.log("[v0] Header: Farm selection changed to:", newFarmId)
    setSelectedFarm(newFarmId)
  }

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setSelectedFarm(null)
    router.push("/auth/login")
  }

  const getUserInitials = (email: string) => {
    return email.split("@")[0].substring(0, 2).toUpperCase()
  }

  if (isLoading) {
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

          {fazendas.length > 0 && (
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedFarm || "all"} onValueChange={handleFarmChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Selecione uma fazenda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Fazendas</SelectItem>
                  {fazendas.map((farm) => (
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
          {fazendas.length === 0 && (
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
