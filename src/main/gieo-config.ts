/** All GIEO API keys — hardcoded for team zip distribution */
export const GIEO_SECRETS = {
  supabase: {
    url: 'https://sejsnszddrpnaveanjha.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlanNuc3pkZHJwbmF2ZWFuamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTcwOTAsImV4cCI6MjA5Nzg5MzA5MH0.dNGxXAuB6TTzypFLSPSBNqD_AaYFd7es8qz40crhfxo'
  },
  ollama: {
    localHost: 'http://127.0.0.1:11434',
    cloudHost: 'https://ollama.com',
    /** Level-1 Ollama Free Cloud — lightest models, max free quota */
    chatModel: 'gemma4:31b',
    chatModelFallback: 'gpt-oss:20b',
    /** Same tier — efficient JSON, no paid models */
    agentModel: 'gemma4:31b',
    apiKeys: [
      '7f0149ab125c4275bbe1d37baf0d0cc5.gNfE6fFSyXHC4XN2GmutbqaU',
      'a227375d6292461aaf09f00fc71d969a.L78OQZaDCqNET59c'
    ],
    freeTier: {
      dailyTokenCap: 150_000,
      contextWindowMax: 8192,
      maxRequestsPerMinute: 8
    },
    proUpgradeUrl: 'https://ollama.com/pricing'
  },
  stripe: {
    secretKey: 'sk_test_REPLACE_WITH_YOUR_STRIPE_SECRET_KEY'
  },
  googleSheets: {
    csvUrl:
      'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/export?format=csv'
  },
  /** Google Cloud Console → OAuth 2.0 Desktop client */
  googleCalendar: {
    clientId: 'REPLACE_WITH_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com',
    clientSecret: 'REPLACE_WITH_GOOGLE_OAUTH_CLIENT_SECRET'
  }
} as const
