export const WALLET_AUTH_STORAGE_KEY = 'fifa.walletAuthSession'
export const INVITE_CODE_SESSION_KEY = 'fifa.inviteCode'
export const DEPOSIT_CALLBACK_STATE_KEY = 'fifa.depositCallbackState'

export type WalletAuthSession = {
  token: string
  walletAddress: string
  authType: 'BSC'
  userId?: number
  userType?: number
  inviteCode?: string
  registered: boolean
  walletProviderId?: string
  walletProviderName?: string
  walletProviderRdns?: string
  walletProviderSource?: string
  walletProviderUuid?: string
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

export function loadInviteCodeFromSession() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(INVITE_CODE_SESSION_KEY)?.trim().toUpperCase() ?? ''
}

export function saveInviteCodeToSession(inviteCode: string) {
  if (typeof window === 'undefined') {
    return
  }

  const normalizedInviteCode = inviteCode.trim().toUpperCase()
  if (!normalizedInviteCode) {
    return
  }

  window.sessionStorage.setItem(INVITE_CODE_SESSION_KEY, normalizedInviteCode)
}

export type PersistedDepositCallbackState = {
  amount: string
  hash: string
  orderNo?: string
}

function isPersistedDepositCallbackState(value: unknown): value is PersistedDepositCallbackState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const state = value as Partial<PersistedDepositCallbackState>
  return typeof state.amount === 'string' && typeof state.hash === 'string'
}

export function loadDepositCallbackState() {
  if (typeof window === 'undefined') {
    return null
  }

  const rawValue = window.localStorage.getItem(DEPOSIT_CALLBACK_STATE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    return isPersistedDepositCallbackState(parsedValue) ? parsedValue : null
  } catch {
    return null
  }
}

export function saveDepositCallbackState(state: PersistedDepositCallbackState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DEPOSIT_CALLBACK_STATE_KEY, JSON.stringify(state))
}

export function clearDepositCallbackState() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(DEPOSIT_CALLBACK_STATE_KEY)
}
