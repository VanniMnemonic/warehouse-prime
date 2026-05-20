// Plain JavaScript on purpose: Electron loads this file in a separate
// preload context BEFORE the renderer script runs, and that loader does
// not go through ts-node. Keeping it .js avoids a compile-step dance for
// the dev workflow; the production build copies this file as-is into
// dist-electron/ (see the `build:electron` npm script).
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  getFilePath: (file) => webUtils.getPathForFile(file),
});
