import { contextBridge, ipcRenderer } from "electron";

// Expose a safe, typed API to the renderer process
contextBridge.exposeInMainWorld("electronAPI", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Platform info
  platform: process.platform,
});

// Type declaration for the renderer
export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  platform: NodeJS.Platform;
}
