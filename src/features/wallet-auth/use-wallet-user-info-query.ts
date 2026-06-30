import { useQuery } from '@tanstack/react-query'
import {
  getWalletUserInfo,
  type WalletUserAssetItem,
  type WalletUserInfoResponse,
} from './api'
import { useWalletAuthStore } from './auth-store'

export function getBscUsdtAsset(walletUser?: WalletUserInfoResponse | null): WalletUserAssetItem | undefined {
  return walletUser?.assets.find(
    (asset) => asset.chainCode === 'BSC' && asset.coinCode.toUpperCase() === 'USDT',
  )
}

export function formatWalletBalanceCurrency(value?: string) {
  const normalizedValue = value?.trim()
  if (!normalizedValue) {
    return '--'
  }

  const numericValue = Number(normalizedValue)
  if (!Number.isFinite(numericValue)) {
    return `$${normalizedValue}`
  }

  return `$${new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(numericValue)}`
}

export function useWalletUserInfoQuery({ enabled = true }: { enabled?: boolean } = {}) {
  const session = useWalletAuthStore((state) => state.session)

  return useQuery({
    queryKey: ['wallet-user-info', session?.token ?? null],
    queryFn: getWalletUserInfo,
    enabled: enabled && Boolean(session?.token),
  })
}
