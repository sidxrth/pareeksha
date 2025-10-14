// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
require('./server.js'); // This line starts your backend server

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        }
    });

    // THIS IS THE MOST IMPORTANT CHANGE:
    // Load the app from the local web server instead of the filesystem.
    win.loadURL('http://localhost:3000');
};

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});