export const DEFAULT_BACKEND_HOST = '192.168.0.12:8080'
export const POLYMARKET_MARKET_WS_PATH = '/ws/polymarket/market'

export function normalizeBackendHost(host = DEFAULT_BACKEND_HOST) {
  const normalizedHost = host
    .trim()
    .replace(/^(https?|wss?):\/\//, '')
    .replace(/\/+$/, '')

  return normalizedHost || DEFAULT_BACKEND_HOST
}

export function createBackendHttpOrigin(host = DEFAULT_BACKEND_HOST) {
  return `http://${normalizeBackendHost(host)}`
}

export function createBackendWsUrl(host = DEFAULT_BACKEND_HOST, path = '', protocol: 'ws' | 'wss' = 'ws') {
  const normalizedPath = path ? `/${path.replace(/^\/+/, '')}` : ''

  return `${protocol}://${normalizeBackendHost(host)}${normalizedPath}`
}

type BrowserLocationLike = {
  protocol: string
  host: string
}

export function createCurrentOriginWsUrl(location: BrowserLocationLike, path = '') {
  const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws'

  return createBackendWsUrl(location.host, path, wsProtocol)
}
