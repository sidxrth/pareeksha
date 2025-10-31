const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
require('./server.js');

let win;

// 1. MODIFICATION: Remove the default application menu completely across all pages.
Menu.setApplicationMenu(null); 

const createWindow = () => {
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, 
            nodeIntegration: false,
        }
    });

    win.loadURL('http://localhost:3000');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    
    // 2. IPC MAIN LISTENER: Listens for the 'enter-fullscreen' channel
    ipcMain.on('enter-fullscreen', () => {
        if (win && !win.isFullScreen()) {
            win.setFullScreen(true);
            console.log('Main Process: Window set to full screen.');
        }
    });

    // 3. IPC MAIN LISTENER: Listens for the 'exit-fullscreen' channel
    ipcMain.on('exit-fullscreen', () => {
        if (win && win.isFullScreen()) {
            win.setFullScreen(false);
            console.log('Main Process: Window exited full screen.');
        }
    });

    // NEW: IPC MAIN LISTENER for debugging
    ipcMain.on('toggle-devtools', (event) => {
        const winFromEvent = BrowserWindow.fromWebContents(event.sender);
        if (winFromEvent) {
             winFromEvent.webContents.toggleDevTools();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});