// The desktop game (U-104): the built web game in its own window, served from app://, uncapped by the screen's refresh,
// keeping its songs/ and maps/ folders in Documents/Chongqing 2038 (where an update never touches them), and updating
// itself from the GitHub Releases on start (the new version installs when the game is closed).
const { app, BrowserWindow, Menu, protocol, net, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

app.commandLine.appendSwitch('disable-frame-rate-limit');
app.commandLine.appendSwitch('disable-gpu-vsync');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

const web = path.join(__dirname, 'web');
const home = path.join(app.getPath('documents'), 'Chongqing 2038');
const dirs = { songs: path.join(home, 'songs'), maps: path.join(home, 'maps') };
const SONG = /\.(mp3|ogg|wav|m4a|flac|opus)$/i, MAP = /^[\w .-]+\.json$/;

app.whenReady().then(() => {
  for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });
  // app://game/... is the game; app://game/songs/<file> a song from the songs folder (the game's own origin, so its
  // sound can go through the game's volume).
  protocol.handle('app', req => {
    const u = new URL(req.url), song = u.pathname.startsWith('/songs/'), base = song ? dirs.songs : web;
    const p = path.normalize(path.join(base, decodeURIComponent(song ? u.pathname.slice(6) : u.pathname)));
    if (!p.startsWith(base)) return new Response('', { status: 403 });
    const there = fs.existsSync(p) && fs.statSync(p).isFile();
    if (song && !there) return new Response('', { status: 404 });
    return net.fetch(pathToFileURL(there ? p : path.join(web, 'index.html')).toString());
  });
  ipcMain.handle('songs', () => fs.readdirSync(dirs.songs).filter(f => SONG.test(f)));
  ipcMain.handle('folder', (_e, which) => { if (dirs[which]) shell.openPath(dirs[which]); });
  ipcMain.handle('maps:list', () => fs.readdirSync(dirs.maps).filter(f => MAP.test(f)));
  ipcMain.handle('maps:read', (_e, name) => (MAP.test(name) ? fs.readFileSync(path.join(dirs.maps, name), 'utf8') : null));
  ipcMain.handle('maps:write', (_e, name, text) => { if (MAP.test(name)) fs.writeFileSync(path.join(dirs.maps, name), text); });
  ipcMain.handle('maps:remove', (_e, name) => { if (MAP.test(name)) fs.rmSync(path.join(dirs.maps, name), { force: true }); });

  // (No menu: Ctrl+W is crouching forward here, never closing the window. F11 for fullscreen.)
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({ width: 1600, height: 900, backgroundColor: '#07080a', title: 'Chongqing 2038', icon: path.join(web, 'icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs') } });
  win.maximize();
  win.webContents.on('before-input-event', (e, i) => { if (i.type === 'keyDown' && i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.loadURL('app://game/index.html');
  if (app.isPackaged) require('electron-updater').autoUpdater.checkForUpdatesAndNotify().catch(() => {});
});
app.on('window-all-closed', () => app.quit());
