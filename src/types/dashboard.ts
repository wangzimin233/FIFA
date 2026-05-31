export interface DashboardChain {
  color: string
  name: string
  share: number
  users: number
  volumeUsd: number
}

export interface DashboardTrendPoint {
  label: string
  volumeUsd: number
  wallets: number
}

export interface DashboardOverview {
  activeUsers: number
  averageGasUsd: number
  chains: DashboardChain[]
  generatedAt: string
  totalVolumeUsd: number
  treasuryWei: string
  trends: DashboardTrendPoint[]
  walletSuccessRate: number
}
