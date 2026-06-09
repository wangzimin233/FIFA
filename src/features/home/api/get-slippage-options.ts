import { apiClient } from '../../../lib/api-client'

type ApiResult<T> = {
  code?: number
  message?: string
  data?: T | null
}

export async function getSlippageOptions() {
  const response = await apiClient.get<ApiResult<number[]>>('/api/world-cup/slippage-options')
  const options = response.data.data ?? []

  return options.filter((option) => Number.isFinite(option) && option >= 0)
}
