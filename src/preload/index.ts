import { contextBridge, ipcRenderer } from 'electron'
import { join } from 'path'

export interface GieoFileResult {
  success: boolean
  path?: string
  relativePath?: string
  fileName?: string
  content?: string
  error?: string
  canceled?: boolean
  files?: string[]
}

export interface GieoDataPaths {
  root: string
  active: string
  archive: string
}

const gieoApi = {
  path: {
    join: (...segments: string[]) => join(...segments),
    basename: (p: string) => p.split(/[/\\]/).pop() ?? p
  },
  saveFileToLocalSSD: (data: string, filePath: string): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:save-file', data, filePath),
  saveBinaryFileToLocalSSD: (base64: string, filePath: string): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:save-binary-file', base64, filePath),
  readFileFromSSD: (filePath: string): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:read-file', filePath),
  listLocalFiles: (subDir: 'Active' | 'Archive' = 'Active'): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:list-files', subDir),
  getDataPaths: (): Promise<GieoDataPaths> => ipcRenderer.invoke('gieo:get-data-paths'),
  pickAndSaveFile: (clientSlug: string): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:pick-and-save-file', clientSlug),
  archiveFile: (relativePath: string): Promise<GieoFileResult> =>
    ipcRenderer.invoke('gieo:archive-file', relativePath),
  showNotification: (title: string, body: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('gieo:show-notification', title, body),
  bootstrapOllama: (): Promise<{
    phase: string
    message: string
    ready: boolean
    modelLoaded: boolean
    chatModelLoaded: boolean
    agentModelLoaded: boolean
    warming: boolean
    mode?: 'cloud' | 'local'
    model?: string
    error?: string
  }> => ipcRenderer.invoke('gieo:ollama-bootstrap'),
  getOllamaStatus: (): Promise<{
    phase: string
    message: string
    ready: boolean
    modelLoaded: boolean
    chatModelLoaded: boolean
    agentModelLoaded: boolean
    warming: boolean
    mode?: 'cloud' | 'local'
    model?: string
    error?: string
  }> => ipcRenderer.invoke('gieo:ollama-status'),
  getOllamaAccount: (): Promise<{ plan: string; email: string; name: string } | null> =>
    ipcRenderer.invoke('gieo:ollama-account'),
  getOllamaUsage: (): Promise<{
    dailyTokenCount: number
    dailyTokenLimit: number
    chatTokenCount: number
    agentTokenCount: number
    remaining: number
    remainingPercent: number
    usedPercent: number
    isLimitReached: boolean
    usageDateMst: string
    resetAtMst: string
    resetAtSession: string
    resetAtWeekly: string
    warningLevel: 'ok' | 'low' | 'critical' | 'blocked'
    requestsInLastMinute: number
  }> => ipcRenderer.invoke('gieo:ollama-usage'),
  ollamaChat: (
    messages: { role: string; content: string }[]
  ): Promise<{
    content?: string
    error?: string
    errorCode?: string
    usage?: { promptTokens: number; evalTokens: number; totalTokens: number }
    usageState?: {
      dailyTokenCount: number
      dailyTokenLimit: number
      chatTokenCount: number
      agentTokenCount: number
      remaining: number
      isLimitReached: boolean
      resetAtMst: string
      warningLevel: 'ok' | 'low' | 'critical' | 'blocked'
    }
    compressed?: boolean
    compressionNotice?: string
  }> => ipcRenderer.invoke('gieo:ollama-chat', messages),
  ollamaParseLead: (
    userMessage: string
  ): Promise<{
    content?: string
    error?: string
    usage?: { promptTokens: number; evalTokens: number; totalTokens: number }
  }> => ipcRenderer.invoke('gieo:ollama-parse-lead', userMessage),
  ollamaParseAgent: (
    userMessage: string,
    platformContext?: string
  ): Promise<{
    content?: string
    error?: string
    errorCode?: string
    usage?: { promptTokens: number; evalTokens: number; totalTokens: number }
    usageState?: {
      dailyTokenCount: number
      dailyTokenLimit: number
      chatTokenCount: number
      agentTokenCount: number
      remaining: number
      isLimitReached: boolean
      resetAtMst: string
      warningLevel: 'ok' | 'low' | 'critical' | 'blocked'
    }
  }> => ipcRenderer.invoke('gieo:ollama-parse-agent', userMessage, platformContext),
  fetchLeadSheet: (): Promise<{ success: boolean; csv?: string; error?: string }> =>
    ipcRenderer.invoke('gieo:fetch-lead-sheet'),
  getStripeStatus: (): Promise<{ configured: boolean }> => ipcRenderer.invoke('gieo:stripe-status'),
  listStripeInvoices: (): Promise<{
    invoices?: {
      id: string
      customer_email: string | null
      customer_name: string | null
      amount_due: number
      amount_paid: number
      status: string | null
      hosted_invoice_url: string | null
      created: number
    }[]
    error?: string
  }> => ipcRenderer.invoke('gieo:stripe-list-invoices'),
      createStripePaymentLink: (input: {
    amountCents: number
    clientName: string
    clientEmail?: string
  }): Promise<{ url?: string; error?: string }> =>
    ipcRenderer.invoke('gieo:stripe-create-payment-link', input),
  getCalendarStatus: (): Promise<{
    google: { connected: boolean; email?: string; configured: boolean; error?: string }
    calendly: { connected: boolean; email?: string; name?: string; error?: string }
  }> => ipcRenderer.invoke('gieo:calendar-status'),
  connectGoogleCalendar: (): Promise<{ success: boolean; error?: string; email?: string }> =>
    ipcRenderer.invoke('gieo:calendar-connect-google'),
  disconnectGoogleCalendar: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('gieo:calendar-disconnect-google'),
  connectCalendly: (token: string): Promise<{ success: boolean; error?: string; email?: string }> =>
    ipcRenderer.invoke('gieo:calendar-connect-calendly', token),
  disconnectCalendly: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('gieo:calendar-disconnect-calendly'),
  fetchCalendarEvents: (
    daysAhead?: number
  ): Promise<{
    events: {
      id: string
      source: 'google' | 'calendly'
      title: string
      start: string
      end: string
      location?: string
      attendees?: string
      htmlLink?: string
      status?: string
    }[]
    error?: string
  }> => ipcRenderer.invoke('gieo:calendar-events', daysAhead)
}

contextBridge.exposeInMainWorld('gieo', gieoApi)
