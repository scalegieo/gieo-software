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
      showNotification: (title: string, body: string) => Promise<{ success: boolean; error?: string }>
      bootstrapOllama: () => Promise<{ ready: boolean; modelLoaded: boolean; warming: boolean }>
      getOllamaStatus: () => Promise<{ ready: boolean; modelLoaded: boolean }>
      ollamaChat: (messages: { role: string; content: string }[]) => Promise<{ content?: string; error?: string }>
      fetchLeadSheet: () => Promise<{ success: boolean; csv?: string; error?: string }>
    }
  }
}

export {}
