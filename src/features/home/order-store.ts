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

type OrderMarketMetadata = {
  eventSlug?: string
  marketId?: string
  marketSlug?: string
  conditionId?: string
}

export type WinnerSelection = BaseSelection & {
  template: 'winner'
  marketType: MatchMarketType
  negRisk?: boolean
  badge: string
  badgeLogo?: string
  subject: string
  shortLabel: string
  yesPrice: number
  noPrice: number
  yesOrderPrice?: number
  noOrderPrice?: number
  yesAssetId?: string
  noAssetId?: string
  activeSide: 'yes' | 'no'
} & OrderMarketMetadata

export type SpreadSelection = BaseSelection & {
  template: 'spread'
  marketType: MatchMarketType
  badge: string
  badgeLogo?: string
  homeBadge: string
  homeBadgeLogo?: string
  awayBadge: string
  awayBadgeLogo?: string
  homeShortLabel: string
  awayShortLabel: string
  homeTeam: string
  awayTeam: string
  activeVariantId: string
  variants: SpreadVariant[]
  activeTeamSide: 'home' | 'away'
} & OrderMarketMetadata

export type TotalSelection = BaseSelection & {
  template: 'total'
  marketType: MatchMarketType
  badge: string
  badgeLogo?: string
  activeLineId: string
  lines: TotalLine[]
  activeSide: 'over' | 'under'
} & OrderMarketMetadata

export type MarketSelection = WinnerSelection | SpreadSelection | TotalSelection

type SelectionOptions = {
  openPanel?: boolean
}

type PropositionSelectionInput = {
  contextType: OrderContextType
  sourceTab: HomeTab
  matchId: string
  eventSlug?: string
  marketId?: string
  marketSlug?: string
  conditionId?: string
  negRisk?: boolean
  title: string
  badge: string
  badgeLogo?: string
  subject: string
  shortLabel: string
  yesPrice: number
  noPrice: number
  yesOrderPrice?: number
  noOrderPrice?: number
  yesAssetId?: string
  noAssetId?: string
  activeSide?: 'yes' | 'no'
}

function getSpreadFavoredSide(variant: SpreadVariant): 'home' | 'away' {
  if (variant.favoredSide) {
    return variant.favoredSide
  }

  return variant.homeHandicap.startsWith('-') ? 'home' : 'away'
}

function getMatchEventSlug(match: MatchCard) {
  return match.slug
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
  eventSlug,
  marketId,
  marketSlug,
  conditionId,
  negRisk,
  badge,
  badgeLogo,
  subject,
  shortLabel,
  yesPrice,
  noPrice,
  yesOrderPrice,
  noOrderPrice,
  yesAssetId,
  noAssetId,
  activeSide = 'yes',
}: PropositionSelectionInput): WinnerSelection => ({
  contextType,
  sourceTab,
  template: 'winner',
  marketType: 'winner',
  matchId,
  eventSlug,
  marketId,
  marketSlug,
  conditionId,
  negRisk,
  title,
  badge,
  badgeLogo,
  subject,
  shortLabel,
  yesPrice,
  noPrice,
  yesOrderPrice,
  noOrderPrice,
  yesAssetId,
  noAssetId,
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
        eventSlug: outcome.eventSlug ?? getMatchEventSlug(match),
        marketId: outcome.marketId ?? outcome.id,
        marketSlug: outcome.marketSlug,
        conditionId: outcome.conditionId,
        negRisk: outcome.negRisk,
        badge: outcome.badge,
        badgeLogo: outcome.badgeLogo,
        subject: outcome.subject,
        shortLabel: outcome.shortLabel,
        yesPrice: outcome.yesPrice,
        noPrice: outcome.noPrice,
        yesOrderPrice: outcome.yesOrderPrice,
        noOrderPrice: outcome.noOrderPrice,
        yesAssetId: outcome.yesAssetId,
        noAssetId: outcome.noAssetId,
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
        eventSlug: getMatchEventSlug(match),
        title: match.matchup,
        badge: activeTeamSide === 'home' ? match.primaryFlag : match.secondaryFlag,
        badgeLogo: activeTeamSide === 'home' ? match.primaryLogo : match.secondaryLogo,
        homeBadge: match.primaryFlag,
        homeBadgeLogo: match.primaryLogo,
        awayBadge: match.secondaryFlag,
        awayBadgeLogo: match.secondaryLogo,
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

      const nextVariant =
        state.activeSelection.variants.find((variant) => variant.id === variantId) ??
        state.activeSelection.variants[0]
      const nextSide = nextVariant ? getSpreadFavoredSide(nextVariant) : state.activeSelection.activeTeamSide

      return {
        activeSelection: {
          ...state.activeSelection,
          activeVariantId: variantId,
          activeTeamSide: nextSide,
          badge: nextSide === 'home' ? state.activeSelection.homeBadge : state.activeSelection.awayBadge,
          badgeLogo:
            nextSide === 'home' ? state.activeSelection.homeBadgeLogo : state.activeSelection.awayBadgeLogo,
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
          badgeLogo:
            side === 'home' ? state.activeSelection.homeBadgeLogo : state.activeSelection.awayBadgeLogo,
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
        eventSlug: getMatchEventSlug(match),
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
