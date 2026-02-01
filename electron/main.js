const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const net = require('net')

let mainWindow
let serialPort = null
let tcpClient = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../public/icon.svg'),
    title: 'GestaoGado - Sistema de Pesagem',
  })

  // In development, load from Next.js dev server
  // In production, load from built files
  const isDev = process.env.NODE_ENV === 'development'
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    if (serialPort && serialPort.isOpen) {
      serialPort.close()
    }
    if (tcpClient) {
      tcpClient.destroy()
    }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// ============================================
// Serial Port Communication (USB Legacy Mode)
// ============================================

ipcMain.handle('serial:list-ports', async () => {
  try {
    const ports = await SerialPort.list()
    return { success: true, ports }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('serial:connect', async (event, { port, baudRate = 9600 }) => {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close()
    }

    serialPort = new SerialPort({
      path: port,
      baudRate: baudRate,
      dataBits: 8,
      parity: 'none',
      stopBits: 1,
    })

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

    parser.on('data', (data) => {
      mainWindow.webContents.send('serial:data', data)
    })

    serialPort.on('error', (err) => {
      mainWindow.webContents.send('serial:error', err.message)
    })

    return { success: true, message: `Connected to ${port}` }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('serial:disconnect', async () => {
  try {
    if (serialPort && serialPort.isOpen) {
      await serialPort.close()
      serialPort = null
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('serial:write', async (event, data) => {
  try {
    if (!serialPort || !serialPort.isOpen) {
      return { success: false, error: 'Serial port not connected' }
    }
    serialPort.write(data)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// TCP/IP Communication (USB Ethernet Mode)
// ============================================

ipcMain.handle('tcp:connect', async (event, { host, port }) => {
  return new Promise((resolve) => {
    try {
      if (tcpClient) {
        tcpClient.destroy()
      }

      tcpClient = new net.Socket()
      
      tcpClient.setTimeout(5000)

      tcpClient.connect(port, host, () => {
        resolve({ success: true, message: `Connected to ${host}:${port}` })
      })

      tcpClient.on('data', (data) => {
        mainWindow.webContents.send('tcp:data', data.toString())
      })

      tcpClient.on('error', (err) => {
        mainWindow.webContents.send('tcp:error', err.message)
        resolve({ success: false, error: err.message })
      })

      tcpClient.on('timeout', () => {
        tcpClient.destroy()
        resolve({ success: false, error: 'Connection timeout' })
      })

      tcpClient.on('close', () => {
        mainWindow.webContents.send('tcp:disconnected')
      })
    } catch (error) {
      resolve({ success: false, error: error.message })
    }
  })
})

ipcMain.handle('tcp:disconnect', async () => {
  try {
    if (tcpClient) {
      tcpClient.destroy()
      tcpClient = null
    }
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('tcp:write', async (event, data) => {
  try {
    if (!tcpClient) {
      return { success: false, error: 'TCP not connected' }
    }
    tcpClient.write(data)
    return { success: true }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

// ============================================
// XR5000 ADI Protocol Commands
// ============================================

ipcMain.handle('xr5000:get-weight', async () => {
  return new Promise((resolve) => {
    if (!tcpClient) {
      resolve({ success: false, error: 'Not connected' })
      return
    }

    // ADI command to request weight
    tcpClient.write('SX\r\n')
    
    // Wait for response
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for weight' })
    }, 3000)

    const onData = (data) => {
      clearTimeout(timeout)
      tcpClient.removeListener('data', onData)
      
      // Parse ADI response
      const response = data.toString().trim()
      const weightMatch = response.match(/([+-]?\d+\.?\d*)\s*(kg|lb)?/i)
      
      if (weightMatch) {
        resolve({
          success: true,
          weight: parseFloat(weightMatch[1]),
          unit: weightMatch[2] || 'kg',
          raw: response,
          stable: !response.includes('M') && !response.includes('U'),
        })
      } else {
        resolve({ success: false, error: 'Invalid response', raw: response })
      }
    }

    tcpClient.once('data', onData)
  })
})

ipcMain.handle('xr5000:get-animal-id', async () => {
  return new Promise((resolve) => {
    if (!tcpClient) {
      resolve({ success: false, error: 'Not connected' })
      return
    }

    // ADI command to request EID
    tcpClient.write('SY\r\n')
    
    const timeout = setTimeout(() => {
      resolve({ success: false, error: 'Timeout waiting for animal ID' })
    }, 3000)

    const onData = (data) => {
      clearTimeout(timeout)
      tcpClient.removeListener('data', onData)
      
      const response = data.toString().trim()
      if (response && response.length > 0) {
        resolve({ success: true, animalId: response })
      } else {
        resolve({ success: false, error: 'No animal ID available' })
      }
    }

    tcpClient.once('data', onData)
  })
})

// Get app info
ipcMain.handle('app:info', () => {
  return {
    version: app.getVersion(),
    name: app.getName(),
    platform: process.platform,
  }
})
