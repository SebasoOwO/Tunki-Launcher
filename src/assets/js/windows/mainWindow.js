/**
 * @author Luuxis
 * Luuxis License v1.0 (voir fichier LICENSE pour les détails en FR/EN)
 */

const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const path = require("path");
const os = require("os");
const pkg = require("../../../../package.json");

// ========== Discord RPC ==========
const RPC = require("discord-rpc");
const clientId = "1435373934194458666"; // Tu ID de Discord App
const rpc = new RPC.Client({ transport: "ipc" });
let startTimestamp = new Date();

function setActivity(details, state) {
  rpc.setActivity({
    details: details,
    state: state,
    largeImageKey: "launcher_tunki_logo", // tu imagen en Discord Dev Portal
    largeImageText: "Tunki Launcher",
    startTimestamp,
    instance: false
  });
}

RPC.register(clientId);
rpc.on("ready", () => {
  setActivity("En el panel principal", "By Sebasowo");
});
rpc.login({ clientId }).catch(console.error);

// ========== Ventana principal ==========
let dev = process.env.DEV_TOOL === 'open';
let mainWindow = undefined;

function getWindow() {
  return mainWindow;
}

function destroyWindow() {
  if (!mainWindow) return;
  app.quit();
  mainWindow = undefined;
}

function createWindow() {
  destroyWindow();
  mainWindow = new BrowserWindow({
    title: pkg.productname || "Tunki Launcher",
    width: 1280,
    height: 720,
    minWidth: 980,
    minHeight: 552,
    resizable: true,
    icon: `./src/assets/images/icon.${os.platform() === "win32" ? "ico" : "png"}`,
    frame: false,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(`${app.getAppPath()}/src/launcher.html`));

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      if (dev) mainWindow.webContents.openDevTools({ mode: 'detach' });
      mainWindow.show();
    }
  });

  // Escucha eventos del renderer (instancia iniciada/cerrada)
  ipcMain.on("update-rpc", (event, instanceName) => {
    if (instanceName) {
      setActivity(`Jugando: ${instanceName}`, "By Sebasowo");
    } else {
      setActivity("En el panel principal", "By Sebasowo");
    }
  });
}

module.exports = {
  getWindow,
  createWindow,
  destroyWindow,
};
