export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/',
  appName: import.meta.env.VITE_APP_NAME || 'FIFA Control Room',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  reownProjectId: import.meta.env.VITE_REOWN_PROJECT_ID || '',
} as const

export const hasReownProjectId = env.reownProjectId.length > 0
