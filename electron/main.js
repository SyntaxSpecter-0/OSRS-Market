const { app, BrowserWindow, Notification } = require('electron');

// Point this at your deployed Next.js app (Vercel/Firebase Hosting URL).
// For local dev, run `npm run dev` in the main project and use localhost.
const APP_URL = process.env.LEDGER_APP_URL || 'https://your-deployed-app.example.com';

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: '#1b1712',
    webPreferences: {
      // The web app already handles its own FCM web-push registration via
      // its service worker, which works inside Electron's Chromium runtime
      // the same as a regular browser — no extra bridging code needed here.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Optional: a native fallback notification, useful if you ever want the
// desktop shell to show something outside of the web push pipeline
// (e.g. connectivity-loss warnings). Not required for the FCM alert flow.
function showNativeNotification(title, body) {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

module.exports = { showNativeNotification };
