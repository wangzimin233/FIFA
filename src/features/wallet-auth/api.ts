import { apiClient } from '../../lib/api-client'

const WALLET_AUTH_TIMEOUT = 30_000
const WALLET_INFO_TIMEOUT = 15_000

type ApiResult<T> = {
  code: number
  message: string
  data: T | null
}

export type WalletAuthRequest = {
  authType: 'BSC'
  walletAddress: string
  message: string
  signature: string
}

export type WalletRegisterRequest = WalletAuthRequest & {
  inviteCode?: string
}

export type WalletAuthResponse = {
  registered: boolean
  token?: string
  userId?: number
  userType?: number
  inviteCode?: string
  authType: string
  walletAddress: string
}

export type WalletUserAssetItem = {
  coinId: number
  coinCode: string
  coinName: string
  chainCode: string
  contractAddress: string
  totalBalance: string
  availableBalance: string
  frozenBalance: string
  rechargeTotal: string
  withdrawTotal: string
}

export type WalletUserInfoResponse = {
  userId: number
  userType: number
  inviteCode: string
  authType: string
  walletAddress: string
  nickname?: string
  assets: WalletUserAssetItem[]
}

export async function loginWithWallet(payload: WalletAuthRequest) {
  const response = await apiClient.post<ApiResult<WalletAuthResponse>>('/api/wallet/auth/login', payload, {
    timeout: WALLET_AUTH_TIMEOUT,
  })
  return response.data
}

export async function registerWithWallet(payload: WalletRegisterRequest) {
  const response = await apiClient.post<ApiResult<WalletAuthResponse>>('/api/wallet/auth/register', payload, {
    timeout: WALLET_AUTH_TIMEOUT,
  })
  return response.data
}

export async function logoutWalletAuth(token?: string) {
  const response = await apiClient.post<ApiResult<null>>(
    '/api/web/auth/logout',
    {},
    {
      timeout: WALLET_AUTH_TIMEOUT,
      ...(token
        ? {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        : {}),
    },
  )

  return response.data
}

export async function getWalletUserInfo() {
  const response = await apiClient.get<ApiResult<WalletUserInfoResponse>>('/api/wallet/user/info', {
    timeout: WALLET_INFO_TIMEOUT,
  })
  return response.data
}
