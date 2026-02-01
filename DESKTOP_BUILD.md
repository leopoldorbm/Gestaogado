# GestaoGado - Versao Desktop

Este documento explica como compilar e executar a versao desktop do GestaoGado, que permite conexao direta com a balanca XR5000.

## Pre-requisitos

- Node.js 18+ instalado
- npm ou yarn
- Git

## Instalacao

1. Clone ou baixe o repositorio:
```bash
git clone <url-do-repositorio>
cd gestaogado
```

2. Instale as dependencias:
```bash
npm install
```

## Desenvolvimento

Para executar em modo de desenvolvimento (com hot-reload):

```bash
npm run electron:dev
```

Isso ira:
1. Iniciar o servidor Next.js em http://localhost:3000
2. Abrir a aplicacao Electron conectada ao servidor

## Build para Producao

### Windows

```bash
npm run electron:build:win
```

Gera:
- `dist-electron/GestaoGado Setup X.X.X.exe` (instalador NSIS)
- `dist-electron/GestaoGado X.X.X.exe` (versao portatil)

### macOS

```bash
npm run electron:build:mac
```

Gera:
- `dist-electron/GestaoGado-X.X.X.dmg`

### Linux

```bash
npm run electron:build:linux
```

Gera:
- `dist-electron/GestaoGado-X.X.X.AppImage`
- `dist-electron/gestaogado_X.X.X_amd64.deb`

## Conexao com a Balanca XR5000

### Modo USB Ethernet (Recomendado)

1. Conecte a balanca via cabo USB
2. A balanca cria uma interface de rede virtual com IP 192.168.7.1
3. Na aplicacao:
   - Selecione "Conexao USB"
   - Selecione "Ethernet via USB (ADI)"
   - IP: 192.168.7.1
   - Porta: 9000
4. Clique em "Detectar Dispositivos"
5. Clique em "Conectar"

### Modo USB Serial (Legacy)

1. Conecte a balanca via cabo USB
2. Verifique a porta COM no Gerenciador de Dispositivos (Windows)
3. Na aplicacao:
   - Selecione "Conexao USB"
   - Selecione "Modo Legacy (Serial)"
   - Porta: COM21 (ou a porta correta)
   - Baud Rate: 9600
4. Clique em "Conectar"

## Solucao de Problemas

### "Nao foi possivel conectar a balanca"

1. Verifique se a balanca esta ligada
2. Verifique o cabo USB
3. No Windows, verifique se os drivers RNDIS estao instalados
4. Tente fazer ping em 192.168.7.1

### "Porta serial nao encontrada"

1. Verifique a porta COM no Gerenciador de Dispositivos
2. Certifique-se de que nenhum outro programa esta usando a porta
3. Tente desconectar e reconectar o cabo USB

### Logs de Debug

Os logs da aplicacao podem ser visualizados:
- No console do Electron (View > Toggle Developer Tools)
- Em `%APPDATA%/GestaoGado/logs/` (Windows)

## Estrutura do Projeto Electron

```
electron/
  main.js       # Processo principal do Electron
  preload.js    # Script de preload (bridge entre Node e renderer)

hooks/
  use-electron.ts  # Hook React para usar APIs do Electron
```

## APIs Disponiveis no Electron

### Serial (USB Legacy)
- `electronAPI.serial.listPorts()` - Lista portas COM
- `electronAPI.serial.connect({port, baudRate})` - Conecta
- `electronAPI.serial.disconnect()` - Desconecta
- `electronAPI.serial.write(data)` - Envia dados

### TCP (USB Ethernet)
- `electronAPI.tcp.connect({host, port})` - Conecta
- `electronAPI.tcp.disconnect()` - Desconecta
- `electronAPI.tcp.write(data)` - Envia dados

### XR5000 Comandos ADI
- `electronAPI.xr5000.getWeight()` - Solicita peso
- `electronAPI.xr5000.getAnimalId()` - Solicita ID do animal

## Licenca

Projeto proprietario - todos os direitos reservados.
