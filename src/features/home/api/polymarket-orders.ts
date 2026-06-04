import { apiClient } from '../../../lib/api-client'

const POLYMARKET_ORDER_TIMEOUT = 30_000

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

export type PolymarketCreateOrderRequest = {
  market: string
  tokenId: string
  price: number
  currentPrice: number
  amount: number
  negRisk: boolean
  slippageConfirmed: boolean
}

export type PolymarketCreateOrderResponse = {
  orderID?: string
  success?: boolean
  status?: string
  makingAmount?: string
  takingAmount?: string
  transactionsHashes?: string[]
  tradeIDs?: string[]
  errorMsg?: string
}

export type PolymarketOrderPageItem = {
  id: number | string
  orderNo?: string
  polymarketOrderId?: string
  market?: string
  tokenId?: string
  side?: string
  orderType?: string
  price?: number
  actualBuyPrice?: number
  size?: number
  filledSize?: number
  requestAmount?: number
  actualBuyAmount?: number
  filledAmount?: number
  commissionRate?: number
  commissionAmount?: number
  netBuyAmount?: number
  status?: number
  errorMessage?: string
  createTime?: string
  updateTime?: string
}

export type PolymarketOrderDetail = PolymarketOrderPageItem & {
  userId?: number | string
  username?: string
  polymarketOwner?: string
  maker?: string
  signer?: string
  makerAmount?: string
  takerAmount?: string
  expiration?: string
  signatureTimestamp?: string
  metadata?: string
  builder?: string
  signature?: string
  salt?: string
  signatureType?: number
  deferExec?: number
  postOnly?: number
  requestBody?: string
  responseBody?: string
}

export type PolymarketOrdersQuery = {
  pageNum: number
  pageSize: number
  orderByColumn?: string
  isAsc?: 'asc' | 'desc' | 'ascending' | 'descending'
}

export async function createPolymarketOrder(payload: PolymarketCreateOrderRequest) {
  const response = await apiClient.post<ApiResult<PolymarketCreateOrderResponse>>('/api/wallet/orders', payload, {
    timeout: POLYMARKET_ORDER_TIMEOUT,
  })

  return response.data
}

export async function getPolymarketOrderDetail(id: string | number) {
  const response = await apiClient.get<ApiResult<PolymarketOrderDetail>>(`/api/wallet/orders/${id}`, {
    timeout: POLYMARKET_ORDER_TIMEOUT,
  })

  return response.data
}

export async function getPolymarketOrdersPage(query: PolymarketOrdersQuery) {
  const response = await apiClient.get<ApiResult<PageResult<PolymarketOrderPageItem>>>('/api/wallet/orders/page', {
    params: query,
    timeout: POLYMARKET_ORDER_TIMEOUT,
  })

  return response.data
}
