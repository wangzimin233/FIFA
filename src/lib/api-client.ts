import axios from 'axios'
import { env } from '../config/env'
import { useWalletAuthStore } from '../features/wallet-auth/auth-store'
import { loadWalletAuthSession, clearWalletAuthSession } from '../features/wallet-auth/storage'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const session = loadWalletAuthSession()
  if (session?.token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${session.token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearWalletAuthSession()
      useWalletAuthStore.getState().setSession(null)
    }

    return Promise.reject(error)
  },
)
