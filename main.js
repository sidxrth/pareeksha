const { app, BrowserWindow, ipcMain, Menu } = require('electron'); // CORRECTED: Added Menu
const path = require('path');
require('./server.js');

let win; // Make 'win' globally accessible in main.js

// 1. MODIFICATION: Remove the default application menu completely across all pages.
Menu.setApplicationMenu(null); 

const createWindow = () => {
    win = new BrowserWindow({ // Assign to the global 'win'
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // CRITICAL: Enable contextIsolation and nodeIntegration for security
            contextIsolation: true, 
            nodeIntegration: false,
        }
    });

    // Load the app from the local web server
    win.loadURL('http://localhost:3000');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
    
    // 2. IPC MAIN LISTENER: Listens for the 'enter-fullscreen' channel from renderer (c_exam.html)
    ipcMain.on('enter-fullscreen', () => {
        if (win && !win.isFullScreen()) {
            win.setFullScreen(true);
            console.log('Main Process: Window set to full screen.');
        }
    });

    // 3. IPC MAIN LISTENER: Listens for the 'exit-fullscreen' channel (e.g., when exam is finished)
    ipcMain.on('exit-fullscreen', () => {
        if (win && win.isFullScreen()) {
            win.setFullScreen(false);
            console.log('Main Process: Window exited full screen.');
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});