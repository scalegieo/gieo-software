import { useState, useEffect, useCallback, useRef } from 'react'

export type OllamaBootPhase =
  | 'idle'
  | 'starting_server'
  | 'pulling_chat_model'
  | 'pulling_agent_model'
  | 'warming'
  | 'ready'
  | 'error'

export interface OllamaBootStatus {
  phase: OllamaBootPhase
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

const DEFAULT: OllamaBootStatus = {
  phase: 'starting_server',
  message: 'Connecting to Ollama Cloud…',
  ready: false,
  modelLoaded: false,
  chatModelLoaded: false,
  agentModelLoaded: false,
  warming: true
}

/** Runs on every app open — keeps Ollama booting until ready */
export function useOllamaBoot(active = true): OllamaBootStatus {
  const [status, setStatus] = useState<OllamaBootStatus>(DEFAULT)
  const bootStarted = useRef(false)

  const refresh = useCallback(async () => {
    if (!window.gieo?.getOllamaStatus) return
    const snap = await window.gieo.getOllamaStatus()
    if (snap) setStatus(snap as OllamaBootStatus)
  }, [])

  const startBoot = useCallback(async () => {
    if (!window.gieo?.bootstrapOllama) return
    await window.gieo.bootstrapOllama()
    await refresh()
  }, [refresh])

  useEffect(() => {
    if (bootStarted.current) return
    bootStarted.current = true
    void startBoot()
  }, [startBoot])

  useEffect(() => {
    if (!active) return
    void refresh()
    const ms = status.ready ? 8000 : status.phase === 'error' ? 5000 : 1500
    const interval = setInterval(() => {
      void refresh()
      if (!status.ready && status.phase === 'error') {
        void startBoot()
      }
    }, ms)
    return () => clearInterval(interval)
  }, [active, refresh, startBoot, status.ready, status.phase])

  return status
}

export function ollamaStatusLabel(status: OllamaBootStatus): string {
  if (status.ready) {
    if (status.agentModelLoaded) return 'FRIDAY ready'
    return 'Chat ready'
  }
  if (status.phase === 'error') return status.message.slice(0, 36)
  return status.message || 'Booting Ollama…'
}
