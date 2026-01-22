"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Settings, LogOut, User, Building2, Home, ArrowLeft, MapPin } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useFarm } from "@/contexts/farm-context"
import { cn } from "@/lib/utils"

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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || "")

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

  const handleFarmChange = (farmId: string | null) => {
    setSelectedFarm(farmId)
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

  const selectedFarmName = fazendas.find((f) => f.id === selectedFarm)?.nome

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
              className="flex items-center space-x-1 bg-transparent"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Inicio</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center space-x-1 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <h1 className="text-xl font-semibold">Agro DPE</h1>

          {/* Farm Tabs - Next to Logo */}
          {fazendas.length > 0 && (
            <>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center bg-muted/50 rounded-lg p-1 gap-1">
                <button
                  onClick={() => handleFarmChange(null)}
                  className={cn(
                    "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    selectedFarm === null
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  Todas
                </button>
                {fazendas.slice(0, 4).map((farm) => (
                  <button
                    key={farm.id}
                    onClick={() => handleFarmChange(farm.id)}
                    className={cn(
                      "px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5",
                      selectedFarm === farm.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="max-w-24 truncate">{farm.nome}</span>
                  </button>
                ))}
                {fazendas.length > 4 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors">
                        +{fazendas.length - 4}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {fazendas.slice(4).map((farm) => (
                        <DropdownMenuItem key={farm.id} onClick={() => handleFarmChange(farm.id)}>
                          <Building2 className="h-4 w-4 mr-2" />
                          {farm.nome}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-transparent">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials(userEmail)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userEmail}</p>
                  {selectedFarmName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedFarmName}
                    </p>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/propriedades")}>
                <MapPin className="mr-2 h-4 w-4" />
                <span>Gerenciar Propriedades</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configuracoes</span>
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
