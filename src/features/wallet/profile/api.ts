import { apiClient } from '../../../lib/api-client'

const WALLET_PROFILE_TIMEOUT = 15_000

type ApiResult<T> = {
  code: number
  message: string
  data: T | null
}

type PageResult<T> = {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export type WalletUserRelationStatsResponse = {
  userId: number
  directCount: number
  umbrellaCount: number
}

export type WalletUserDirectPageItem = {
  userId: number
  walletAddress: string
  authType: 'BSC' | 'TRX'
  nickname?: string
  inviteCode?: string
  userType: 1 | 2
  status: 1 | 2
  createTime?: string
}

export type WalletRewardBizType = 11 | 12

export type WalletRewardPageItem = {
  id: number
  detailNo: string
  bizType: WalletRewardBizType
  bizTypeName: string
  coinId: number
  coinCode: string
  changeAmount: string
  remark?: string
  createTime?: string
}

export type WalletProfilePage<T> = PageResult<T> & {
  hasNext: boolean
}

function buildPage<T>(data: PageResult<T> | null, fallback: { page: number; pageSize: number }): WalletProfilePage<T> {
  const list = data?.list ?? []
  const page = Number(data?.page ?? fallback.page)
  const pageSize = Number(data?.pageSize ?? fallback.pageSize)
  const total = Number(data?.total ?? list.length)

  return {
    list,
    total,
    page,
    pageSize,
    hasNext: page * pageSize < total,
  }
}

function serializeParams(params: Record<string, unknown>) {
  const search = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        search.set(key, value.join(','))
      }
      return
    }

    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })

  return search.toString()
}

export async function getWalletUserRelationStats(userId: number) {
  const response = await apiClient.get<ApiResult<WalletUserRelationStatsResponse>>('/api/wallet/user/relation-stats', {
    params: { userId },
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return response.data
}

export async function getWalletUserDirectPage(query: {
  userId: number
  page: number
  pageSize: number
  username?: string
}) {
  const response = await apiClient.get<ApiResult<PageResult<WalletUserDirectPageItem>>>('/api/wallet/user/direct-page', {
    params: query,
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}

export async function getWalletUserUmbrellaPage(query: {
  userId: number
  page: number
  pageSize: number
  username?: string
}) {
  const response = await apiClient.get<ApiResult<PageResult<WalletUserDirectPageItem>>>('/api/wallet/user/umbrella-page', {
    params: query,
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}

export async function getWalletRewardPage(query: {
  page: number
  pageSize: number
  bizTypes?: WalletRewardBizType[]
}) {
  const response = await apiClient.get<ApiResult<PageResult<WalletRewardPageItem>>>('/api/wallet/reward/page', {
    params: query,
    paramsSerializer: {
      serialize: serializeParams,
    },
    timeout: WALLET_PROFILE_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}
