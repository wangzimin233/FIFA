import { create } from 'zustand'
import { parsePriceToCents } from '../home/api/get-world-cup-games'

type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed'

type PolymarketPriceMessage = {
  market?: string
  asset_id?: string
  best_bid?: string | number
  best_ask?: string | number
  price_changes?: Array<{
    asset_id?: string
    price?: string | number
    best_bid?: string | number
    best_ask?: string | number
    timestamp?: string | number
  }>
  timestamp?: string
  event_type?: string
}

type PolymarketPriceState = {
  connectionStatus: ConnectionStatus
  priceByAssetId: Record<string, number>
  requestedAssetIds: string[]
  subscribeAssets: (assetIds: string[]) => void
  unsubscribeAssets: (assetIds: string[]) => void
}

const WS_URL = 'ws://192.168.101.65:8080/ws/polymarket/market'
const PRICE_FLUSH_INTERVAL_MS = 16

const assetSubscriberCounts = new Map<string, number>()
const requestedAssetIds = new Set<string>()
const latestPriceVersionByAssetId = new Map<string, { timestamp: number | null; sequence: number }>()
const pendingPriceUpdates = new Map<string, { price: number; timestamp: number | null; sequence: number }>()
let sentAssetIds = new Set<string>()
let socket: WebSocket | null = null
let reconnectTimer: number | null = null
let heartbeatTimer: number | null = null
let priceFlushTimer: number | null = null
let reconnectAttempts = 0
let suppressReconnect = false
let socketSequence = 0
let messageSequence = 0

function normalizeAssetIds(assetIds: string[]) {
  return Array.from(
    new Set(
      assetIds
        .map((assetId) => assetId?.trim())
        .filter((assetId): assetId is string => Boolean(assetId)),
    ),
  )
}

function syncRequestedAssetIds() {
  usePolymarketPriceStore.setState({
    requestedAssetIds: Array.from(requestedAssetIds),
  })
}

function clearReconnectTimer() {
  if (typeof window === 'undefined' || reconnectTimer === null) {
    return
  }

  window.clearTimeout(reconnectTimer)
  reconnectTimer = null
}

function clearHeartbeatTimer() {
  if (typeof window === 'undefined' || heartbeatTimer === null) {
    return
  }

  window.clearInterval(heartbeatTimer)
  heartbeatTimer = null
}

function clearPriceFlushTimer() {
  if (typeof window === 'undefined' || priceFlushTimer === null) {
    return
  }

  window.clearTimeout(priceFlushTimer)
  priceFlushTimer = null
}

function scheduleReconnect() {
  if (
    typeof window === 'undefined' ||
    reconnectTimer !== null ||
    requestedAssetIds.size === 0 ||
    suppressReconnect
  ) {
    return
  }

  reconnectAttempts += 1
  const delay = Math.min(1500 * 2 ** Math.max(0, reconnectAttempts - 1), 10000)

  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    ensureSocket()
  }, delay)
}

function flushSubscriptions() {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return
  }

  const pendingAssetIds = Array.from(requestedAssetIds).filter((assetId) => !sentAssetIds.has(assetId))
  if (!pendingAssetIds.length) {
    return
  }

  socket.send(
    JSON.stringify({
      type: 'subscribe_assets',
      assetIds: pendingAssetIds,
    }),
  )

  pendingAssetIds.forEach((assetId) => {
    sentAssetIds.add(assetId)
  })
}

function parseDecimal(value?: string | number) {
  const numeric = typeof value === 'string' ? Number(value) : value
  return numeric !== undefined && Number.isFinite(numeric) ? numeric : null
}

function normalizeTimestamp(value: number) {
  return value > 1e11 ? value : value * 1000
}

function parseMessageTimestamp(value?: string | number) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? normalizeTimestamp(value) : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const numeric = Number(trimmedValue)
  if (Number.isFinite(numeric)) {
    return normalizeTimestamp(numeric)
  }

  const parsedTimestamp = Date.parse(trimmedValue)
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : null
}

function resolveRealtimePriceCents(payload: {
  price?: string | number
  best_bid?: string | number
  best_ask?: string | number
}) {
  const bestBid = parseDecimal(payload.best_bid)
  const bestAsk = parseDecimal(payload.best_ask)

  if (bestBid !== null && bestAsk !== null) {
    return parsePriceToCents((bestBid + bestAsk) / 2)
  }

  if (bestAsk !== null) {
    return parsePriceToCents(bestAsk)
  }

  if (bestBid !== null) {
    return parsePriceToCents(bestBid)
  }

  const tradePrice = parseDecimal(payload.price)
  if (tradePrice !== null) {
    return parsePriceToCents(tradePrice)
  }

  return null
}

function shouldApplyPriceUpdate(
  assetId: string,
  nextVersion: { timestamp: number | null; sequence: number },
) {
  const currentVersion = pendingPriceUpdates.get(assetId) ?? latestPriceVersionByAssetId.get(assetId)
  if (!currentVersion) {
    return true
  }

  if (nextVersion.timestamp !== null && currentVersion.timestamp !== null) {
    return nextVersion.timestamp >= currentVersion.timestamp
  }

  return nextVersion.sequence >= currentVersion.sequence
}

function flushPendingPriceUpdates() {
  priceFlushTimer = null

  if (!pendingPriceUpdates.size) {
    return
  }

  const updates = Array.from(pendingPriceUpdates.entries())
  pendingPriceUpdates.clear()

  usePolymarketPriceStore.setState((state) => {
    let nextPriceByAssetId = state.priceByAssetId
    let hasPriceChanges = false

    updates.forEach(([assetId, update]) => {
      latestPriceVersionByAssetId.set(assetId, {
        timestamp: update.timestamp,
        sequence: update.sequence,
      })

      if (nextPriceByAssetId[assetId] === update.price) {
        return
      }

      if (!hasPriceChanges) {
        nextPriceByAssetId = { ...state.priceByAssetId }
        hasPriceChanges = true
      }

      nextPriceByAssetId[assetId] = update.price
    })

    return hasPriceChanges
      ? {
          priceByAssetId: nextPriceByAssetId,
        }
      : state
  })
}

function schedulePriceFlush() {
  if (typeof window === 'undefined' || priceFlushTimer !== null) {
    return
  }

  priceFlushTimer = window.setTimeout(flushPendingPriceUpdates, PRICE_FLUSH_INTERVAL_MS)
}

function queuePriceUpdate(
  assetId: string,
  price: number,
  version: { timestamp: number | null; sequence: number },
) {
  if (!shouldApplyPriceUpdate(assetId, version)) {
    return
  }

  pendingPriceUpdates.set(assetId, {
    price,
    timestamp: version.timestamp,
    sequence: version.sequence,
  })
}

function applyPriceChanges(message: PolymarketPriceMessage) {
  const sequence = ++messageSequence
  let hasQueuedUpdates = false

  if (message.asset_id) {
    const assetId = message.asset_id.trim()
    const price = resolveRealtimePriceCents({
      price: message.price_changes?.[0]?.price,
      best_bid: message.best_bid,
      best_ask: message.best_ask,
    })

    if (assetId && price !== null) {
      queuePriceUpdate(assetId, price, {
        timestamp: parseMessageTimestamp(message.timestamp),
        sequence,
      })
      hasQueuedUpdates = true
    }
  }

  ;(message.price_changes ?? []).forEach((item) => {
    const assetId = item.asset_id?.trim()
    if (!assetId) {
      return
    }

    const price = resolveRealtimePriceCents({
      price: item.price,
      best_bid: item.best_bid,
      best_ask: item.best_ask,
    })
    if (price === null) {
      return
    }

    queuePriceUpdate(assetId, price, {
      timestamp: parseMessageTimestamp(item.timestamp ?? message.timestamp),
      sequence,
    })
    hasQueuedUpdates = true
  })

  if (!hasQueuedUpdates) {
    return
  }

  schedulePriceFlush()
}

function startHeartbeat(targetSocket: WebSocket, socketId: number) {
  if (typeof window === 'undefined') {
    return
  }

  clearHeartbeatTimer()
  heartbeatTimer = window.setInterval(() => {
    if (socket !== targetSocket || targetSocket.readyState !== WebSocket.OPEN) {
      clearHeartbeatTimer()
      return
    }

    try {
      targetSocket.send('ping')
      console.debug('[polymarket-ws] ping', { socketId })
    } catch (error) {
      console.warn('[polymarket-ws] ping failed', { socketId, error })
    }
  }, 5000)
}

function closeSocket(options?: { suppressReconnect?: boolean; reason?: string }) {
  suppressReconnect = options?.suppressReconnect ?? suppressReconnect
  clearReconnectTimer()
  clearHeartbeatTimer()
  if (pendingPriceUpdates.size) {
    flushPendingPriceUpdates()
  }
  clearPriceFlushTimer()

  if (!socket) {
    if (options?.reason) {
      console.info(`[polymarket-ws] skip close: ${options.reason}`)
    }
    return
  }

  const currentSocket = socket
  socket = null
  currentSocket.onopen = null
  currentSocket.onmessage = null
  currentSocket.onerror = null
  currentSocket.onclose = null

  if (options?.reason) {
    console.info(`[polymarket-ws] closing socket: ${options.reason}`)
  }

  if (
    currentSocket.readyState === WebSocket.OPEN ||
    currentSocket.readyState === WebSocket.CONNECTING
  ) {
    currentSocket.close(1000, 'client closing socket')
  }
}

function ensureSocket() {
  if (typeof window === 'undefined' || requestedAssetIds.size === 0) {
    return
  }

  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return
  }

  socket = null
  suppressReconnect = false
  clearReconnectTimer()
  usePolymarketPriceStore.setState({ connectionStatus: 'connecting' })
  const nextSocket = new WebSocket(WS_URL)
  const socketId = ++socketSequence
  socket = nextSocket

  console.info('[polymarket-ws] creating socket', {
    socketId,
    requestedAssetCount: requestedAssetIds.size,
    reconnectAttempts,
  })

  nextSocket.onopen = () => {
    if (socket !== nextSocket) {
      nextSocket.close(1000, 'stale socket opened')
      return
    }

    reconnectAttempts = 0
    sentAssetIds = new Set()
    usePolymarketPriceStore.setState({ connectionStatus: 'open' })
    console.info('[polymarket-ws] connected', { socketId })
    startHeartbeat(nextSocket, socketId)
    flushSubscriptions()
  }

  nextSocket.onmessage = (event) => {
    if (socket !== nextSocket) {
      return
    }

    if (typeof event.data === 'string' && event.data.toLowerCase() === 'pong') {
      console.debug('[polymarket-ws] pong', { socketId })
      return
    }

    try {
      const message = JSON.parse(String(event.data)) as PolymarketPriceMessage
      applyPriceChanges(message)
    } catch {
      // Ignore malformed websocket payloads and keep the stream alive.
    }
  }

  nextSocket.onerror = (event) => {
    if (socket !== nextSocket) {
      return
    }

    console.warn('[polymarket-ws] error', { socketId, event })
  }

  nextSocket.onclose = (event) => {
    clearHeartbeatTimer()

    if (socket !== nextSocket) {
      console.info('[polymarket-ws] stale socket closed', {
        socketId,
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean,
      })
      return
    }

    socket = null
    sentAssetIds = new Set()
    usePolymarketPriceStore.setState({ connectionStatus: 'closed' })
    console.info('[polymarket-ws] closed', {
      socketId,
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
      requestedAssetCount: requestedAssetIds.size,
      suppressReconnect,
    })

    if (suppressReconnect) {
      return
    }

    scheduleReconnect()
  }
}

function prunePrices(assetIds: string[]) {
  if (!assetIds.length) {
    return
  }

  usePolymarketPriceStore.setState((state) => {
    const nextPriceByAssetId = { ...state.priceByAssetId }

    assetIds.forEach((assetId) => {
      latestPriceVersionByAssetId.delete(assetId)
      pendingPriceUpdates.delete(assetId)
      delete nextPriceByAssetId[assetId]
    })

    return {
      priceByAssetId: nextPriceByAssetId,
    }
  })
}

function restartSocketWithCurrentSubscriptions(reason: string) {
  sentAssetIds = new Set()
  closeSocket({
    suppressReconnect: true,
    reason,
  })
  ensureSocket()
}

export const usePolymarketPriceStore = create<PolymarketPriceState>((set) => ({
  connectionStatus: 'idle',
  priceByAssetId: {},
  requestedAssetIds: [],
  subscribeAssets: (assetIds) => {
    const normalizedAssetIds = normalizeAssetIds(assetIds)
    let hasNewAsset = false

    normalizedAssetIds.forEach((assetId) => {
      const currentCount = assetSubscriberCounts.get(assetId) ?? 0
      assetSubscriberCounts.set(assetId, currentCount + 1)

      if (!requestedAssetIds.has(assetId)) {
        requestedAssetIds.add(assetId)
        hasNewAsset = true
      }
    })

    if (hasNewAsset) {
      syncRequestedAssetIds()
    }

    if (requestedAssetIds.size === 0) {
      set({ connectionStatus: 'idle' })
      return
    }

    ensureSocket()
    flushSubscriptions()
  },
  unsubscribeAssets: (assetIds) => {
    const normalizedAssetIds = normalizeAssetIds(assetIds)
    const removedAssetIds: string[] = []

    normalizedAssetIds.forEach((assetId) => {
      const currentCount = assetSubscriberCounts.get(assetId)
      if (!currentCount) {
        return
      }

      if (currentCount === 1) {
        assetSubscriberCounts.delete(assetId)
        if (requestedAssetIds.delete(assetId)) {
          removedAssetIds.push(assetId)
        }
        return
      }

      assetSubscriberCounts.set(assetId, currentCount - 1)
    })

    if (!removedAssetIds.length) {
      return
    }

    syncRequestedAssetIds()
    prunePrices(removedAssetIds)

    if (requestedAssetIds.size === 0) {
      sentAssetIds = new Set()
      closeSocket({
        suppressReconnect: true,
        reason: 'no active asset subscriptions',
      })
      set({ connectionStatus: 'idle' })
      return
    }

    if (socket) {
      restartSocketWithCurrentSubscriptions('refreshing asset subscriptions')
    }
  },
}))

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    closeSocket({
      suppressReconnect: true,
      reason: 'vite hot dispose',
    })
  })
}
