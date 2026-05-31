import { apiClient } from '../../../lib/api-client'
import type { DashboardOverview } from '../../../types/dashboard'

export async function getDashboardOverview() {
  const response = await apiClient.get<DashboardOverview>('/mock/overview.json')
  return response.data
}
