/** Hardcoded for team distribution — mirrors src/main/gieo-config.ts */
export const CONFIG = {
  supabase: {
    url: 'https://sejsnszddrpnaveanjha.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlanNuc3pkZHJwbmF2ZWFuamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTcwOTAsImV4cCI6MjA5Nzg5MzA5MH0.dNGxXAuB6TTzypFLSPSBNqD_AaYFd7es8qz40crhfxo'
  },
  ollama: {
    localHost: 'http://127.0.0.1:11434',
    cloudHost: 'https://ollama.com',
    chatModel: 'ministral-3:3b',
    chatModelFallback: 'gemma3:4b',
    agentModel: 'gemma3:4b',
    apiKey: '7f0149ab125c4275bbe1d37baf0d0cc5.gNfE6fFSyXHC4XN2GmutbqaU',
    freeTier: {
      dailyTokenCap: 50_000,
      contextWindowMax: 8192,
      maxRequestsPerMinute: 8
    },
    proUpgradeUrl: 'https://ollama.com/pricing'
  },
  googleSheets: {
    sheetId: '17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E',
    editUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/edit?usp=sharing',
    embedUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/htmlembed?widget=true&headers=true',
    csvUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/export?format=csv'
  },
  stripe: {
    secretKey: 'sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY',
    configured: false
  }
} as const
