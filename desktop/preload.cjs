// What the desktop game offers the page (U-104): its songs folder and its maps folder (Documents/Chongqing 2038).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  songs: () => ipcRenderer.invoke('songs'),
  /** open the songs or maps folder in the file manager */
  folder: which => ipcRenderer.invoke('folder', which),
  maps: {
    list: () => ipcRenderer.invoke('maps:list'),
    read: name => ipcRenderer.invoke('maps:read', name),
    write: (name, text) => ipcRenderer.invoke('maps:write', name, text),
    remove: name => ipcRenderer.invoke('maps:remove', name),
  },
});
