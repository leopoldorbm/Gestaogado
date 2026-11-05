export function getSupabaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

  if (!configuredUrl) {
    return null
  }

  const managedSupabaseHost = configuredUrl.match(/([a-z0-9-]+\.supabase\.co)(?::\d+)?/i)?.[1]
  const normalizedUrl = managedSupabaseHost
    ? `https://${managedSupabaseHost}`
    : /^https?:\/\//i.test(configuredUrl)
      ? configuredUrl
      : `https://${configuredUrl}`

  try {
    const url = new URL(normalizedUrl)

    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
      return null
    }

    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function requireSupabaseUrl() {
  const supabaseUrl = getSupabaseUrl()

  if (!supabaseUrl) {
    throw new Error('A URL do Supabase está ausente ou inválida.')
  }

  return supabaseUrl
}
