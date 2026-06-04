import {
  POLYMARKET_MARKET_WS_PATH,
  createBackendHttpOrigin,
  createCurrentOriginWsUrl,
  createBackendWsUrl,
  normalizeBackendHost,
} from './backend'

const backendHost = normalizeBackendHost(import.meta.env.VITE_BACKEND_HOST)
const isDev = import.meta.env.DEV
const browserLocation = typeof window === 'undefined' ? null : window.location
const backendHttpOrigin = isDev || !browserLocation
  ? createBackendHttpOrigin(backendHost)
  : browserLocation.origin
const polymarketMarketWsUrl = isDev || !browserLocation
  ? createBackendWsUrl(backendHost, POLYMARKET_MARKET_WS_PATH)
  : createCurrentOriginWsUrl(browserLocation, POLYMARKET_MARKET_WS_PATH)

export const env = {
  apiBaseUrl: '/',
  appName: import.meta.env.VITE_APP_NAME || 'GOPRE Control Room',
  appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
  backendHost,
  backendHttpOrigin,
  polymarketMarketWsUrl,
  reownProjectId: import.meta.env.VITE_REOWN_PROJECT_ID || '',
} as const

export const hasReownProjectId = env.reownProjectId.length > 0
