import { spawn } from 'child_process'

const OLLAMA_HOST = 'http://127.0.0.1:11434'
const OLLAMA_MODEL = 'llama3.2'

let bootstrapStarted = false

async function pingOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

function startOllamaServe(): void {
  try {
    const child = spawn('ollama', ['serve'], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' }
    })
    child.unref()
  } catch (err) {
    console.error('[GIEO] Failed to start ollama serve:', err)
  }
}

async function waitForOllama(maxMs = 15000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    if (await pingOllama()) return true
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function modelIsReady(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`)
    if (!res.ok) return false
    const data = (await res.json()) as { models?: { name: string }[] }
    return (data.models ?? []).some((m) => m.name === OLLAMA_MODEL || m.name.startsWith(`${OLLAMA_MODEL}:`))
  } catch {
    return false
  }
}

function pullModelBackground(): void {
  try {
    const pull = spawn('ollama', ['pull', OLLAMA_MODEL], { detached: true, stdio: 'ignore' })
    pull.unref()
  } catch (err) {
    console.error('[GIEO] Failed to pull model:', err)
  }
}

/** Pre-load model into memory for fast first response */
async function warmModel(): Promise<void> {
  try {
    await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: 'ready',
        stream: false,
        options: { num_predict: 1, temperature: 0 }
      }),
      signal: AbortSignal.timeout(120000)
    })
  } catch {
    // warm-up is best-effort
  }
}

export async function bootstrapOllama(): Promise<{ ready: boolean; modelLoaded: boolean; warming: boolean }> {
  if (bootstrapStarted) {
    const ready = await pingOllama()
    return { ready, modelLoaded: ready && (await modelIsReady()), warming: false }
  }
  bootstrapStarted = true

  let ready = await pingOllama()
  if (!ready) {
    startOllamaServe()
    ready = await waitForOllama()
  }

  if (!ready) {
    return { ready: false, modelLoaded: false, warming: false }
  }

  let modelLoaded = await modelIsReady()
  if (!modelLoaded) {
    pullModelBackground()
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      modelLoaded = await modelIsReady()
      if (modelLoaded) break
    }
  }

  if (modelLoaded) {
    void warmModel()
  }

  return { ready, modelLoaded, warming: modelLoaded }
}

export async function ollamaChat(
  messages: { role: string; content: string }[]
): Promise<{ content?: string; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        stream: false,
        options: {
          num_predict: 400,
          temperature: 0.2,
          num_ctx: 8192,
          top_p: 0.9
        }
      }),
      signal: AbortSignal.timeout(90000)
    })

    if (!res.ok) {
      return { error: `Ollama ${res.status}: ${await res.text()}` }
    }

    const data = (await res.json()) as { message?: { content?: string } }
    const content = data.message?.content?.trim()
    if (!content) return { error: 'Empty response from Ollama' }
    return { content }
  } catch (err) {
    return { error: (err as Error).message }
  }
}

export async function getOllamaStatus(): Promise<{ ready: boolean; modelLoaded: boolean }> {
  const ready = await pingOllama()
  const modelLoaded = ready && (await modelIsReady())
  return { ready, modelLoaded }
}

export { OLLAMA_HOST, OLLAMA_MODEL }
