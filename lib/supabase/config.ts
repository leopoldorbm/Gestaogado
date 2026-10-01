export function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return null

  let normalized = value.trim()

  if (normalized.startsWith("$'") && normalized.endsWith("'/")) {
    normalized = normalized.slice(2, -2)
  } else if (normalized.startsWith("$'") && normalized.endsWith("'")) {
    normalized = normalized.slice(2, -1)
  } else if (
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('"') && normalized.endsWith('"'))
  ) {
    normalized = normalized.slice(1, -1)
  }

  normalized = normalized.replace(/\\[nr]+$/g, "").trim()

  try {
    const url = new URL(normalized)
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

export function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    null

  return { url, key }
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig()
  return Boolean(url && key)
}

export function requireSupabaseUrl() {
  const { url } = getSupabaseConfig()
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL HTTP(S) válida.")
  }
  return url
}

export function requireSupabasePublicKey() {
  const { key } = getSupabaseConfig()
  if (!key) {
    throw new Error("Configure NEXT_PUBLIC_SUPABASE_ANON_KEY ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.")
  }
  return key
}

export function requireSupabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não está configurada.")
  }
  return key
}
