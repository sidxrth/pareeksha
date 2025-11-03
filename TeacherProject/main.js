const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      // Allows modules from the Node.js environment (like 'path') in the renderer process
      nodeIntegration: true, 
      // Context isolation is set to false for maximum compatibility with existing web scripts
      contextIsolation: false, 
      // Allows loading local files
      webSecurity: false 
    }
  });

  // Load the web app entry file: index.html
  // Since main.js and index.html are now in the same folder, the path simplifies
  const entryFile = path.join(__dirname, 'index.html');
  mainWindow.loadFile(entryFile);

  // Optional: Open the DevTools on start for debugging
  // mainWindow.webContents.openDevTools();
}

// Setup default menu (adds helpful debugging tools)
const template = [
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' }, // Crucial for debugging renderer process
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  }
];
const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

// Electron lifecycle management
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // Re-create a window on macOS when the dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});