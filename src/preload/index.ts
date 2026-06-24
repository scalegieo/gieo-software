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
  bootstrapOllama: (): Promise<{ ready: boolean; modelLoaded: boolean; warming: boolean }> =>
    ipcRenderer.invoke('gieo:ollama-bootstrap'),
  getOllamaStatus: (): Promise<{ ready: boolean; modelLoaded: boolean }> =>
    ipcRenderer.invoke('gieo:ollama-status'),
  ollamaChat: (messages: { role: string; content: string }[]): Promise<{ content?: string; error?: string }> =>
    ipcRenderer.invoke('gieo:ollama-chat', messages),
  fetchLeadSheet: (): Promise<{ success: boolean; csv?: string; error?: string }> =>
    ipcRenderer.invoke('gieo:fetch-lead-sheet')
}

contextBridge.exposeInMainWorld('gieo', gieoApi)
