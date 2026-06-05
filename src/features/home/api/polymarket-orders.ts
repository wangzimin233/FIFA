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
  eventSlug: string
  marketSlug: string
  marketId: string
  conditionId: string
  market: string
  eventTitle: string
  eventTitleZh: string
  marketTitle: string
  marketTitleZh: string
  outcomeTitle: string
  outcomeTitleZh: string
  tokenId: string
  amount: number
  negRisk: boolean
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
  userId?: number
  username?: string
  polymarketOrderId?: string
  eventSlug?: string
  marketSlug?: string
  marketId?: string
  conditionId?: string
  eventTitle?: string
  eventTitleZh?: string
  marketTitle?: string
  marketTitleZh?: string
  outcomeTitle?: string
  outcomeTitleZh?: string
  currentOdds?: number
  estimatedReturnAmount?: number
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
  marketClosed?: number
  marketClosedTime?: string | null
  marketResolutionStatus?: string
  errorMessage?: string
  createTime?: string
  updateTime?: string
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

export async function getPolymarketOrdersPage(query: PolymarketOrdersQuery) {
  const response = await apiClient.get<ApiResult<PageResult<PolymarketOrderPageItem>>>('/api/wallet/orders/page', {
    params: query,
    timeout: POLYMARKET_ORDER_TIMEOUT,
  })

  return response.data
}
