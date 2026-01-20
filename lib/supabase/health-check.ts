import { createClient } from "./client"

export interface HealthCheckResult {
  isHealthy: boolean
  error?: string
  details?: string
}

/**
 * Checks if Supabase is accessible and properly configured
 * This makes an actual network request to verify connectivity
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
  try {
    const supabase = createClient()

    console.log("[v0] Health check: Testing Supabase auth endpoint connectivity...")

    // This will make a real network request to the auth endpoint
    // We expect it to fail with "Invalid credentials" if the connection works
    // or "Failed to fetch" if there's a network/connectivity issue
    const { error } = await supabase.auth.signInWithPassword({
      email: "health-check@test.invalid",
      password: "invalid-password-for-health-check",
    })

    if (error) {
      // If we get an auth error (invalid credentials), that means the connection works!
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid") ||
        error.message.includes("Email not confirmed")
      ) {
        console.log("[v0] Health check: Supabase auth endpoint is accessible (got expected auth error)")
        return {
          isHealthy: true,
        }
      }

      // If we get a fetch error, the connection is not working
      if (error.message.includes("Failed to fetch") || error.message.includes("fetch")) {
        console.error("[v0] Health check: Network connectivity issue:", error.message)
        return {
          isHealthy: false,
          error: "Não foi possível conectar ao Supabase",
          details:
            "O servidor Supabase não está acessível. Possíveis causas: (1) Projeto pausado no Supabase, (2) Credenciais incorretas, (3) Restrições de rede no ambiente de preview. Você pode usar o modo de demonstração para testar a interface.",
        }
      }

      // Other errors
      console.error("[v0] Health check: Unexpected error:", error.message)
      return {
        isHealthy: false,
        error: "Erro ao verificar conexão com Supabase",
        details: error.message,
      }
    }

    // This shouldn't happen (login with invalid credentials should fail)
    // but if it does, consider it healthy
    console.log("[v0] Health check: Unexpected success with test credentials")
    return {
      isHealthy: true,
    }
  } catch (error) {
    console.error("[v0] Health check: Exception during health check:", error)

    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        isHealthy: false,
        error: "Falha na conexão de rede",
        details:
          "O Supabase não está acessível. Isso pode acontecer se: (1) O projeto está pausado, (2) As credenciais estão incorretas, (3) Há restrições de rede. Use o modo de demonstração para testar a interface.",
      }
    }

    return {
      isHealthy: false,
      error: "Erro desconhecido ao verificar Supabase",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}
