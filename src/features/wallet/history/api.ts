import { apiClient } from '../../../lib/api-client'
import type { ChainType } from '../deposit/api'

const WALLET_HISTORY_TIMEOUT = 15_000

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

export type WalletHistoryQuery = {
  page: number
  pageSize: number
  status?: number
  chainType?: ChainType
}

export type DepositOrderPageItem = {
  id: number | string
  orderNo: string
  chainType: ChainType | string
  coinCode: string
  contractAddress?: string
  amount: string
  txHash?: string
  status: number
  createTime?: string
}

export type WithdrawOrderPageItem = {
  id: number | string
  withdrawNo: string
  chainCode: ChainType | string
  coinCode: string
  contractAddress?: string
  toAddress?: string
  applyAmount: string
  feeAmount?: string
  actualAmount?: string
  txHash?: string
  status: number
  rejectReason?: string
  createTime?: string
}

export type WalletHistoryPage<T> = PageResult<T> & {
  hasNext: boolean
}

function buildPage<T>(data: PageResult<T> | null, fallback: WalletHistoryQuery): WalletHistoryPage<T> {
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

export async function getDepositHistory(query: WalletHistoryQuery) {
  const response = await apiClient.get<ApiResult<PageResult<DepositOrderPageItem>>>('/api/wallet/deposit/page', {
    params: query,
    timeout: WALLET_HISTORY_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}

export async function getWithdrawHistory(query: WalletHistoryQuery) {
  const response = await apiClient.get<ApiResult<PageResult<WithdrawOrderPageItem>>>('/api/wallet/withdraw/page', {
    params: query,
    timeout: WALLET_HISTORY_TIMEOUT,
  })

  return buildPage(response.data.data, query)
}
