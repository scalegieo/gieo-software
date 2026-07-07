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

export type OllamaUsageState = {
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
}

export type OllamaBootStatus = {
  phase: 'idle' | 'starting_server' | 'pulling_chat_model' | 'pulling_agent_model' | 'warming' | 'ready' | 'error'
  message: string
  ready: boolean
  modelLoaded: boolean
  chatModelLoaded: boolean
  agentModelLoaded: boolean
  warming: boolean
  mode?: 'cloud' | 'local'
  model?: string
  error?: string
}

export type OllamaChatResponse = {
  content?: string
  error?: string
  errorCode?: string
  mode?: 'cloud' | 'local'
  model?: string
  usage?: { promptTokens: number; evalTokens: number; totalTokens: number }
  usageState?: OllamaUsageState
  compressed?: boolean
  compressionNotice?: string
  throttled?: boolean
}

declare global {
  interface Window {
    gieo: {
      path: {
        join: (...segments: string[]) => string
        basename: (p: string) => string
      }
      saveFileToLocalSSD: (data: string, filePath: string) => Promise<GieoFileResult>
      saveBinaryFileToLocalSSD: (base64: string, filePath: string) => Promise<GieoFileResult>
      readFileFromSSD: (filePath: string) => Promise<GieoFileResult>
      listLocalFiles: (subDir?: 'Active' | 'Archive') => Promise<GieoFileResult>
      getDataPaths: () => Promise<GieoDataPaths>
      pickAndSaveFile: (clientSlug: string) => Promise<GieoFileResult>
      archiveFile: (relativePath: string) => Promise<GieoFileResult>
      showNotification: (title: string, body: string) => Promise<{ success: boolean; error?: string; skipped?: boolean }>
      getNotificationPermission: () => Promise<{
        permission: 'granted' | 'denied' | 'not-determined' | 'unsupported'
        supported: boolean
      }>
      requestNotificationPermission: () => Promise<{
        permission: 'granted' | 'denied' | 'not-determined' | 'unsupported'
      }>
      openNotificationSettings: () => Promise<{ success: boolean }>
      bootstrapOllama: () => Promise<OllamaBootStatus>
      getOllamaStatus: () => Promise<OllamaBootStatus>
      getOllamaAccount: () => Promise<{ plan: string; email: string; name: string } | null>
      getOllamaUsage: () => Promise<OllamaUsageState>
      ollamaChat: (messages: { role: string; content: string }[]) => Promise<OllamaChatResponse>
      ollamaParseLead: (userMessage: string) => Promise<OllamaChatResponse>
      ollamaParseAgent: (userMessage: string, platformContext?: string) => Promise<OllamaChatResponse>
      fetchLeadSheet: () => Promise<{ success: boolean; csv?: string; error?: string }>
      getStripeStatus: () => Promise<{ configured: boolean }>
      listStripeInvoices: () => Promise<{
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
      }>
      createStripePaymentLink: (input: {
        amountCents: number
        clientName: string
        clientEmail?: string
      }) => Promise<{ url?: string; error?: string }>
      getCalendarStatus: () => Promise<{
        google: { connected: boolean; email?: string; configured: boolean; error?: string }
        calendly: { connected: boolean; email?: string; name?: string; error?: string }
      }>
      connectGoogleCalendar: () => Promise<{ success: boolean; error?: string; email?: string }>
      disconnectGoogleCalendar: () => Promise<{ success: boolean }>
      connectCalendly: (token: string) => Promise<{ success: boolean; error?: string; email?: string }>
      disconnectCalendly: () => Promise<{ success: boolean }>
      fetchCalendarEvents: (daysAhead?: number) => Promise<{
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
      }>
    }
  }
}

export {}
