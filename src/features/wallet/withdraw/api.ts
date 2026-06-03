import { apiClient } from '../../../lib/api-client'
import type { ChainType } from '../deposit/api'

const WITHDRAW_REQUEST_TIMEOUT = 30_000

type ApiResult<T> = {
  code: number
  message: string
  data: T | null
}

export type WithdrawApplyRequest = {
  amount: number
}

export type WithdrawApplyResponse = {
  withdrawId: number | string
  withdrawNo: string
  chainType: ChainType
  coinCode: string
  toAddress: string
  applyAmount: string
  feeAmount: string
  actualAmount: string
  status: number
  bizId?: number | string
  rewardType?: number | string
  amountWei?: string
  actualAmountWei?: string
}

export type WithdrawCallbackRequest = {
  chainType: ChainType
  hash: string
}

export type WithdrawCallbackResponse = {
  processed: boolean
  withdrawNo: string
  txHash: string
  amount: string
  message: string
}

export async function applyWithdraw(payload: WithdrawApplyRequest) {
  const response = await apiClient.post<ApiResult<WithdrawApplyResponse>>('/api/wallet/withdraw/apply', payload, {
    timeout: WITHDRAW_REQUEST_TIMEOUT,
  })

  return response.data
}

export async function notifyWithdrawCallback(payload: WithdrawCallbackRequest) {
  const response = await apiClient.post<ApiResult<WithdrawCallbackResponse>>('/api/wallet/withdraw/callback', payload, {
    timeout: WITHDRAW_REQUEST_TIMEOUT,
  })

  return response.data
}
