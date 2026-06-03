import { apiClient } from '../../../lib/api-client'

const WALLET_CONTRACT_CONFIG_TIMEOUT = 15_000
const DEPOSIT_REQUEST_TIMEOUT = 30_000

export type ChainType = 'BSC'

type ApiResult<T> = {
  code: number
  message: string
  data: T | null
}

export type WalletContractInfoItem = {
  contractType: number
  contractName: string
  contractAddress: string
}

export type WalletContractConfigResponse = {
  chainType: ChainType
  coinCode: string
  coinName: string
  rechargeMinAmount: string
  withdrawMinAmount: string
  withdrawMaxAmount: string
  withdrawFeeType: number
  withdrawFeeValue: string
  contracts: WalletContractInfoItem[]
}

export type DepositCreateOrderRequest = {
  chainType: ChainType
  amount: number
}

export type DepositCreateOrderResponse = {
  orderId: number | string
  orderNo: string
  chainType: ChainType
  contractAddress: string
  userAddress: string
  amount: string
  amountWei: string
  signature: string
}

export type DepositCallbackRequest = {
  chainType: ChainType
  hash: string
}

export type DepositCallbackResponse = {
  processed: boolean
  orderNo: string
  txHash: string
  amount: string
  message: string
}

export async function getWalletContractConfig(chainType: ChainType) {
  const response = await apiClient.get<ApiResult<WalletContractConfigResponse>>('/api/wallet/contract/config', {
    params: { chainType },
    timeout: WALLET_CONTRACT_CONFIG_TIMEOUT,
  })

  return response.data
}

export async function createDepositOrder(payload: DepositCreateOrderRequest) {
  const response = await apiClient.post<ApiResult<DepositCreateOrderResponse>>(
    '/api/wallet/deposit/create-order',
    payload,
    {
      timeout: DEPOSIT_REQUEST_TIMEOUT,
    },
  )

  return response.data
}

export async function notifyDepositCallback(payload: DepositCallbackRequest) {
  const response = await apiClient.post<ApiResult<DepositCallbackResponse>>(
    '/api/wallet/deposit/callback',
    payload,
    {
      timeout: DEPOSIT_REQUEST_TIMEOUT,
    },
  )

  return response.data
}
