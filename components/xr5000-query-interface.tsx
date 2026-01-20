"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Copy, Play, Settings, Database, Users, Heart, Star } from "lucide-react"

interface APIEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  description: string
  category: string
  parameters?: { name: string; type: string; required: boolean; description: string }[]
  example?: string
}

const API_ENDPOINTS: APIEndpoint[] = [
  // Sessions
  { method: "GET", path: "/sessions", description: "Retrieves session information", category: "Sessions" },
  { method: "POST", path: "/sessions", description: "Creates new sessions", category: "Sessions" },
  { method: "PUT", path: "/sessions", description: "Overwrites existing sessions", category: "Sessions" },
  { method: "DELETE", path: "/sessions", description: "Deletes existing sessions", category: "Sessions" },
  { method: "GET", path: "/sessions/{id}", description: "Retrieves a specific session", category: "Sessions" },
  { method: "PUT", path: "/sessions/{id}", description: "Overwrites a specific session", category: "Sessions" },
  { method: "DELETE", path: "/sessions/{id}", description: "Deletes a specific session", category: "Sessions" },
  { method: "POST", path: "/merge/sessions", description: "Updates a session", category: "Sessions" },

  // Animals
  { method: "GET", path: "/animals", description: "Retrieves all animal data", category: "Animals" },
  { method: "POST", path: "/animals", description: "Create new animals", category: "Animals" },
  { method: "PUT", path: "/animals", description: "Overwrites animal information", category: "Animals" },
  { method: "DELETE", path: "/animals", description: "Deletes animals", category: "Animals" },
  {
    method: "GET",
    path: "/animals/{idType}/{id}",
    description: "Retrieves animal information by ID field",
    category: "Animals",
  },
  {
    method: "PUT",
    path: "/animals/{idType}/{id}",
    description: "Overwrite an animal by using specified ID field",
    category: "Animals",
  },
  {
    method: "DELETE",
    path: "/animals/{idType}/{id}",
    description: "Deletes an animal using its ID field",
    category: "Animals",
  },
  { method: "POST", path: "/merge/animals", description: "Update an existing animal", category: "Animals" },
  {
    method: "POST",
    path: "/merge/animals/{idType}/{id}",
    description: "Update an animal by using specified ID field",
    category: "Animals",
  },

  // Traits
  { method: "GET", path: "/traits", description: "Retrieves all trait information", category: "Traits" },
  { method: "POST", path: "/traits", description: "Creates new traits", category: "Traits" },
  { method: "PUT", path: "/traits", description: "Overwrites existing traits", category: "Traits" },
  { method: "DELETE", path: "/traits", description: "Delete a trait", category: "Traits" },
  {
    method: "GET",
    path: "/traits/{traitname}",
    description: "Retrieve information about a named trait",
    category: "Traits",
  },
  { method: "PUT", path: "/traits/{traitname}", description: "Overwrite named trait", category: "Traits" },
  { method: "DELETE", path: "/traits/{traitname}", description: "Delete a named trait", category: "Traits" },
  { method: "POST", path: "/merge/traits", description: "Update existing traits", category: "Traits" },
  { method: "POST", path: "/merge/traits/{traitname}", description: "Update existing trait", category: "Traits" },

  // Treatments
  { method: "GET", path: "/treatments", description: "Gets all treatment information", category: "Treatments" },
  { method: "POST", path: "/treatments", description: "Create a new treatment", category: "Treatments" },
  { method: "PUT", path: "/treatments", description: "Overwrite existing treatments", category: "Treatments" },
  { method: "DELETE", path: "/treatments", description: "Deletes treatments", category: "Treatments" },
  { method: "POST", path: "/merge/treatments", description: "Update an existing treatment", category: "Treatments" },

  // Settings
  { method: "GET", path: "/settings", description: "Retrieves settings from indicator", category: "Settings" },
  {
    method: "POST",
    path: "/settings",
    description: "Allows various settings in the indicator to be modified",
    category: "Settings",
  },

  // System
  { method: "GET", path: "/polaris", description: "Retrieves basic information about indicator", category: "System" },
  {
    method: "GET",
    path: "/events",
    description: "Polls the indicators for events that have happened",
    category: "System",
  },
  { method: "POST", path: "/heartbeat", description: "Informs indicator of client name", category: "System" },
  { method: "POST", path: "/restart", description: "Restarts or suspends the indicator", category: "System" },
  {
    method: "POST",
    path: "/demomode",
    description: "Replaces indicator database with sample data",
    category: "System",
  },

  // Users
  {
    method: "GET",
    path: "/users",
    description: "Returns all user names and roles and associated permissions",
    category: "Users",
  },
  {
    method: "POST",
    path: "/users",
    description: "Returns all user names and roles and associated permissions",
    category: "Users",
  },

  // Favourites
  { method: "GET", path: "/favourites", description: "Retrieves list of available favourites", category: "Favourites" },
  {
    method: "GET",
    path: "/favourites/{filename}",
    description: "Retrieves a specified favourite",
    category: "Favourites",
  },
  {
    method: "POST",
    path: "/favourites/{filename}",
    description: "Creates a favourite on the indicator",
    category: "Favourites",
  },

  // Field Order
  {
    method: "GET",
    path: "/fieldorder/{id}",
    description: "Retrieves all trait information for a session",
    category: "Field Order",
  },
]

const CATEGORIES = [
  "All",
  "Sessions",
  "Animals",
  "Traits",
  "Treatments",
  "Settings",
  "System",
  "Users",
  "Favourites",
  "Field Order",
]

const METHOD_COLORS = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
}

const CATEGORY_ICONS = {
  Sessions: Database,
  Animals: Heart,
  Traits: Settings,
  Treatments: AlertCircle,
  Settings: Settings,
  System: Settings,
  Users: Users,
  Favourites: Star,
  "Field Order": Database,
}

export function XR5000QueryInterface() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null)
  const [baseUrl, setBaseUrl] = useState("http://192.168.7.1:9000")
  const [requestBody, setRequestBody] = useState("")
  const [pathParams, setPathParams] = useState<Record<string, string>>({})
  const [queryParams, setQueryParams] = useState<Record<string, string>>({})
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "error">("disconnected")

  const filteredEndpoints =
    selectedCategory === "All"
      ? API_ENDPOINTS
      : API_ENDPOINTS.filter((endpoint) => endpoint.category === selectedCategory)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/xr5000-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "GET",
          endpoint: "/polaris",
          baseUrl,
        }),
      })

      if (response.ok) {
        setConnectionStatus("connected")
        const data = await response.text()
        setResponse(data)
      } else {
        setConnectionStatus("error")
        setResponse(`Erro de conexão: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      setConnectionStatus("error")
      setResponse(`Erro de rede: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const executeQuery = async () => {
    if (!selectedEndpoint) return

    setLoading(true)
    try {
      let endpoint = selectedEndpoint.path

      // Replace path parameters
      Object.entries(pathParams).forEach(([key, value]) => {
        endpoint = endpoint.replace(`{${key}}`, value)
      })

      // Add query parameters
      const queryString = Object.entries(queryParams)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&")

      if (queryString) {
        endpoint += `?${queryString}`
      }

      const requestOptions: any = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: selectedEndpoint.method,
          endpoint,
          baseUrl,
          ...(requestBody && { body: requestBody }),
        }),
      }

      const response = await fetch("/api/xr5000-proxy", requestOptions)
      const data = await response.text()
      setResponse(data)
    } catch (error) {
      setResponse(`Erro: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response)
  }

  const getPathParams = (path: string) => {
    const matches = path.match(/\{([^}]+)\}/g)
    return matches ? matches.map((match) => match.slice(1, -1)) : []
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuração de Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="baseUrl">URL Base da XR5000</Label>
              <Input
                id="baseUrl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="http://192.168.7.1:9000"
              />
            </div>
            <Button onClick={testConnection} disabled={loading}>
              {loading ? "Testando..." : "Testar Conexão"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "error"
                    ? "bg-red-500"
                    : "bg-gray-400"
              }`}
            />
            <span className="text-sm">
              {connectionStatus === "connected"
                ? "Conectado"
                : connectionStatus === "error"
                  ? "Erro de conexão"
                  : "Desconectado"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Explorer */}
        <Card>
          <CardHeader>
            <CardTitle>Explorador de API</CardTitle>
            <CardDescription>Selecione uma categoria e endpoint para executar consultas na XR5000</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-5 mb-4">
                {CATEGORIES.slice(0, 5).map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredEndpoints.map((endpoint, index) => {
                  const IconComponent = CATEGORY_ICONS[endpoint.category as keyof typeof CATEGORY_ICONS] || Database
                  return (
                    <div
                      key={index}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedEndpoint === endpoint ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      }`}
                      onClick={() => setSelectedEndpoint(endpoint)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <IconComponent className="h-4 w-4" />
                        <Badge className={METHOD_COLORS[endpoint.method]}>{endpoint.method}</Badge>
                        <code className="text-sm font-mono">{endpoint.path}</code>
                      </div>
                      <p className="text-sm text-gray-600">{endpoint.description}</p>
                    </div>
                  )
                })}
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* Query Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Construtor de Consulta</CardTitle>
            <CardDescription>Configure os parâmetros para a consulta selecionada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedEndpoint ? (
              <>
                <div>
                  <Label>Endpoint Selecionado</Label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge className={METHOD_COLORS[selectedEndpoint.method]}>{selectedEndpoint.method}</Badge>
                    <code className="text-sm">{selectedEndpoint.path}</code>
                  </div>
                </div>

                {/* Path Parameters */}
                {getPathParams(selectedEndpoint.path).length > 0 && (
                  <div>
                    <Label>Parâmetros de Caminho</Label>
                    <div className="space-y-2">
                      {getPathParams(selectedEndpoint.path).map((param) => (
                        <div key={param}>
                          <Label htmlFor={param} className="text-sm">
                            {param}
                          </Label>
                          <Input
                            id={param}
                            value={pathParams[param] || ""}
                            onChange={(e) =>
                              setPathParams((prev) => ({
                                ...prev,
                                [param]: e.target.value,
                              }))
                            }
                            placeholder={`Valor para ${param}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query Parameters */}
                <div>
                  <Label>Parâmetros de Consulta (Opcionais)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="count"
                      value={queryParams.count || ""}
                      onChange={(e) =>
                        setQueryParams((prev) => ({
                          ...prev,
                          count: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="fromDate"
                      value={queryParams.fromDate || ""}
                      onChange={(e) =>
                        setQueryParams((prev) => ({
                          ...prev,
                          fromDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Request Body */}
                {["POST", "PUT"].includes(selectedEndpoint.method) && (
                  <div>
                    <Label htmlFor="requestBody">Corpo da Requisição (XML)</Label>
                    <Textarea
                      id="requestBody"
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      placeholder="Cole aqui o XML da requisição..."
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                )}

                <Button onClick={executeQuery} disabled={loading} className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  {loading ? "Executando..." : "Executar Consulta"}
                </Button>
              </>
            ) : (
              <div className="text-center text-gray-500 py-8">Selecione um endpoint para configurar a consulta</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resposta</CardTitle>
              <Button variant="outline" size="sm" onClick={copyResponse}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">{response}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
