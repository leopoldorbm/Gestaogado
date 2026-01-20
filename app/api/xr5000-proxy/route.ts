import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const targetUrl = searchParams.get("url")
  const endpoint = searchParams.get("endpoint") || ""

  if (!targetUrl) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    let finalUrl = targetUrl
    const isLocalIP =
      targetUrl.includes("192.168.") || targetUrl.includes("127.0.0.1") || targetUrl.includes("localhost")

    if (isLocalIP) {
      finalUrl = targetUrl.replace("https://", "http://")
      console.log(`[v0] XR5000 Proxy: Using HTTP for local IP: ${finalUrl}`)
    }

    console.log(`[v0] XR5000 Proxy: Attempting connection to ${finalUrl}${endpoint}`)

    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {
        Accept: "application/xml, text/xml, application/json, */*",
        "User-Agent": "ADI-Client/1.0",
        "Content-Type": "application/xml",
      },
      signal: AbortSignal.timeout(10000), // Increased timeout for local connections
    }

    console.log(`[v0] XR5000 Proxy: Making request with options:`, JSON.stringify(fetchOptions.headers))

    const response = await fetch(`${finalUrl}${endpoint}`, fetchOptions)

    console.log(`[v0] XR5000 Proxy: Response status ${response.status}`)
    console.log(`[v0] XR5000 Proxy: Response headers:`, Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const data = await response.text()
      console.log(`[v0] XR5000 Proxy: Raw response data (${data.length} chars):`, data.substring(0, 200))

      if (data.includes("Animal Data Transfer REST API") || data.includes("Swagger")) {
        return NextResponse.json(
          {
            success: false,
            error: "Swagger documentation page detected",
            details:
              "Acessou a página de documentação em vez da API. Tente endpoints específicos como /api/v1/sessions",
            suggestion: "Use endpoints da API REST ADI: /api/v1/sessions, /api/v1/animals, /api/v1/traits",
          },
          { status: 400 },
        )
      }

      if (data.includes("Invalid request, only public URLs are supported")) {
        return NextResponse.json(
          {
            success: false,
            error: "XR5000 configuration error",
            details:
              "A XR5000 está configurada para aceitar apenas URLs públicas. Configure a XR5000 para aceitar conexões locais.",
            configHelp: "Acesse as configurações de rede da XR5000 e desabilite a restrição 'only public URLs'",
          },
          { status: 400 },
        )
      }

      if (data.includes("Invalid request, only https is supported")) {
        return NextResponse.json(
          {
            success: false,
            error: "XR5000 requires HTTPS",
            details: "A XR5000 requer conexões HTTPS, mas o navegador acessa via HTTP. Verifique a configuração.",
          },
          { status: 400 },
        )
      }

      let parsedData = data
      if (data.trim().startsWith("<")) {
        // XML response - this is what we expect from ADI API
        console.log(`[v0] XR5000 Proxy: Received XML response from ADI API`)
      } else if (data.trim().startsWith("{") || data.trim().startsWith("[")) {
        try {
          parsedData = JSON.parse(data)
          console.log(`[v0] XR5000 Proxy: Successfully parsed as JSON`)
        } catch (e) {
          console.log(`[v0] XR5000 Proxy: Failed to parse as JSON, keeping as text`)
        }
      }

      return NextResponse.json({
        success: true,
        status: response.status,
        contentType: response.headers.get("content-type") || "",
        data: parsedData,
      })
    } else {
      const errorText = await response.text()
      console.log(`[v0] XR5000 Proxy: HTTP error ${response.status}, body:`, errorText)
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      )
    }
  } catch (error) {
    console.log(`[v0] XR5000 Proxy: Network error:`, error)

    if (error instanceof Error) {
      console.log(`[v0] XR5000 Proxy: Error name: ${error.name}, message: ${error.message}`)

      if (error.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Connection timeout - XR5000 not responding",
            details: "Verifique se a XR5000 está ligada e conectada em 192.168.7.1:9000",
          },
          { status: 408 },
        )
      }

      if (error.message.includes("ECONNREFUSED")) {
        return NextResponse.json(
          {
            success: false,
            error: "Connection refused - XR5000 not accessible",
            details: "A XR5000 não está respondendo em 192.168.7.1:9000. Verifique a conexão USB-Ethernet.",
          },
          { status: 503 },
        )
      }

      if (error.message.includes("ENETUNREACH") || error.message.includes("EHOSTUNREACH")) {
        return NextResponse.json(
          {
            success: false,
            error: "Network unreachable - Check USB-Ethernet connection",
            details: "Não foi possível alcançar 192.168.7.1. Verifique se o modo USB está configurado como Ethernet.",
          },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: `Erro de conexão: ${error.name}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown network error",
        details: "Erro desconhecido ao conectar com a XR5000",
      },
      { status: 500 },
    )
  }
}
