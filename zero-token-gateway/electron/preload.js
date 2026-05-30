const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getServerPort: () => ipcRenderer.invoke('get-server-port'),
  openLoginWindow: (providerId) => ipcRenderer.invoke('open-login-window', providerId),
  captureCredentials: (providerId) => ipcRenderer.invoke('capture-credentials', providerId),
  refreshCredentials: (providerId) => ipcRenderer.invoke('refresh-credentials', providerId),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onCredentialsUpdated: (callback) => {
    ipcRenderer.on('credentials-updated', (event, data) => callback(data));
  },
});
