const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // IPC calls for Fullscreen/Proctoring
    enterFullScreen: () => ipcRenderer.send('enter-fullscreen'),
    exitFullScreen: () => ipcRenderer.send('exit-fullscreen'),
    
    // NEW IPC CALL: Force quit the entire application
    forceQuit: () => ipcRenderer.send('force-quit'),

    // DEVTOOLS Access via IPC
    toggleDevTools: () => ipcRenderer.send('toggle-devtools') 
});