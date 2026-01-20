"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Copy, Play, Settings, Scale, Info, Zap, AlertTriangle } from "lucide-react"

// SCP Commands based on XR5000/SR3000 Protocol Documentation
interface SCPCommand {
  command: string
  description: string
  category: string
  response: string
}

const SCP_COMMANDS: SCPCommand[] = [
  // Weight Commands
  { command: "{RW}", description: "Ler peso atual da balanca", category: "Peso", response: "[peso] ou [Upeso] se instavel" },
  { command: "{RI}", description: "Ler peso e ID do animal atual", category: "Peso", response: "[peso,id]" },
  { command: "{RD}", description: "Ler dados completos do registro atual", category: "Peso", response: "[dados]" },
  
  // System Commands
  { command: "{ZA1}", description: "Ativar acknowledgements (resposta ^)", category: "Sistema", response: "^" },
  { command: "{ZA0}", description: "Desativar acknowledgements", category: "Sistema", response: "^" },
  { command: "{ZE1}", description: "Ativar codigos de erro", category: "Sistema", response: "^" },
  { command: "{ZE0}", description: "Desativar codigos de erro", category: "Sistema", response: "^" },
  { command: "{ZC1}", description: "Ativar CR/LF nas respostas", category: "Sistema", response: "^" },
  { command: "{ZC0}", description: "Desativar CR/LF nas respostas", category: "Sistema", response: "^" },
  { command: "{ZN}", description: "Retorna nome do modelo (3000)", category: "Sistema", response: "[3000]" },
  { command: "{VM}", description: "Retorna numero do modelo (8=SR, 13=XR)", category: "Sistema", response: "[modelo]" },
  { command: "{VV}", description: "Retorna versao do software", category: "Sistema", response: "[versao]" },
  { command: "{VS}", description: "Retorna numero de serie", category: "Sistema", response: "[serial]" },
  
  // Configuration Commands
  { command: "{SB9600}", description: "Configurar baud rate para 9600", category: "Configuracao", response: "^" },
  { command: "{SB38400}", description: "Configurar baud rate para 38400", category: "Configuracao", response: "^" },
  
  // Data Commands
  { command: "{RN}", description: "Ler numero de registros na sessao atual", category: "Dados", response: "[numero]" },
  { command: "{RS}", description: "Ler nome da sessao atual", category: "Dados", response: "[nome]" },
  { command: "{RT}", description: "Ler data/hora atual do indicador", category: "Dados", response: "[data/hora]" },
]

const CATEGORIES = ["Todos", "Peso", "Sistema", "Configuracao", "Dados"]

const CATEGORY_ICONS: Record<string, typeof Scale> = {
  Peso: Scale,
  Sistema: Settings,
  Configuracao: Zap,
  Dados: Info,
}

export function XR5000QueryInterface() {
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [selectedCommand, setSelectedCommand] = useState<SCPCommand | null>(null)
  const [baseUrl, setBaseUrl] = useState("http://192.168.7.1:9000")
  const [customCommand, setCustomCommand] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connected" | "error">("disconnected")

  const filteredCommands =
    selectedCategory === "Todos"
      ? SCP_COMMANDS
      : SCP_COMMANDS.filter((cmd) => cmd.category === selectedCategory)

  const testConnection = async () => {
    setLoading(true)
    setResponse("")
    try {
      // Test connection to root URL (Swagger page)
      const response = await fetch(`${baseUrl}/`, {
        method: "GET",
        headers: {
          Accept: "text/html, application/xml, */*",
        },
        mode: "cors",
      })

      if (response.ok) {
        setConnectionStatus("connected")
        const data = await response.text()
        setResponse(`Conexao bem-sucedida!\n\nURL: ${baseUrl}\n\nA XR5000 esta acessivel.\n\n${data.substring(0, 300)}...`)
      } else {
        setConnectionStatus("error")
        setResponse(`Erro HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      setConnectionStatus("error")
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        setResponse(
          `Erro de conexao: Nao foi possivel conectar a XR5000 em ${baseUrl}\n\n` +
          `Possiveis causas:\n` +
          `1. A balanca nao esta ligada ou conectada\n` +
          `2. O IP ou porta estao incorretos\n` +
          `3. CORS esta bloqueando a requisicao do navegador\n\n` +
          `IMPORTANTE: Os comandos SCP (como {RW}) funcionam via comunicacao SERIAL,\n` +
          `nao via HTTP. Para usar comandos SCP, voce precisa:\n` +
          `- Conectar via porta serial (COM) ou Bluetooth\n` +
          `- Usar o modulo de Comunicacao com a Balanca\n\n` +
          `A API REST (HTTP) da XR5000 tem endpoints limitados.`
        )
      } else {
        setResponse(`Erro de rede: ${error}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const executeCommand = async () => {
    const commandToSend = customCommand || selectedCommand?.command
    if (!commandToSend) return

    setLoading(true)
    setResponse("")
    
    // SCP commands are for SERIAL communication, not HTTP
    // Show informative message
    setResponse(
      `Comando SCP: ${commandToSend}\n\n` +
      `NOTA IMPORTANTE:\n` +
      `Os comandos SCP (Serial Communications Protocol) como ${commandToSend}\n` +
      `funcionam via comunicacao SERIAL (porta COM ou Bluetooth),\n` +
      `NAO via HTTP/REST API.\n\n` +
      `Para executar comandos SCP:\n` +
      `1. Va para o menu "Comunicacao" do sistema\n` +
      `2. Conecte a balanca via Bluetooth ou porta serial\n` +
      `3. Use a interface de comunicacao para enviar comandos\n\n` +
      `Resposta esperada para ${commandToSend}:\n` +
      `${selectedCommand?.response || "Depende do comando"}\n\n` +
      `A API HTTP da XR5000 (porta 9000) mostra apenas a documentacao Swagger\n` +
      `e pode ter endpoints REST limitados dependendo do modelo.`
    )
    
    setLoading(false)
  }

  const copyResponse = () => {
    navigator.clipboard.writeText(response)
  }

  return (
    <div className="space-y-6">
      {/* Important Notice */}
      <Card className="border-yellow-300 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            Informacao Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-800">
          <p className="mb-2">
            A XR5000 utiliza dois protocolos de comunicacao diferentes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>SCP (Serial Communications Protocol)</strong> - Via porta serial/Bluetooth para comandos como {"{RW}"}, {"{ZA1}"}, etc.</li>
            <li><strong>REST API (HTTP)</strong> - Via rede para acesso a documentacao e alguns endpoints limitados</li>
          </ul>
          <p className="mt-2 text-sm">
            Para ler peso em tempo real, use o <strong>modulo de Comunicacao</strong> via Bluetooth ou porta serial.
          </p>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Teste de Conexao HTTP
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
              {loading ? "Testando..." : "Testar Conexao"}
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
                ? "Conectado (HTTP)"
                : connectionStatus === "error"
                  ? "Erro de conexao"
                  : "Desconectado"}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SCP Commands Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Referencia de Comandos SCP</CardTitle>
            <CardDescription>Comandos disponiveis para comunicacao serial com a XR5000</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredCommands.map((cmd, index) => {
                const IconComponent = CATEGORY_ICONS[cmd.category] || Info
                return (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedCommand === cmd ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                    onClick={() => {
                      setSelectedCommand(cmd)
                      setCustomCommand(cmd.command)
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <IconComponent className="h-4 w-4" />
                      <Badge variant="secondary">{cmd.category}</Badge>
                      <code className="text-sm font-mono font-bold">{cmd.command}</code>
                    </div>
                    <p className="text-sm text-gray-600">{cmd.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Resposta: {cmd.response}</p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Command Tester */}
        <Card>
          <CardHeader>
            <CardTitle>Informacoes do Comando</CardTitle>
            <CardDescription>Selecione um comando para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customCommand">Comando SCP</Label>
              <Input
                id="customCommand"
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="Ex: {RW}"
                className="font-mono"
              />
            </div>

            {selectedCommand && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div>
                  <span className="text-sm font-medium">Comando:</span>
                  <code className="ml-2 text-blue-600">{selectedCommand.command}</code>
                </div>
                <div>
                  <span className="text-sm font-medium">Descricao:</span>
                  <span className="ml-2 text-sm">{selectedCommand.description}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Resposta esperada:</span>
                  <code className="ml-2 text-green-600">{selectedCommand.response}</code>
                </div>
                <div>
                  <span className="text-sm font-medium">Categoria:</span>
                  <Badge variant="outline" className="ml-2">{selectedCommand.category}</Badge>
                </div>
              </div>
            )}

            <Button onClick={executeCommand} disabled={loading || !customCommand} className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Ver Informacoes
            </Button>

            <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
              <strong>Nota:</strong> Para executar comandos SCP na balanca, use o modulo de Comunicacao 
              via Bluetooth ou porta serial. Esta interface serve como referencia dos comandos disponiveis.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response */}
      {response && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Resposta / Informacoes</CardTitle>
              <Button variant="outline" size="sm" onClick={copyResponse}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm whitespace-pre-wrap">{response}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
