import {
  marketCards,
  matchGroups,
  type MatchCard,
  type OrderTextMetadata,
  type SpreadVariant,
  type TotalLine,
  type WinnerOutcome,
} from './home-data'
import i18n from '../../config/i18n'

export type MatchDetailProposition = OrderTextMetadata & {
  id: string
  eventSlug?: string
  marketId?: string
  marketSlug?: string
  conditionId?: string
  acceptingOrders?: boolean
  negRisk?: boolean
  title: string
  volumeLabel: string
  badge: string
  badgeLogo?: string
  shortLabel: string
  subject: string
  yesPrice: number
  noPrice: number
  yesOrderPrice?: number
  noOrderPrice?: number
  yesAssetId?: string
  noAssetId?: string
}

export type MatchDetailThreeWay = {
  id: string
  title: string
  volumeLabel: string
  outcomes: WinnerOutcome[]
}

export type MatchDetailCornerOutcome = {
  id: string
  side: 'yes' | 'no'
  label: string
  labelZh?: string
  price: number
  orderPrice?: number
  assetId?: string
}

export type MatchDetailCornerMarket = OrderTextMetadata & {
  id: string
  eventSlug?: string
  marketId?: string
  marketSlug?: string
  conditionId?: string
  acceptingOrders?: boolean
  negRisk?: boolean
  title: string
  titleZh?: string
  shortLabel: string
  subject: string
  volumeLabel: string
  badge: string
  badgeLogo?: string
  yesPrice: number
  noPrice: number
  yesOrderPrice?: number
  noOrderPrice?: number
  yesAssetId?: string
  noAssetId?: string
  outcomes: MatchDetailCornerOutcome[]
}

export type MatchDetailCornerGroup = {
  key: string
  title: string
  volumeLabel: string
  markets: MatchDetailCornerMarket[]
}

export type MatchDetail = {
  match: MatchCard
  countdownLabel: string
  scoreLabel?: string
  live?: boolean | null
  statusLabel: string
  headerTimeLabel: string
  headerDateLabel: string
  contextDescription?: string
  moneylineVolumeLabel: string
  spreadVolumeLabel?: string
  totalVolumeLabel?: string
  spreadVariants: SpreadVariant[]
  totalLines: TotalLine[]
  bothTeamsToScore?: MatchDetailProposition
  exactScores: MatchDetailProposition[]
  halftimeResult?: MatchDetailThreeWay
  cornerGroups: MatchDetailCornerGroup[]
}

export const allMatches = matchGroups.flatMap((group) => group.matches)

export function getMatchById(matchId: string) {
  return allMatches.find((match) => match.id === matchId)
}

export function getMarketCardById(marketId: string) {
  return marketCards.find((card) => card.id === marketId)
}

export function buildMatchDetail(
  match: MatchCard,
  overrides?: Partial<
    Pick<
      MatchDetail,
      | 'countdownLabel'
      | 'scoreLabel'
      | 'live'
      | 'statusLabel'
      | 'headerTimeLabel'
      | 'headerDateLabel'
      | 'contextDescription'
      | 'moneylineVolumeLabel'
      | 'spreadVolumeLabel'
      | 'totalVolumeLabel'
      | 'spreadVariants'
      | 'totalLines'
      | 'bothTeamsToScore'
      | 'exactScores'
      | 'halftimeResult'
      | 'cornerGroups'
    >
  >,
  language?: string,
): MatchDetail {
  const countdownLabel = overrides?.countdownLabel ?? i18n.t('dataLabels.countdown', { lng: language, days: 12, hours: 3 })

  return {
    match,
    countdownLabel,
    scoreLabel: overrides?.scoreLabel,
    live: overrides?.live,
    statusLabel: overrides?.statusLabel ?? countdownLabel,
    headerTimeLabel: overrides?.headerTimeLabel ?? match.timeLabel,
    headerDateLabel: overrides?.headerDateLabel ?? match.date,
    contextDescription: overrides?.contextDescription,
    moneylineVolumeLabel: overrides?.moneylineVolumeLabel ?? i18n.t('dataLabels.volume', { lng: language, value: '$48.7K' }),
    spreadVolumeLabel: overrides?.spreadVolumeLabel,
    totalVolumeLabel: overrides?.totalVolumeLabel,
    spreadVariants: overrides?.spreadVariants ?? [],
    totalLines: overrides?.totalLines ?? [],
    bothTeamsToScore: overrides?.bothTeamsToScore,
    exactScores: overrides?.exactScores ?? [],
    halftimeResult: overrides?.halftimeResult,
    cornerGroups: overrides?.cornerGroups ?? [],
  }
}

export function getMatchDetail(matchId: string): MatchDetail | null {
  const match = getMatchById(matchId)

  if (!match) {
    return null
  }

  return buildMatchDetail(match, {
    headerDateLabel: i18n.t('dataLabels.sampleHeaderDate'),
  })
}
