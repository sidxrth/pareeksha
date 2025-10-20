const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // A function to send a message to the main process to enter full-screen
    enterFullScreen: () => ipcRenderer.send('enter-fullscreen'),
    // A function to send a message to the main process to exit full-screen
    exitFullScreen: () => ipcRenderer.send('exit-fullscreen')
});