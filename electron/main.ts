import { app, globalShortcut } from 'electron';
app.whenReady().then(() => {
  globalShortcut.register('CommandOrControl+Shift+C', () => console.log('CorvusX Summoned'));
});
