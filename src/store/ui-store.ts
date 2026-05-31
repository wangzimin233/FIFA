import { create } from 'zustand'

export type ChartRange = '24h' | '7d' | '30d'

interface UiStore {
  chartRange: ChartRange
  setChartRange: (range: ChartRange) => void
}

export const useUiStore = create<UiStore>((set) => ({
  chartRange: '7d',
  setChartRange: (range) => set({ chartRange: range }),
}))
