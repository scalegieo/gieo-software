import { app, shell, BrowserWindow, ipcMain, dialog, Notification } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { homedir } from 'os'
import { bootstrapOllama, autoBootOllamaOnLaunch } from './ollama-bootstrap'
import { ollamaChat, getOllamaStatus, getOllamaAccount, ollamaParseLead, ollamaParseAgent, getOllamaUsage } from './ollama'
import { initOllamaLimits, preflightOllamaRequest, maybeResetMstDay, maybeResetSessionWindow, maybeResetWeeklyWindow } from './ollama-limits'
import { listStripeInvoices, createStripePaymentLink, getStripeStatus } from './stripe'
import {
  initCalendarStore,
  getCalendarStatus,
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  connectCalendly,
  disconnectCalendly,
  fetchCalendarEvents
} from './calendar'
import { GIEO_SECRETS } from './gieo-config'

const LEAD_SHEET_CSV_URL = GIEO_SECRETS.googleSheets.csvUrl

const isDev = !app.isPackaged

const GIEO_DATA_ROOT = join(homedir(), 'GIEO_Data')
const ACTIVE_DIR = join(GIEO_DATA_ROOT, 'Active')
const ARCHIVE_DIR = join(GIEO_DATA_ROOT, 'Archive')

function ensureGieoDirectories(): void {
  for (const dir of [GIEO_DATA_ROOT, ACTIVE_DIR, ARCHIVE_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

function resolveSafePath(relativePath: string): string {
  const normalized = join(GIEO_DATA_ROOT, relativePath)
  if (!normalized.startsWith(GIEO_DATA_ROOT)) {
    throw new Error('Invalid file path')
  }
  return normalized
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#09090b',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle('gieo:save-file', async (_event, data: string, relativePath: string) => {
    try {
      const fullPath = resolveSafePath(relativePath)
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(fullPath, data, 'utf-8')
      return { success: true, path: fullPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:save-binary-file', async (_event, base64: string, relativePath: string) => {
    try {
      const fullPath = resolveSafePath(relativePath)
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      writeFileSync(fullPath, Buffer.from(base64, 'base64'))
      return { success: true, path: fullPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:read-file', async (_event, relativePath: string) => {
    try {
      const fullPath = resolveSafePath(relativePath)
      if (!existsSync(fullPath)) return { success: false, error: 'File not found' }
      return { success: true, content: readFileSync(fullPath, 'utf-8'), path: fullPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:list-files', async (_event, subDir: 'Active' | 'Archive' = 'Active') => {
    try {
      const targetDir = subDir === 'Archive' ? ARCHIVE_DIR : ACTIVE_DIR
      if (!existsSync(targetDir)) return { success: true, files: [] as string[] }
      const files = readdirSync(targetDir).filter((f) => statSync(join(targetDir, f)).isFile())
      return { success: true, files }
    } catch (error) {
      return { success: false, error: (error as Error).message, files: [] }
    }
  })

  ipcMain.handle('gieo:get-data-paths', async () => ({
    root: GIEO_DATA_ROOT,
    active: ACTIVE_DIR,
    archive: ARCHIVE_DIR
  }))

  ipcMain.handle('gieo:pick-and-save-file', async (_event, clientSlug: string) => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true }
      }

      const sourcePath = result.filePaths[0]
      const fileName = sourcePath.split(/[/\\]/).pop() ?? 'document'
      const relativePath = join('Active', clientSlug, fileName)
      const fullPath = resolveSafePath(relativePath)
      const dir = join(fullPath, '..')
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

      writeFileSync(fullPath, readFileSync(sourcePath))
      return { success: true, path: fullPath, relativePath, fileName }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:archive-file', async (_event, relativePath: string) => {
    try {
      const sourcePath = resolveSafePath(relativePath)
      if (!existsSync(sourcePath)) return { success: false, error: 'File not found' }
      const fileName = sourcePath.split(/[/\\]/).pop() ?? 'file'
      const destPath = join(ARCHIVE_DIR, fileName)
      writeFileSync(destPath, readFileSync(sourcePath))
      return { success: true, path: destPath }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:show-notification', async (_event, title: string, body: string) => {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body }).show()
      }
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:ollama-bootstrap', async () => bootstrapOllama(true))

  ipcMain.handle('gieo:ollama-status', async () => getOllamaStatus())

  ipcMain.handle('gieo:ollama-account', async () => getOllamaAccount())

  ipcMain.handle('gieo:ollama-usage', async () => getOllamaUsage())

  ipcMain.handle(
    'gieo:ollama-preflight',
    async (_event, messages: { role: string; content: string }[], numPredict: number) =>
      preflightOllamaRequest({ messages, numPredict })
  )

  ipcMain.handle(
    'gieo:ollama-chat',
    async (_event, messages: { role: string; content: string }[]) => ollamaChat(messages)
  )

  ipcMain.handle('gieo:ollama-parse-lead', async (_event, userMessage: string) =>
    ollamaParseLead(userMessage)
  )

  ipcMain.handle(
    'gieo:ollama-parse-agent',
    async (_event, userMessage: string, platformContext?: string) =>
      ollamaParseAgent(userMessage, platformContext)
  )

  ipcMain.handle('gieo:fetch-lead-sheet', async () => {
    try {
      const res = await fetch(`${LEAD_SHEET_CSV_URL}&t=${Date.now()}`, {
        signal: AbortSignal.timeout(15000)
      })
      if (!res.ok) return { success: false, error: `Sheet fetch failed: ${res.status}` }
      const csv = await res.text()
      return { success: true, csv }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('gieo:stripe-status', async () => getStripeStatus())

  ipcMain.handle('gieo:stripe-list-invoices', async () => listStripeInvoices(30))

  ipcMain.handle(
    'gieo:stripe-create-payment-link',
    async (
      _event,
      input: { amountCents: number; clientName: string; clientEmail?: string }
    ) => createStripePaymentLink(input)
  )

  ipcMain.handle('gieo:calendar-status', async () => getCalendarStatus())

  ipcMain.handle('gieo:calendar-connect-google', async () => connectGoogleCalendar())

  ipcMain.handle('gieo:calendar-disconnect-google', async () => {
    disconnectGoogleCalendar()
    return { success: true }
  })

  ipcMain.handle('gieo:calendar-connect-calendly', async (_event, token: string) =>
    connectCalendly(token)
  )

  ipcMain.handle('gieo:calendar-disconnect-calendly', async () => {
    disconnectCalendly()
    return { success: true }
  })

  ipcMain.handle('gieo:calendar-events', async (_event, daysAhead?: number) =>
    fetchCalendarEvents(daysAhead ?? 14)
  )
}

app.whenReady().then(() => {
  ensureGieoDirectories()
  initOllamaLimits(app.getPath('userData'))
  initCalendarStore(app.getPath('userData'))
  setInterval(() => {
    maybeResetMstDay()
    maybeResetSessionWindow()
    maybeResetWeeklyWindow()
  }, 60_000)
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.gieo.crm')
  }
  registerIpcHandlers()
  autoBootOllamaOnLaunch()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
    autoBootOllamaOnLaunch()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
