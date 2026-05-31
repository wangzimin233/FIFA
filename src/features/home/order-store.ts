import { create } from 'zustand'
import type { HomeTab, MatchCard, SpreadVariant, TotalLine, WinnerOutcome } from './home-data'

export type OrderContextType = 'match' | 'market'
export type MatchMarketType = 'winner' | 'spread' | 'total'

type BaseSelection = {
  contextType: OrderContextType
  sourceTab: HomeTab
  matchId: string
  title: string
}

export type WinnerSelection = BaseSelection & {
  template: 'winner'
  marketType: MatchMarketType
  badge: string
  subject: string
  shortLabel: string
  yesPrice: number
  noPrice: number
  activeSide: 'yes' | 'no'
}

export type SpreadSelection = BaseSelection & {
  template: 'spread'
  marketType: MatchMarketType
  badge: string
  homeBadge: string
  awayBadge: string
  homeShortLabel: string
  awayShortLabel: string
  homeTeam: string
  awayTeam: string
  activeVariantId: string
  variants: SpreadVariant[]
  activeTeamSide: 'home' | 'away'
}

export type TotalSelection = BaseSelection & {
  template: 'total'
  marketType: MatchMarketType
  badge: string
  activeLineId: string
  lines: TotalLine[]
  activeSide: 'over' | 'under'
}

export type MarketSelection = WinnerSelection | SpreadSelection | TotalSelection

type SelectionOptions = {
  openPanel?: boolean
}

type PropositionSelectionInput = {
  contextType: OrderContextType
  sourceTab: HomeTab
  matchId: string
  title: string
  badge: string
  subject: string
  shortLabel: string
  yesPrice: number
  noPrice: number
  activeSide?: 'yes' | 'no'
}

interface OrderStore {
  activeSelection: MarketSelection | null
  amount: number
  isPanelOpen: boolean
  selectProposition: (input: PropositionSelectionInput, options?: SelectionOptions) => void
  selectWinner: (
    match: MatchCard,
    outcome: WinnerOutcome,
    activeSide?: 'yes' | 'no',
    options?: SelectionOptions,
  ) => void
  setWinnerSide: (side: 'yes' | 'no') => void
  selectSpread: (
    match: MatchCard,
    variantId: string,
    activeTeamSide?: 'home' | 'away',
    options?: SelectionOptions,
  ) => void
  setSpreadVariant: (variantId: string) => void
  setSpreadTeamSide: (side: 'home' | 'away') => void
  selectTotal: (
    match: MatchCard,
    lineId: string,
    activeSide?: 'over' | 'under',
    options?: SelectionOptions,
  ) => void
  setTotalLine: (lineId: string) => void
  setTotalSide: (side: 'over' | 'under') => void
  setAmount: (amount: number) => void
  addAmount: (delta: number) => void
  closePanel: () => void
  clearSelection: () => void
}

const buildWinnerSelection = ({
  contextType,
  sourceTab,
  matchId,
  title,
  badge,
  subject,
  shortLabel,
  yesPrice,
  noPrice,
  activeSide = 'yes',
}: PropositionSelectionInput): WinnerSelection => ({
  contextType,
  sourceTab,
  template: 'winner',
  marketType: 'winner',
  matchId,
  title,
  badge,
  subject,
  shortLabel,
  yesPrice,
  noPrice,
  activeSide,
})

export const useOrderStore = create<OrderStore>((set) => ({
  activeSelection: null,
  amount: 0,
  isPanelOpen: false,
  selectProposition: (input, options) =>
    set({
      activeSelection: buildWinnerSelection(input),
      amount: 0,
      isPanelOpen: options?.openPanel ?? true,
    }),
  selectWinner: (match, outcome, activeSide = 'yes', options) =>
    set({
      activeSelection: buildWinnerSelection({
        contextType: 'match',
        sourceTab: 'matches',
        matchId: match.id,
        title: match.matchup,
        badge: outcome.badge,
        subject: outcome.subject,
        shortLabel: outcome.shortLabel,
        yesPrice: outcome.yesPrice,
        noPrice: outcome.noPrice,
        activeSide,
      }),
      amount: 0,
      isPanelOpen: options?.openPanel ?? true,
    }),
  setWinnerSide: (side) =>
    set((state) => {
      if (!state.activeSelection || state.activeSelection.template !== 'winner') {
        return state
      }

      return {
        activeSelection: {
          ...state.activeSelection,
          activeSide: side,
        },
      }
    }),
  selectSpread: (match, variantId, activeTeamSide = 'home', options) =>
    set({
      activeSelection: {
        contextType: 'match',
        sourceTab: 'matches',
        template: 'spread',
        marketType: 'spread',
        matchId: match.id,
        title: match.matchup,
        badge: activeTeamSide === 'home' ? match.primaryFlag : match.secondaryFlag,
        homeBadge: match.primaryFlag,
        awayBadge: match.secondaryFlag,
        homeShortLabel: match.winnerMarket.outcomes[0]?.shortLabel ?? match.primaryTeam.slice(0, 3).toUpperCase(),
        awayShortLabel: match.winnerMarket.outcomes[2]?.shortLabel ?? match.secondaryTeam.slice(0, 3).toUpperCase(),
        homeTeam: match.primaryTeam,
        awayTeam: match.secondaryTeam,
        activeVariantId: variantId,
        variants: match.spreadMarket.variants,
        activeTeamSide,
      },
      amount: 0,
      isPanelOpen: options?.openPanel ?? true,
    }),
  setSpreadVariant: (variantId) =>
    set((state) => {
      if (!state.activeSelection || state.activeSelection.template !== 'spread') {
        return state
      }

      return {
        activeSelection: {
          ...state.activeSelection,
          activeVariantId: variantId,
        },
      }
    }),
  setSpreadTeamSide: (side) =>
    set((state) => {
      if (!state.activeSelection || state.activeSelection.template !== 'spread') {
        return state
      }

      return {
        activeSelection: {
          ...state.activeSelection,
          activeTeamSide: side,
          badge: side === 'home' ? state.activeSelection.homeBadge : state.activeSelection.awayBadge,
        },
      }
    }),
  selectTotal: (match, lineId, activeSide = 'over', options) =>
    set({
      activeSelection: {
        contextType: 'match',
        sourceTab: 'matches',
        template: 'total',
        marketType: 'total',
        matchId: match.id,
        title: 'Over vs Under',
        badge: 'O/U',
        activeLineId: lineId,
        lines: match.totalMarket.lines,
        activeSide,
      },
      amount: 0,
      isPanelOpen: options?.openPanel ?? true,
    }),
  setTotalLine: (lineId) =>
    set((state) => {
      if (!state.activeSelection || state.activeSelection.template !== 'total') {
        return state
      }

      return {
        activeSelection: {
          ...state.activeSelection,
          activeLineId: lineId,
        },
      }
    }),
  setTotalSide: (side) =>
    set((state) => {
      if (!state.activeSelection || state.activeSelection.template !== 'total') {
        return state
      }

      return {
        activeSelection: {
          ...state.activeSelection,
          activeSide: side,
        },
      }
    }),
  setAmount: (amount) => set({ amount: Number.isFinite(amount) ? Math.max(0, amount) : 0 }),
  addAmount: (delta) => set((state) => ({ amount: Math.max(0, state.amount + delta) })),
  closePanel: () => set({ isPanelOpen: false }),
  clearSelection: () => set({ activeSelection: null, amount: 0, isPanelOpen: false }),
}))
