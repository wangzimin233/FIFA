import type { AxiosError } from 'axios'
import { useCallback, useEffect, useMemo } from 'react'
import { toast } from '@heroui/react'
import {
  useAppKitAccount,
  useAppKitProvider,
} from '@reown/appkit/react'
import {
  loginWithWallet,
  registerWithWallet,
  type WalletAuthResponse,
} from './api'
import { buildWalletAuthMessage } from './auth-message'
import { useWalletAuthStore } from './auth-store'
import {
  getProviderChainId,
  resolveWalletProvider,
  toWalletProviderPreference,
  type Eip1193Provider,
  type WalletProviderIdentity,
} from '../wallet/provider-registry'

const EVM_NAMESPACE = 'eip155'
const BSC_CHAIN_ID = 56
let hasSeenConnectedWallet = false
let hasHandledDisconnect = false

function normalizeAddress(value: string | undefined | null) {
  return value?.trim().toLowerCase() ?? ''
}

function toSession(data: WalletAuthResponse, walletProviderIdentity?: WalletProviderIdentity) {
  return {
    token: data.token ?? '',
    walletAddress: data.walletAddress,
    authType: 'BSC' as const,
    userId: data.userId,
    userType: data.userType,
    inviteCode: data.inviteCode,
    registered: data.registered || Boolean(data.token),
    ...toWalletProviderPreference(walletProviderIdentity),
  }
}

function resolveErrorMessage(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string }>
  const serverMessage = axiosError.response?.data?.message?.trim()
  const statusCode = axiosError.response?.status

  if (serverMessage) {
    return serverMessage
  }

  if (axiosError.code === 'ECONNABORTED' || /timeout/i.test(axiosError.message ?? '')) {
    return '钱包认证请求超时，请稍后重试。'
  }

  if (statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return '后端认证服务暂时不可用，请稍后重试。'
  }

  if ((error as { shortMessage?: string })?.shortMessage) {
    return (error as { shortMessage: string }).shortMessage
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '钱包认证失败，请重试。'
}

function isUnregisteredLoginResult(data: WalletAuthResponse | undefined) {
  return Boolean(data) && data.registered === false
}

function hasAuthenticatedToken(data: WalletAuthResponse | null | undefined) {
  return Boolean(data?.token)
}

function isUnregisteredError(error: unknown) {
  const axiosError = error as AxiosError<{ message?: string; code?: number }>
  const serverMessage = axiosError.response?.data?.message ?? axiosError.message ?? ''
  return /未注册|register|not\s+registered/i.test(serverMessage)
}

function isUnregisteredMessage(message: string | undefined | null) {
  return /未注册|register|not\s+registered/i.test(message ?? '')
}

function normalizeChainId(value: number | string | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const normalizedValue = value.trim().toLowerCase()
    if (normalizedValue.startsWith('0x')) {
      return Number.parseInt(normalizedValue, 16)
    }

    return Number.parseInt(normalizedValue, 10)
  }

  return null
}

function isConnectionTransitioning(status: string | undefined) {
  return status === 'connecting' || status === 'reconnecting'
}

export function useWalletAuth() {
  const { address, isConnected, status: connectionStatus } = useAppKitAccount({
    namespace: EVM_NAMESPACE,
  })
  const { walletProvider } = useAppKitProvider<Eip1193Provider>(EVM_NAMESPACE)

  const session = useWalletAuthStore((state) => state.session)
  const status = useWalletAuthStore((state) => state.status)
  const error = useWalletAuthStore((state) => state.error)
  const pendingRegistration = useWalletAuthStore((state) => state.pendingRegistration)
  const setSession = useWalletAuthStore((state) => state.setSession)
  const setStatus = useWalletAuthStore((state) => state.setStatus)
  const setError = useWalletAuthStore((state) => state.setError)
  const setPendingRegistration = useWalletAuthStore((state) => state.setPendingRegistration)
  const resetAuthFlow = useWalletAuthStore((state) => state.resetAuthFlow)
  const normalizedConnectedAddress = normalizeAddress(address)
  const normalizedSessionAddress = normalizeAddress(session?.walletAddress)
  const isSessionForConnectedWallet =
    isConnected &&
    Boolean(session?.token) &&
    normalizedConnectedAddress.length > 0 &&
    normalizedConnectedAddress === normalizedSessionAddress

  const finalizeSession = useCallback(
    (data: WalletAuthResponse, walletProviderIdentity?: WalletProviderIdentity, successMessage = '钱包登录成功') => {
      if (!data.token) {
        throw new Error('后端未返回 token，无法建立登录态。')
      }

      setSession(toSession(data, walletProviderIdentity))
      toast.success(successMessage)
    },
    [setSession],
  )

  const clearLocalSession = useCallback(() => {
    setSession(null)
  }, [setSession])

  const signWalletMessage = useCallback(
    async (message: string, walletAddress: string, signingProvider: Eip1193Provider) => {
      if (!signingProvider.request) {
        throw new Error('当前未获取到钱包 Provider，请重新连接钱包后重试。')
      }

      const signature = await signingProvider.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      })

      if (typeof signature !== 'string' || !signature) {
        throw new Error('钱包未返回有效签名，请重试。')
      }

      return signature
    },
    [],
  )

  const startWalletAuth = useCallback(async () => {
    if (!isConnected || !address) {
      return
    }

    if (status === 'logging_out' || status === 'signing' || status === 'logging_in' || status === 'registering') {
      return
    }

    let providerErrorMessage: string | null = null
    const authProvider = await resolveWalletProvider({
      fallbackProvider: walletProvider,
      walletAddress: address,
    }).catch((error: unknown) => {
      providerErrorMessage = resolveErrorMessage(error)
      return null
    })

    if (!authProvider) {
      setError(providerErrorMessage || '未找到与当前连接地址匹配的钱包 Provider，请重新连接钱包后重试。')
      setStatus('error')
      return
    }

    const providerChainId = authProvider.chainId ?? (await getProviderChainId(authProvider.provider))
    const currentChainId = normalizeChainId(providerChainId)
    if (currentChainId !== null && currentChainId !== BSC_CHAIN_ID) {
      setError('当前仅支持 BSC 钱包网络，请切换后重试。')
      setStatus('error')
      return
    }

    if (session?.token) {
      clearLocalSession()
    }

    setPendingRegistration(null)
    setError(null)
    setStatus('signing')

    const message = buildWalletAuthMessage(address)
    let signature = ''

    try {
      signature = await signWalletMessage(message, address, authProvider.provider)
      setStatus('logging_in')

      const result = await loginWithWallet({
        authType: 'BSC',
        walletAddress: address,
        message,
        signature,
      })

      if (!result.data) {
        if (isUnregisteredMessage(result.message)) {
          setPendingRegistration({
            authType: 'BSC',
            walletAddress: address,
            message,
            signature,
            walletProviderIdentity: authProvider.identity,
          })
          setStatus('awaiting_registration')
          return
        }

        throw new Error(result.message || '钱包登录未返回有效数据，请稍后重试。')
      }

      if (hasAuthenticatedToken(result.data)) {
        finalizeSession(result.data, authProvider.identity)
        return
      }

      if (isUnregisteredLoginResult(result.data)) {
        setPendingRegistration({
          authType: 'BSC',
          walletAddress: address,
          message,
          signature,
          walletProviderIdentity: authProvider.identity,
        })
        setStatus('awaiting_registration')
        return
      }

      finalizeSession(result.data, authProvider.identity)
    } catch (error) {
      if (isUnregisteredError(error)) {
        setPendingRegistration({
          authType: 'BSC',
          walletAddress: address,
          message,
          signature,
          walletProviderIdentity: authProvider.identity,
        })
        setStatus(signature ? 'awaiting_registration' : 'error')
        setError(
          signature
            ? null
            : '后端返回未注册，但当前签名已失效，请重新点击连接钱包重试。',
        )
        return
      }

      setStatus('error')
      setError(resolveErrorMessage(error))
    }
  }, [
    address,
    clearLocalSession,
    finalizeSession,
    isConnected,
    session,
    setError,
    setPendingRegistration,
    setStatus,
    signWalletMessage,
    status,
    walletProvider,
  ])

  const completeRegistration = useCallback(
    async (inviteCode?: string) => {
      if (!pendingRegistration) {
        return
      }

      if (!pendingRegistration.signature) {
        setStatus('error')
        setError('注册签名已失效，请重新点击连接钱包重试。')
        return
      }

      setError(null)
      setStatus('registering')

      try {
        const result = await registerWithWallet({
          authType: pendingRegistration.authType,
          walletAddress: pendingRegistration.walletAddress,
          message: pendingRegistration.message,
          signature: pendingRegistration.signature,
          ...(inviteCode ? { inviteCode } : {}),
        })

        if (!result.data) {
          throw new Error(result.message || '钱包注册未返回有效数据，请稍后重试。')
        }

        finalizeSession(result.data, pendingRegistration.walletProviderIdentity)
      } catch (error) {
        setStatus('awaiting_registration')
        setError(resolveErrorMessage(error))
      }
    },
    [finalizeSession, pendingRegistration, setError, setStatus],
  )

  const resetWalletAuth = useCallback(() => {
    resetAuthFlow()
  }, [resetAuthFlow])

  useEffect(() => {
    if (isConnected && address) {
      hasSeenConnectedWallet = true
      hasHandledDisconnect = false
    } else if (!session?.token) {
      hasHandledDisconnect = false
    }

    if (!isConnected || !address) {
      if (isConnectionTransitioning(connectionStatus)) {
        return
      }

      if (
        session?.token &&
        hasSeenConnectedWallet &&
        !hasHandledDisconnect
      ) {
        hasHandledDisconnect = true
        clearLocalSession()
        return
      }

      resetAuthFlow()
      return
    }

    if (isSessionForConnectedWallet) {
      if (status !== 'authenticated') {
        setStatus('authenticated')
      }
      return
    }

    if (session && normalizedConnectedAddress !== normalizedSessionAddress) {
      if (status !== 'signing' && status !== 'logging_in' && status !== 'registering') {
        clearLocalSession()
      }
      return
    }

    if (status === 'idle') {
      void startWalletAuth()
    }
  }, [
    address,
    clearLocalSession,
    connectionStatus,
    isConnected,
    isSessionForConnectedWallet,
    normalizedConnectedAddress,
    normalizedSessionAddress,
    resetAuthFlow,
    session,
    setStatus,
    startWalletAuth,
    status,
  ])

  const walletButtonLabel = useMemo(() => {
    if (!isConnected || !address) {
      return '连接钱包'
    }

    if (status === 'signing') {
      return '请求签名中...'
    }

    if (status === 'logging_out') {
      return '退出中...'
    }

    if (status === 'logging_in' || status === 'registering') {
      return '登录中...'
    }

    if (!isSessionForConnectedWallet) {
      if (status === 'error') {
        return '重试登录'
      }

      return '完成登录'
    }

    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }, [address, isConnected, isSessionForConnectedWallet, status])

  return {
    address,
    connectionStatus,
    error,
    isConnected,
    isInviteCodeRequired: status === 'awaiting_registration',
    isSessionForConnectedWallet,
    pendingRegistration,
    startWalletAuth,
    completeRegistration,
    resetWalletAuth,
    status,
    walletButtonLabel,
  }
}
