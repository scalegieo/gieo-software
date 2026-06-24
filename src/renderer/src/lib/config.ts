/** Hardcoded for local testing on personal rig */
export const CONFIG = {
  supabase: {
    url: 'https://sejsnszddrpnaveanjha.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlanNuc3pkZHJwbmF2ZWFuamhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTcwOTAsImV4cCI6MjA5Nzg5MzA5MH0.dNGxXAuB6TTzypFLSPSBNqD_AaYFd7es8qz40crhfxo'
  },
  ollama: {
    host: 'http://127.0.0.1:11434',
    model: 'llama3.2',
    apiKey: '7f0149ab125c4275bbe1d37baf0d0cc5.gNfE6fFSyXHC4XN2GmutbqaU'
  },
  googleSheets: {
    sheetId: '17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E',
    editUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/edit?usp=sharing',
    embedUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/htmlembed?widget=true&headers=true',
    csvUrl: 'https://docs.google.com/spreadsheets/d/17vLvEtcxir8cFI2xzI9AA5R8xMikA4Pq48tBhiB5J5E/export?format=csv'
  }
} as const
