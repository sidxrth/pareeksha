// main.js

// Import server.js as a module, but do not execute logic prematurely
require('./server.js'); 

const { app, BrowserWindow, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');

let win;

// 1. MODIFICATION: Remove the default application menu completely across all pages.
Menu.setApplicationMenu(null); 

const createWindow = () => {
    // Add minimizable/resizable: false to enforce window stability
    win = new BrowserWindow({
        width: 1000,
        height: 800,
        minimizable: false,
        maximizable: false,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true, 
            nodeIntegration: false,
        }
    });

    // The window attempts to load the URL immediately.
    win.loadURL('http://localhost:3000');
    
    // NEW: Disable right-click menu for security
    win.webContents.on('context-menu', (e) => {
        e.preventDefault();
    });
};

app.whenReady().then(() => {
    // We create the window only AFTER the app is ready.
    createWindow();

    // ... (rest of globalShortcut, activate, and IPC handlers) ...
    globalShortcut.register('F12', () => {
        console.log('Main Process: F12 blocked globally.');
    });

    // NEW: Block Ctrl+R / Cmd+R (Reload)
    globalShortcut.register('CommandOrControl+R', () => {
        console.log('Main Process: Reload blocked globally.');
    });

    // NEW: Block Ctrl+W / Cmd+W (Close Window)
    globalShortcut.register('CommandOrControl+W', () => {
        console.log('Main Process: Close Window blocked globally.');
    });


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

    // NEW CRITICAL IPC LISTENER: Forces the Electron app to quit (for malpractice)
    ipcMain.on('force-quit', () => {
        console.log('Main Process: Received force-quit signal. Terminating application.');
        if (win) {
             win.close(); // Cleanly close the window
        }
        app.quit();
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