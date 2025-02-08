// preload.js (Modified to expose showInfoMessage)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getSettings: () => ipcRenderer.invoke('get-settings'),
    saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
    loadChannels: () => ipcRenderer.invoke('load-channels'),
    getChannelSources: () => ipcRenderer.invoke('get-channel-sources'),
    showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
    playInVlc: (aceId) => ipcRenderer.invoke('play-in-vlc', aceId),
    closeSettingsDialog: () => ipcRenderer.send('close-settings-dialog'),
    showSettingsDialog: () => ipcRenderer.invoke('show-settings-dialog'),
    onUpdateChannels: (callback) => ipcRenderer.on('update-channels', (_event, value) => callback(value)),
    showAddSourceDialog: () => ipcRenderer.invoke('show-add-source-dialog'),
    addSourceData: (data) => ipcRenderer.send('add-source-data', data),
    cancelAddSource: () => ipcRenderer.send('cancel-add-source'),
    deleteChannelSource: (url) => ipcRenderer.invoke('delete-channel-source', url),
    showInfoMessage: () => ipcRenderer.invoke('show-info-message')
});