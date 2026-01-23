import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (profilesError) {
      console.error("[v0] Admin API - Error loading profiles:", profilesError)
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Get all auth users to map emails
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    const authUsersMap = new Map<string, string>()
    if (authData?.users) {
      for (const user of authData.users) {
        authUsersMap.set(user.id, user.email || "")
      }
    }

    // Map profiles with emails from auth
    const users = (profiles || []).map((profile) => ({
      id: profile.id,
      email: profile.email || authUsersMap.get(profile.id) || `user_${profile.id.slice(0, 8)}@unknown.com`,
      nome: profile.nome,
      created_at: profile.created_at,
      status_acesso: profile.status_acesso || "ativo",
      tipo_acesso: profile.tipo_acesso || "ilimitado",
      data_expiracao_acesso: profile.data_expiracao_acesso,
      dias_acesso_restantes: profile.dias_acesso_restantes,
      ultimo_acesso: profile.ultimo_acesso,
      is_admin: profile.is_admin || false,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("[v0] Admin API - Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, ...updateData } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", userId)

    if (error) {
      console.error("[v0] Admin API - Error updating profile:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Admin API - Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
