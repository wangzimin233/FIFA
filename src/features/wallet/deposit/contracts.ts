import { erc20Abi, maxUint256, type Address } from 'viem'

export const BSC_CHAIN_ID = 56
export const APPROVE_AMOUNT = maxUint256

export const CONTRACT_TYPE_DEPOSIT = 1
export const CONTRACT_TYPE_WITHDRAW = 2

export const usdtErc20Abi = erc20Abi

export function isAddressLike(value: string | undefined | null): value is Address {
  return typeof value === 'string' && value.startsWith('0x') && value.length === 42
}
