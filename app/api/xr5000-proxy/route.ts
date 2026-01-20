import { type NextRequest, NextResponse } from "next/server"

// Helper function to make request to XR5000
async function makeXR5000Request(
  targetUrl: string,
  endpoint: string,
  method: string = "GET",
  body?: string
) {
  let finalUrl = targetUrl
  const isLocalIP =
    targetUrl.includes("192.168.") || targetUrl.includes("127.0.0.1") || targetUrl.includes("localhost")

  if (isLocalIP) {
    finalUrl = targetUrl.replace("https://", "http://")
    console.log(`[v0] XR5000 Proxy: Using HTTP for local IP: ${finalUrl}`)
  }

  // Ensure endpoint starts with /api/v1 for ADI API
  let apiEndpoint = endpoint
  if (endpoint && !endpoint.startsWith("/api/v1") && !endpoint.startsWith("http")) {
    apiEndpoint = `/api/v1${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`
  }

  const fullUrl = `${finalUrl}${apiEndpoint}`
  console.log(`[v0] XR5000 Proxy: Attempting ${method} to ${fullUrl}`)

  const fetchOptions: RequestInit = {
    method: method,
    headers: {
      Accept: "application/xml, text/xml, application/json, */*",
      "User-Agent": "ADI-Client/1.0",
      "Content-Type": "application/xml",
    },
    signal: AbortSignal.timeout(15000),
  }

  if (body && (method === "POST" || method === "PUT")) {
    fetchOptions.body = body
  }

  const response = await fetch(fullUrl, fetchOptions)
  console.log(`[v0] XR5000 Proxy: Response status ${response.status}`)

  return response
}

// POST handler for query interface
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { method = "GET", endpoint = "", baseUrl = "http://192.168.7.1:9000", body } = requestBody

    if (!baseUrl) {
      return NextResponse.json({ error: "baseUrl is required" }, { status: 400 })
    }

    const response = await makeXR5000Request(baseUrl, endpoint, method, body)
    const data = await response.text()

    console.log(`[v0] XR5000 Proxy POST: Response data (${data.length} chars):`, data.substring(0, 300))

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: data,
        },
        { status: response.status }
      )
    }

    // Check for common error responses
    if (data.includes("Invalid request, only public URLs are supported")) {
      return NextResponse.json(
        {
          success: false,
          error: "XR5000 configuration error",
          details: "A XR5000 está configurada para aceitar apenas URLs públicas.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      data: data,
    })
  } catch (error) {
    console.log(`[v0] XR5000 Proxy POST error:`, error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Connection timeout",
            details: "A XR5000 não respondeu a tempo. Verifique a conexão.",
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: `Erro: ${error.name}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown error",
        details: "Erro desconhecido ao conectar com a XR5000",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const targetUrl = searchParams.get("url")
  const endpoint = searchParams.get("endpoint") || ""

  if (!targetUrl) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 })
  }

  try {
    const response = await makeXR5000Request(targetUrl, endpoint, "GET")
    const data = await response.text()

    console.log(`[v0] XR5000 Proxy GET: Response data (${data.length} chars):`, data.substring(0, 200))

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: `HTTP ${response.status}: ${response.statusText}`,
          details: data,
        },
        { status: response.status }
      )
    }

    // Check for common error responses
    if (data.includes("Animal Data Transfer REST API") || data.includes("Swagger")) {
      return NextResponse.json(
        {
          success: false,
          error: "Swagger documentation page detected",
          details: "Acessou a página de documentação. Use endpoints como /sessions, /animals, /traits",
        },
        { status: 400 }
      )
    }

    if (data.includes("Invalid request, only public URLs are supported")) {
      return NextResponse.json(
        {
          success: false,
          error: "XR5000 configuration error",
          details: "A XR5000 está configurada para aceitar apenas URLs públicas.",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      status: response.status,
      contentType: response.headers.get("content-type") || "",
      data: data,
    })
  } catch (error) {
    console.log(`[v0] XR5000 Proxy GET error:`, error)

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return NextResponse.json(
          {
            success: false,
            error: "Connection timeout",
            details: "A XR5000 não respondeu a tempo.",
          },
          { status: 408 }
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: `Erro: ${error.name}`,
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "Unknown error",
        details: "Erro desconhecido ao conectar com a XR5000",
      },
      { status: 500 }
    )
  }
}
