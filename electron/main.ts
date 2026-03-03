import { app, BrowserWindow } from 'electron';
let win: BrowserWindow | null = null;
app.whenReady().then(() => {
  win = new BrowserWindow();
  win.on('closed', () => { win = null; });
});
