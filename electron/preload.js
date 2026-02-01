const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Serial Port (USB Legacy Mode)
  serial: {
    listPorts: () => ipcRenderer.invoke('serial:list-ports'),
    connect: (options) => ipcRenderer.invoke('serial:connect', options),
    disconnect: () => ipcRenderer.invoke('serial:disconnect'),
    write: (data) => ipcRenderer.invoke('serial:write', data),
    onData: (callback) => {
      ipcRenderer.on('serial:data', (event, data) => callback(data))
    },
    onError: (callback) => {
      ipcRenderer.on('serial:error', (event, error) => callback(error))
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('serial:data')
      ipcRenderer.removeAllListeners('serial:error')
    },
  },

  // TCP/IP (USB Ethernet Mode)
  tcp: {
    connect: (options) => ipcRenderer.invoke('tcp:connect', options),
    disconnect: () => ipcRenderer.invoke('tcp:disconnect'),
    write: (data) => ipcRenderer.invoke('tcp:write', data),
    onData: (callback) => {
      ipcRenderer.on('tcp:data', (event, data) => callback(data))
    },
    onError: (callback) => {
      ipcRenderer.on('tcp:error', (event, error) => callback(error))
    },
    onDisconnected: (callback) => {
      ipcRenderer.on('tcp:disconnected', () => callback())
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('tcp:data')
      ipcRenderer.removeAllListeners('tcp:error')
      ipcRenderer.removeAllListeners('tcp:disconnected')
    },
  },

  // XR5000 specific commands
  xr5000: {
    getWeight: () => ipcRenderer.invoke('xr5000:get-weight'),
    getAnimalId: () => ipcRenderer.invoke('xr5000:get-animal-id'),
  },

  // App info
  app: {
    getInfo: () => ipcRenderer.invoke('app:info'),
  },

  // Check if running in Electron
  isElectron: true,
})
