import axios from 'axios'
import { env } from '../config/env'
import { wagmiConfig } from '../config/web3'
import { useWalletAuthStore } from '../features/wallet-auth/auth-store'
import { loadWalletAuthSession, clearWalletAuthSession } from '../features/wallet-auth/storage'
import { disconnect } from 'wagmi/actions'

type ApiEnvelope = {
  code?: number
  message?: string
}

function shouldAttachAuthHeader(url: string | undefined) {
  if (!url) {
    return true
  }

  return !['/api/wallet/auth/login', '/api/wallet/auth/register'].some((path) => url.includes(path))
}

let unauthorizedCleanupPromise: Promise<void> | null = null

async function handleUnauthorized(message = '请先登录') {
  if (!unauthorizedCleanupPromise) {
    unauthorizedCleanupPromise = (async () => {
      clearWalletAuthSession()
      useWalletAuthStore.getState().setSession(null)

      try {
        await disconnect(wagmiConfig)
      } catch (error) {
        console.warn('[api-client] wallet disconnect failed after unauthorized response', error)
      } finally {
        unauthorizedCleanupPromise = null
      }
    })()
  }

  await unauthorizedCleanupPromise

  const unauthorizedError = new Error(message) as Error & {
    response?: {
      data: ApiEnvelope
      status: number
    }
  }

  unauthorizedError.response = {
    status: 401,
    data: {
      code: 401,
      message,
    },
  }

  throw unauthorizedError
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 10_000,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const session = loadWalletAuthSession()
  if (session?.token && shouldAttachAuthHeader(config.url) && !config.headers?.Authorization) {
    config.headers.Authorization = session.token
  }

  return config
})

apiClient.interceptors.response.use(async (response) => {
  const payload = response.data as ApiEnvelope | undefined

  if (payload?.code === 401) {
    await handleUnauthorized(payload.message || '请先登录')
  }

  return response
}, async (error) => {
  if (error?.response?.status === 401) {
    await handleUnauthorized(error.response?.data?.message || '请先登录')
  }

  return Promise.reject(error)
})
