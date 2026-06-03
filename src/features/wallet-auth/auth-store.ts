import { create } from 'zustand'
import {
  clearWalletAuthSession,
  loadWalletAuthSession,
  saveWalletAuthSession,
  type WalletAuthSession,
} from './storage'
import type { WalletProviderIdentity } from '../wallet/provider-registry'

export type WalletAuthStatus =
  | 'idle'
  | 'logging_out'
  | 'signing'
  | 'logging_in'
  | 'awaiting_registration'
  | 'registering'
  | 'authenticated'
  | 'error'

export type PendingWalletRegistration = {
  authType: 'BSC'
  walletAddress: string
  message: string
  signature: string
  walletProviderIdentity?: WalletProviderIdentity
}

type WalletAuthState = {
  session: WalletAuthSession | null
  status: WalletAuthStatus
  error: string | null
  pendingRegistration: PendingWalletRegistration | null
  setSession: (session: WalletAuthSession | null) => void
  setStatus: (status: WalletAuthStatus) => void
  setError: (error: string | null) => void
  setPendingRegistration: (pendingRegistration: PendingWalletRegistration | null) => void
  resetAuthFlow: () => void
}

const initialSession = loadWalletAuthSession()

export const useWalletAuthStore = create<WalletAuthState>((set) => ({
  session: initialSession,
  status: initialSession ? 'authenticated' : 'idle',
  error: null,
  pendingRegistration: null,
  setSession: (session) => {
    if (session) {
      saveWalletAuthSession(session)
    } else {
      clearWalletAuthSession()
    }

    set({
      session,
      status: session ? 'authenticated' : 'idle',
      error: null,
      pendingRegistration: null,
    })
  },
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setPendingRegistration: (pendingRegistration) => set({ pendingRegistration }),
  resetAuthFlow: () =>
    set((state) => ({
      status: state.session ? 'authenticated' : 'idle',
      error: null,
      pendingRegistration: null,
    })),
}))
