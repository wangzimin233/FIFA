import { apiClient } from '../../../lib/api-client'
import type { MatchCard, WinnerOutcome } from '../home-data'

export type WorldCupGameMarket = {
  id: string | number
  question?: string
  conditionId?: string
  slug?: string
  resolutionSource?: string
  endDate?: string
  liquidity?: number | string
  startDate?: string
  image?: string
  icon?: string
  description?: string
  groupItemTitle?: string
  groupItemTitleZh?: string
  groupItemThreshold?: string
  name?: string
  outcomes?: string[] | string
  outcomePrices?: string[] | string
  decimalOdds?: number[] | string[] | string
  price?: number | string
  volume?: number | string
  active?: boolean
  closed?: boolean
  marketMakerAddress?: string
  createdAt?: string
  updatedAt?: string
  new?: boolean
  featured?: boolean
  submitted_by?: string
  archived?: boolean
  resolvedBy?: string
  restricted?: boolean
  questionID?: string
  enableOrderBook?: boolean
  orderPriceMinTickSize?: number
  orderMinSize?: number
  volumeNum?: number
  liquidityNum?: number
  endDateIso?: string
  startDateIso?: string
  hasReviewedDates?: boolean
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  volume1yr?: number
  gameStartTime?: string
  secondsDelay?: number
  clobTokenIds?: string[] | string
  positionIds?: string[]
  umaBond?: string
  umaReward?: string
  volume24hrClob?: number
  volume1wkClob?: number
  volume1moClob?: number
  volume1yrClob?: number
  volumeClob?: number
  liquidityClob?: number
  makerBaseFee?: number
  takerBaseFee?: number
  customLiveness?: number
  acceptingOrders?: boolean
  negRisk?: boolean
  negRiskMarketID?: string
  negRiskRequestID?: string
  ready?: boolean
  funded?: boolean
  acceptingOrdersTimestamp?: string
  cyom?: boolean
  competitive?: number
  pagerDutyNotificationEnabled?: boolean
  approved?: boolean
  clobRewards?: Array<{
    id?: string | number
    conditionId?: string
    assetAddress?: string
    rewardsAmount?: number
    rewardsDailyRate?: number
    startDate?: string
    endDate?: string
  }>
  rewardsMinSize?: number
  rewardsMaxSpread?: number
  spread?: number
  oneHourPriceChange?: number
  oneDayPriceChange?: number
  oneWeekPriceChange?: number
  oneMonthPriceChange?: number
  lastTradePrice?: number
  bestBid?: number
  bestAsk?: number
  automaticallyActive?: boolean
  seriesColor?: string
  showGmpSeries?: boolean
  showGmpOutcome?: boolean
  clearBookOnStart?: boolean
  manualActivation?: boolean
  negRiskOther?: boolean
  sportsMarketType?: string
  umaResolutionStatuses?: string[] | string
  pendingDeployment?: boolean
  deploying?: boolean
  deployingTimestamp?: string
  rfqEnabled?: boolean
  holdingRewardsEnabled?: boolean
  feesEnabled?: boolean
  requiresTranslation?: boolean
  feeType?: string
  line?: number
  feeSchedule?: {
    exponent?: number
    rate?: number
    takerOnly?: boolean
    rebateRate?: number
  }
}

export type WorldCupGameTeam = {
  id?: string | number
  name?: string
  league?: string
  record?: string
  logo?: string
  abbreviation?: string
  createdAt?: string
  updatedAt?: string
  providerId?: number
  color?: string
  ordering?: 'home' | 'away' | string
}

export type WorldCupGameSeries = {
  id?: string | number
  ticker?: string
  slug?: string
  title?: string
  seriesType?: string
  recurrence?: string
  active?: boolean
  closed?: boolean
  archived?: boolean
  featured?: boolean
  restricted?: boolean
  createdAt?: string
  updatedAt?: string
  volume24hr?: number
  volume?: number
  liquidity?: number
  commentCount?: number
  requiresTranslation?: boolean
}

export type WorldCupGameTag = {
  id?: string | number
  label?: string
  slug?: string
  forceShow?: boolean
  publishedAt?: string
  updatedBy?: number
  createdAt?: string
  updatedAt?: string
  forceHide?: boolean
  requiresTranslation?: boolean
}

export type WorldCupGameSport = {
  id?: string | number
  sport?: string
  image?: string
  resolution?: string
  ordering?: string
  tags?: string
  series?: string
  createdAt?: string
}

export type WorldCupEventMetadata = {
  context_description?: string
  context_requires_regen?: boolean
  context_updated_at?: string
}

export type WorldCupGameEvent = {
  id: string | number
  ticker?: string
  slug?: string
  title?: string
  description?: string
  resolutionSource?: string
  eventDate?: string
  eventWeek?: number
  gameId?: number
  startTime?: string
  startDate?: string
  creationDate?: string
  endDate?: string
  image?: string
  icon?: string
  active?: boolean
  closed?: boolean
  archived?: boolean
  new?: boolean
  featured?: boolean
  restricted?: boolean
  liquidity?: number
  volume?: number | string
  openInterest?: number
  createdAt?: string
  updatedAt?: string
  competitive?: number
  volume24hr?: number
  volume1wk?: number
  volume1mo?: number
  volume1yr?: number
  enableOrderBook?: boolean
  liquidityClob?: number
  negRisk?: boolean
  negRiskMarketID?: string
  commentCount?: number
  gameMarketCount?: number
  markets?: WorldCupGameMarket[]
  series?: WorldCupGameSeries[]
  tags?: WorldCupGameTag[]
  cyom?: boolean
  showAllOutcomes?: boolean
  showMarketImages?: boolean
  enableNegRisk?: boolean
  automaticallyActive?: boolean
  gmpChartMode?: string
  featuredOrder?: number
  estimateValue?: boolean
  cumulativeMarkets?: boolean
  seriesSlug?: string
  negRiskAugmented?: boolean
  pendingDeployment?: boolean
  deploying?: boolean
  deployingTimestamp?: string
  requiresTranslation?: boolean
  teams?: WorldCupGameTeam[]
  eventMetadata?: WorldCupEventMetadata
  sport?: WorldCupGameSport
  relatedEvents?: WorldCupGameEvent[]
  parentEventId?: string | number
}

export type WorldCupGamesApiEnvelope = {
  code: number
  message: string
  data?: {
    events?: WorldCupGameEvent[]
    page?: number
    pageNum?: number
    pageSize?: number
    total?: number
    hasNext?: boolean
    nextCursor?: string
    sourceLimit?: number
    sourceEventsScanned?: number
  }
}

export type WorldCupGamesQuery = {
  page: number
  pageSize: number
  language?: string
}

export type WorldCupGamesResult = {
  list: MatchCard[]
  total: number
  page: number
  pageSize: number
  hasNext: boolean
}

const codeFlagMap: Record<string, string> = {
  arg: '🇦🇷',
  aus: '🇦🇺',
  bih: '🇧🇦',
  bra: '🇧🇷',
  can: '🇨🇦',
  che: '🇨🇭',
  cze: '🇨🇿',
  ger: '🇩🇪',
  hai: '🇭🇹',
  jpn: '🇯🇵',
  kor: '🇰🇷',
  kr: '🇰🇷',
  mar: '🇲🇦',
  mex: '🇲🇽',
  nld: '🇳🇱',
  par: '🇵🇾',
  qat: '🇶🇦',
  rsa: '🇿🇦',
  sco: '🏴',
  sui: '🇨🇭',
  tur: '🇹🇷',
  usa: '🇺🇸',
}

export function formatTimeLabel(value?: string) {
  if (!value) {
    return '--:--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function formatDateLabel(value?: string) {
  if (!value) {
    return '待定'
  }

  const normalizedDateValue = /^\d{4}-\d{2}-\d{2}/.test(value)
    ? `${value.slice(0, 10)}T00:00:00Z`
    : value
  const date = new Date(normalizedDateValue)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatVolumeLabel(value?: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value
  if (!amount || Number.isNaN(amount)) {
    return '$0 交易量'
  }

  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B 交易量`
  }

  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M 交易量`
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K 交易量`
  }

  return `$${amount.toFixed(2)} 交易量`
}

function parseNumericValue(value?: number | string) {
  const amount = typeof value === 'string' ? Number(value) : value
  return amount && Number.isFinite(amount) ? amount : 0
}

export function getMarketVolumeNumTotal(markets?: WorldCupGameMarket[]) {
  return markets?.reduce((sum, market) => sum + parseNumericValue(market.volumeNum), 0) ?? 0
}

export function parseJsonStringArray(value?: Array<string | number> | string) {
  if (Array.isArray(value)) {
    return value.map(String)
  }

  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export function parsePriceToCents(value?: string | number) {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (numeric === undefined || Number.isNaN(numeric)) {
    return 50
  }

  return Math.round(numeric * 1000) / 10
}

function parseDecimalOdds(value?: string | number) {
  const numeric = typeof value === 'string' ? Number(value) : value
  return numeric !== undefined && Number.isFinite(numeric) && numeric > 0
    ? Math.round(numeric * 100) / 100
    : null
}

function convertPriceToDecimalOdds(value?: string | number) {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (numeric === undefined || Number.isNaN(numeric) || numeric <= 0) {
    return null
  }

  return Math.round((1 / numeric) * 100) / 100
}

function splitMatchTitle(title?: string) {
  if (!title) {
    return { home: 'Home', away: 'Away' }
  }

  const parts = title.split(/\s+vs\.?\s+/i)
  return {
    home: parts[0] || 'Home',
    away: parts[1] || 'Away',
  }
}

function getOrderedTeams(event: WorldCupGameEvent) {
  const home = event.teams?.find((team) => team.ordering === 'home')
  const away = event.teams?.find((team) => team.ordering === 'away')

  return { home, away }
}

export function getYesNoPrices(market: WorldCupGameMarket) {
  const decimalOdds = parseJsonStringArray(market.decimalOdds)
  const outcomePrices = parseJsonStringArray(market.outcomePrices)
  const yesFallbackOdds = convertPriceToDecimalOdds(outcomePrices[0] ?? market.price)
  const noFallbackOdds = convertPriceToDecimalOdds(outcomePrices[1])

  return {
    yesPrice: parseDecimalOdds(decimalOdds[0]) ?? yesFallbackOdds ?? 2,
    noPrice: parseDecimalOdds(decimalOdds[1]) ?? noFallbackOdds ?? 2,
  }
}

export function getYesNoOrderPrices(market: WorldCupGameMarket) {
  const outcomePrices = parseJsonStringArray(market.outcomePrices)
  return {
    yesOrderPrice: parsePriceToCents(outcomePrices[0] ?? market.price),
    noOrderPrice: parsePriceToCents(outcomePrices[1]),
  }
}

export function getYesNoAssetIds(market: WorldCupGameMarket) {
  const clobTokenIds = parseJsonStringArray(market.clobTokenIds)
  return {
    yesAssetId: clobTokenIds[0],
    noAssetId: clobTokenIds[1],
  }
}

export function getOrderMarketId(market: WorldCupGameMarket) {
  return market.conditionId
}

export function getEventType(event: WorldCupGameEvent) {
  return event.markets?.[0]?.sportsMarketType ?? ''
}

export function hasMarketType(event: WorldCupGameEvent, type: string) {
  return event.markets?.some((market) => market.sportsMarketType === type) ?? false
}

function parseLineValue(market: WorldCupGameMarket) {
  if (typeof market.line === 'number' && Number.isFinite(market.line)) {
    return market.line
  }

  const source = market.question ?? market.groupItemTitle ?? ''
  const match = source.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) {
    return null
  }

  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function formatLineNumber(value: number) {
  const normalized = Math.abs(value)
  return Number.isInteger(normalized) ? String(normalized) : String(normalized)
}

function formatHandicap(value: number) {
  const normalized = formatLineNumber(value)
  return value > 0 ? `+${normalized}` : `-${normalized}`
}

function getRecordLabel(record?: string) {
  return record?.trim() || 'vs'
}

function getTeamCodes(event: WorldCupGameEvent) {
  const token = event.ticker ?? event.slug ?? ''
  const parts = token.split('-')

  return {
    homeCode: parts[1]?.toLowerCase() ?? '',
    awayCode: parts[2]?.toLowerCase() ?? '',
  }
}

function getFlagFromCode(code: string) {
  return codeFlagMap[code] ?? '🏳️'
}

export function isZhLanguage(language?: string) {
  return language?.toLowerCase().startsWith('zh') ?? false
}

export function getLocalizedGroupItemTitle(market: WorldCupGameMarket, language?: string) {
  const zhTitle = market.groupItemTitleZh?.trim()
  const enTitle = market.groupItemTitle?.trim()

  return isZhLanguage(language) ? zhTitle || enTitle : enTitle || zhTitle
}

function getWinnerTeamMarket(event: WorldCupGameEvent, teamName: string) {
  return event.markets?.find((market) => {
    const label = market.groupItemTitle?.trim()
    return label?.toLowerCase() === teamName.toLowerCase()
  })
}

function getLocalizedTeamName(
  market: WorldCupGameMarket | undefined,
  fallbackName: string,
  language?: string,
) {
  return getLocalizedGroupItemTitle(market, language) || fallbackName
}

function createFallbackOutcome(id: string, label: string, subject: string, badge: string, tone: WinnerOutcome['tone']): WinnerOutcome {
  return {
    id,
    shortLabel: label,
    subject,
    badge,
    yesPrice: 2,
    noPrice: 2,
    yesOrderPrice: 50,
    noOrderPrice: 50,
    tone,
  }
}

function normalizeWinnerOutcomes(
  event: WorldCupGameEvent,
  homeTeam: string,
  awayTeam: string,
  homeFlag: string,
  awayFlag: string,
  homeLogo?: string,
  awayLogo?: string,
) {
  const homeCode = homeTeam.slice(0, 3).toUpperCase()
  const awayCode = awayTeam.slice(0, 3).toUpperCase()
  const fallback = {
    home: createFallbackOutcome(`${event.id}-winner-home`, homeCode, homeTeam, homeFlag, 'emerald'),
    draw: createFallbackOutcome(`${event.id}-winner-draw`, 'DRAW', 'Draw', '◌', 'slate'),
    away: createFallbackOutcome(`${event.id}-winner-away`, awayCode, awayTeam, awayFlag, 'emerald'),
  }

  for (const market of event.markets ?? []) {
    const label = (market.groupItemTitle ?? '').trim()
    const { yesPrice, noPrice } = getYesNoPrices(market)
    const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
    const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

    if (/draw/i.test(label)) {
      fallback.draw = {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        shortLabel: 'DRAW',
        subject: 'Draw',
        badge: '◌',
        yesPrice,
        noPrice,
        yesOrderPrice,
        noOrderPrice,
        yesAssetId,
        noAssetId,
        tone: 'slate',
      }
      continue
    }

    if (label.toLowerCase() === homeTeam.toLowerCase()) {
      fallback.home = {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        shortLabel: homeCode,
        subject: homeTeam,
        badge: homeFlag,
        badgeLogo: homeLogo,
        yesPrice,
        noPrice,
        yesOrderPrice,
        noOrderPrice,
        yesAssetId,
        noAssetId,
        tone: 'emerald',
      }
      continue
    }

    if (label.toLowerCase() === awayTeam.toLowerCase()) {
      fallback.away = {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        shortLabel: awayCode,
        subject: awayTeam,
        badge: awayFlag,
        badgeLogo: awayLogo,
        yesPrice,
        noPrice,
        yesOrderPrice,
        noOrderPrice,
        yesAssetId,
        noAssetId,
        tone: 'emerald',
      }
    }
  }

  return [fallback.home, fallback.draw, fallback.away]
}

export function buildSpreadVariants(
  event: WorldCupGameEvent | undefined,
  match: Pick<MatchCard, 'primaryTeam' | 'secondaryTeam' | 'primaryTeamSourceName' | 'secondaryTeamSourceName'>,
) {
  if (!event?.markets?.length) {
    return undefined
  }

  const homeName = (match.primaryTeamSourceName ?? match.primaryTeam).toLowerCase()
  const awayName = (match.secondaryTeamSourceName ?? match.secondaryTeam).toLowerCase()

  const variants = event.markets
    .filter((market) => market.sportsMarketType === 'spreads')
    .map((market) => {
      const lineValue = parseLineValue(market)
      if (lineValue === null) {
        return null
      }

      const source = `${market.groupItemTitle ?? ''} ${market.question ?? ''}`.toLowerCase()
      const favoredSide: 'home' | 'away' =
        source.includes(awayName) && !source.includes(homeName)
          ? 'away'
          : 'home'
      const { yesPrice, noPrice } = getYesNoPrices(market)
      const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)
      const oppositeLineValue = lineValue * -1

      return {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        displayLine: formatLineNumber(lineValue),
        homeHandicap: favoredSide === 'home' ? formatHandicap(lineValue) : formatHandicap(oppositeLineValue),
        awayHandicap: favoredSide === 'away' ? formatHandicap(lineValue) : formatHandicap(oppositeLineValue),
        homePrice: favoredSide === 'home' ? yesPrice : noPrice,
        awayPrice: favoredSide === 'away' ? yesPrice : noPrice,
        homeOrderPrice: favoredSide === 'home' ? yesOrderPrice : noOrderPrice,
        awayOrderPrice: favoredSide === 'away' ? yesOrderPrice : noOrderPrice,
        homeAssetId: favoredSide === 'home' ? yesAssetId : noAssetId,
        awayAssetId: favoredSide === 'away' ? yesAssetId : noAssetId,
        favoredSide,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return variants.length ? variants : undefined
}

export function buildTotalLines(event: WorldCupGameEvent | undefined) {
  if (!event?.markets?.length) {
    return undefined
  }

  const lines = event.markets
    .filter((market) => market.sportsMarketType === 'totals')
    .map((market) => {
      const lineValue = parseLineValue(market)
      if (lineValue === null) {
        return null
      }

      const { yesPrice, noPrice } = getYesNoPrices(market)
      const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)
      return {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        line: formatLineNumber(lineValue),
        overPrice: yesPrice,
        underPrice: noPrice,
        overOrderPrice: yesOrderPrice,
        underOrderPrice: noOrderPrice,
        overAssetId: yesAssetId,
        underAssetId: noAssetId,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => Number(left.line) - Number(right.line))

  return lines.length ? lines : undefined
}

export function normalizeGame(event: WorldCupGameEvent, language?: string): MatchCard {
  const { home: titleHome, away: titleAway } = splitMatchTitle(event.title)
  const { home: homeTeamData, away: awayTeamData } = getOrderedTeams(event)
  const { homeCode: fallbackHomeCode, awayCode: fallbackAwayCode } = getTeamCodes(event)
  const homeSourceName = homeTeamData?.name ?? titleHome
  const awaySourceName = awayTeamData?.name ?? titleAway
  const homeMarket = getWinnerTeamMarket(event, homeSourceName)
  const awayMarket = getWinnerTeamMarket(event, awaySourceName)
  const home = getLocalizedTeamName(homeMarket, homeSourceName, language)
  const away = getLocalizedTeamName(awayMarket, awaySourceName, language)
  const homeCode = homeTeamData?.abbreviation?.toLowerCase() ?? fallbackHomeCode
  const awayCode = awayTeamData?.abbreviation?.toLowerCase() ?? fallbackAwayCode
  const homeLogo = homeTeamData?.logo
  const awayLogo = awayTeamData?.logo
  const matchTime = event.endDate ?? event.startTime ?? event.startDate
  const homeFlag = getFlagFromCode(homeCode)
  const awayFlag = getFlagFromCode(awayCode)
  const winnerOutcomes = normalizeWinnerOutcomes(event, homeSourceName, awaySourceName, homeFlag, awayFlag, homeLogo, awayLogo).map((outcome, index) => {
    if (index === 0) {
      return { ...outcome, subject: home }
    }

    if (index === 2) {
      return { ...outcome, subject: away }
    }

    return outcome
  })
  const primaryRecord = getRecordLabel(homeTeamData?.record)
  const secondaryRecord = getRecordLabel(awayTeamData?.record)
  const baseMatch = {
    id: String(event.id),
    slug: event.slug ?? event.ticker,
    date: formatDateLabel(event.eventDate ?? matchTime),
    timeLabel: formatTimeLabel(matchTime),
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal(event.markets)),
    matchup: `${home} vs ${away}`,
    primaryTeam: home,
    secondaryTeam: away,
    primaryTeamSourceName: homeSourceName,
    secondaryTeamSourceName: awaySourceName,
    primaryFlag: homeFlag,
    secondaryFlag: awayFlag,
    primaryLogo: homeLogo,
    secondaryLogo: awayLogo,
    primaryRecord,
    secondaryRecord,
    score: primaryRecord,
    badgeCount: event.gameMarketCount ?? event.commentCount ?? event.markets?.length ?? 0,
    winnerMarket: {
      outcomes: winnerOutcomes,
    },
  } satisfies Omit<MatchCard, 'spreadMarket' | 'totalMarket'>

  const spreadEvent = event.relatedEvents?.find((item) => hasMarketType(item, 'spreads'))
  const totalEvent = event.relatedEvents?.find((item) => hasMarketType(item, 'totals'))
  const spreadVariants = buildSpreadVariants(spreadEvent, baseMatch)
  const totalLines = buildTotalLines(totalEvent)
  const defaultSpreadVariant = spreadVariants?.[0]
  const defaultTotalLine = totalLines?.[0]
  const fallbackSpreadId = `${event.id}-spread-default`
  const fallbackTotalId = `${event.id}-total-default`

  return {
    ...baseMatch,
    spreadMarket: {
      defaultVariantId: defaultSpreadVariant?.id ?? fallbackSpreadId,
      variants: spreadVariants ?? [
        {
          id: fallbackSpreadId,
          displayLine: '0.5',
          homeHandicap: '-0.5',
          awayHandicap: '+0.5',
          homePrice: winnerOutcomes[0]?.yesPrice ?? 2,
          awayPrice: winnerOutcomes[2]?.yesPrice ?? 2,
          homeOrderPrice: winnerOutcomes[0]?.yesOrderPrice ?? 50,
          awayOrderPrice: winnerOutcomes[2]?.yesOrderPrice ?? 50,
          favoredSide: 'home',
        },
      ],
    },
    totalMarket: {
      defaultLineId: defaultTotalLine?.id ?? fallbackTotalId,
      lines: totalLines ?? [
        {
          id: fallbackTotalId,
          line: '2.5',
          overPrice: 2,
          underPrice: 2,
          overOrderPrice: 50,
          underOrderPrice: 50,
        },
      ],
    },
  }
}

function normalizeResponse(response: WorldCupGamesApiEnvelope, query: WorldCupGamesQuery): WorldCupGamesResult {
  const events = response.data?.events ?? []
  const hasNext = response.data?.hasNext ?? false
  const page = response.data?.pageNum ?? response.data?.page ?? query.page
  const total = response.data?.total ?? (hasNext ? page * query.pageSize + 1 : events.length)

  return {
    list: events.map((event) => normalizeGame(event, query.language)),
    total,
    page,
    pageSize: response.data?.pageSize ?? query.pageSize,
    hasNext,
  }
}

export async function getWorldCupGames(query: WorldCupGamesQuery) {
  const response = await apiClient.get<WorldCupGamesApiEnvelope>('/api/world-cup/games', {
    params: {
      pageNum: query.page,
      pageSize: query.pageSize,
    },
  })

  return normalizeResponse(response.data, query)
}
