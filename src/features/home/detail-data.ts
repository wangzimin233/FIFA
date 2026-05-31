import { marketCards, matchGroups, type MatchCard, type SpreadVariant, type TotalLine, type WinnerOutcome } from './home-data'

export type MatchDetailProposition = {
  id: string
  title: string
  volumeLabel: string
  badge: string
  shortLabel: string
  subject: string
  yesPrice: number
  noPrice: number
}

export type MatchDetailThreeWay = {
  id: string
  title: string
  volumeLabel: string
  outcomes: WinnerOutcome[]
}

export type MatchDetail = {
  match: MatchCard
  countdownLabel: string
  headerTimeLabel: string
  headerDateLabel: string
  moneylineVolumeLabel: string
  spreadVolumeLabel: string
  totalVolumeLabel: string
  spreadVariants: SpreadVariant[]
  totalLines: TotalLine[]
  bothTeamsToScore: MatchDetailProposition
  exactScores: MatchDetailProposition[]
  halftimeResult: MatchDetailThreeWay
}

export const allMatches = matchGroups.flatMap((group) => group.matches)

export function getMatchById(matchId: string) {
  return allMatches.find((match) => match.id === matchId)
}

export function getMarketCardById(marketId: string) {
  return marketCards.find((card) => card.id === marketId)
}

const defaultExactScores = (match: MatchCard): MatchDetailProposition[] => [
  {
    id: `${match.id}-exact-0-0`,
    title: 'Exact Score: 0-0',
    volumeLabel: '$104 交易量',
    badge: match.primaryFlag,
    shortLabel: '0-0',
    subject: 'Exact Score: 0-0',
    yesPrice: 11,
    noPrice: 98,
  },
  {
    id: `${match.id}-exact-0-1`,
    title: 'Exact Score: 0-1',
    volumeLabel: '$17 交易量',
    badge: match.secondaryFlag,
    shortLabel: '0-1',
    subject: 'Exact Score: 0-1',
    yesPrice: 10,
    noPrice: 98.9,
  },
  {
    id: `${match.id}-exact-1-0`,
    title: 'Exact Score: 1-0',
    volumeLabel: '$9 交易量',
    badge: match.primaryFlag,
    shortLabel: '1-0',
    subject: 'Exact Score: 1-0',
    yesPrice: 8,
    noPrice: 94,
  },
  {
    id: `${match.id}-exact-1-1`,
    title: 'Exact Score: 1-1',
    volumeLabel: '$0 交易量',
    badge: '◌',
    shortLabel: '1-1',
    subject: 'Exact Score: 1-1',
    yesPrice: 8,
    noPrice: 94,
  },
]

const defaultHalftimeOutcomes = (match: MatchCard): WinnerOutcome[] => [
  {
    id: `${match.id}-halftime-home`,
    shortLabel: match.winnerMarket.outcomes[0]?.shortLabel ?? match.primaryTeam.slice(0, 3).toUpperCase(),
    subject: match.primaryTeam,
    badge: match.primaryFlag,
    yesPrice: Math.min(99, (match.winnerMarket.outcomes[0]?.yesPrice ?? 50) + 2),
    noPrice: 42,
    tone: 'emerald',
  },
  {
    id: `${match.id}-halftime-draw`,
    shortLabel: 'DRAW',
    subject: 'Draw',
    badge: '◌',
    yesPrice: 46,
    noPrice: 55,
    tone: 'slate',
  },
  {
    id: `${match.id}-halftime-away`,
    shortLabel: match.winnerMarket.outcomes[2]?.shortLabel ?? match.secondaryTeam.slice(0, 3).toUpperCase(),
    subject: match.secondaryTeam,
    badge: match.secondaryFlag,
    yesPrice: Math.min(99, (match.winnerMarket.outcomes[2]?.yesPrice ?? 30) + 34),
    noPrice: 54,
    tone: 'slate',
  },
]

export function getMatchDetail(matchId: string): MatchDetail | null {
  const match = getMatchById(matchId)

  if (!match) {
    return null
  }

  return {
    match,
    countdownLabel: '12天 3时',
    headerTimeLabel: match.timeLabel,
    headerDateLabel: '六月 12',
    moneylineVolumeLabel: '$48.7K 交易量',
    spreadVolumeLabel: '$1.2K 交易量',
    totalVolumeLabel: '$1.7K 交易量',
    spreadVariants: match.spreadMarket.variants,
    totalLines: match.totalMarket.lines,
    bothTeamsToScore: {
      id: `${match.id}-btts`,
      title: 'Both Teams to Score?',
      volumeLabel: '$1.3K 交易量',
      badge: '⚽',
      shortLabel: 'BTTS',
      subject: 'Both Teams to Score?',
      yesPrice: 44,
      noPrice: 58,
    },
    exactScores: defaultExactScores(match),
    halftimeResult: {
      id: `${match.id}-halftime`,
      title: 'Halftime Result',
      volumeLabel: '$0 交易量',
      outcomes: defaultHalftimeOutcomes(match),
    },
  }
}
