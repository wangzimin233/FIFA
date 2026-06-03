import { formatUnits as formatEthersUnits } from 'ethers'
import { getAddress, isAddress } from 'viem'

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 100 ? 0 : 2,
  }).format(value)
}

export function formatTokenAmount(value: string, decimals = 18) {
  const amount = Number(formatEthersUnits(value, decimals))

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(amount)
}

export function shortenAddress(address?: string) {
  if (!address) {
    return 'Not connected'
  }

  if (!isAddress(address, { strict: false })) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const checksum = getAddress(address)
  return `${checksum.slice(0, 6)}...${checksum.slice(-4)}`
}

export function shortenHash(hash?: string) {
  if (!hash) {
    return '--'
  }

  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}
