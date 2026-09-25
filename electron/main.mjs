import { app, BrowserWindow, shell } from 'electron'
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const isDevelopment = !app.isPackaged
let logFile

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`
  console.error(line.trim())
  if (!logFile) return
  try {
    appendFileSync(logFile, line)
  } catch {}
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDevelopment) {
    log('Loading development URL: http://127.0.0.1:5173')
    window.loadURL('http://127.0.0.1:5173').catch((error) => log(`Development load failed: ${error.message}`))
    window.webContents.openDevTools()
  } else {
    const entryPoint = join(__dirname, '..', 'dist', 'index.html')
    log(`Loading production file: ${entryPoint}`)
    window.loadFile(entryPoint).catch((error) => log(`Production load failed: ${error.message}`))
  }

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log(`[renderer] failed to load ${validatedURL}: ${errorCode} ${errorDescription}`)
  })
  window.webContents.on('console-message', (_event, details) => {
    log(`[renderer:${details.level}] ${details.message} (${details.sourceId}:${details.line})`)
  })
  window.webContents.on('render-process-gone', (_event, details) => {
    log(`[renderer] process exited: ${details.reason} (code ${details.exitCode})`)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  const logDirectory = app.getPath('logs')
  mkdirSync(logDirectory, { recursive: true })
  logFile = join(logDirectory, 'main.log')
  log(`Application started. packaged=${app.isPackaged}`)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})