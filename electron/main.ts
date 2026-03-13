import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";

// Dist paths set by vite-plugin-electron
process.env.DIST = path.join(__dirname, "../dist");
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let mainWindow: BrowserWindow | null = null;

// Dev server URL injected by vite-plugin-electron
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 680,
    title: "D&D Character Sheet",
    icon: path.join(process.env.VITE_PUBLIC!, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Open DevTools in development
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(process.env.DIST!, "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ────────────────────────────────────────────────

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ── IPC handlers ─────────────────────────────────────────────────
// Example: expose the app version to the renderer

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});
