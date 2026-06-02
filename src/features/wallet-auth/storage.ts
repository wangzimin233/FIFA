export const WALLET_AUTH_STORAGE_KEY = 'fifa.walletAuthSession'

export type WalletAuthSession = {
  token: string
  walletAddress: string
  authType: 'BSC'
  userId?: number
  userType?: number
  inviteCode?: string
  registered: boolean
}

function isWalletAuthSession(value: unknown): value is WalletAuthSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const session = value as Partial<WalletAuthSession>
  return (
    typeof session.token === 'string' &&
    typeof session.walletAddress === 'string' &&
    session.authType === 'BSC' &&
    typeof session.registered === 'boolean'
  )
}

export function loadWalletAuthSession() {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(WALLET_AUTH_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return isWalletAuthSession(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

export function saveWalletAuthSession(session: WalletAuthSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(WALLET_AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function clearWalletAuthSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(WALLET_AUTH_STORAGE_KEY)
}

