import { apiClient } from '../../../lib/api-client'
import i18n from '../../../config/i18n'
import {
  buildMatchDetail,
  type MatchDetail,
  type MatchDetailCornerGroup,
  type MatchDetailCornerMarket,
  type MatchDetailCornerOutcome,
  type MatchDetailProposition,
  type MatchDetailThreeWay,
} from '../detail-data'
import {
  buildSpreadVariants,
  buildTotalLines,
  formatTimeLabel,
  formatVolumeLabel,
  getLocalizedGroupItemTitle,
  getMarketVolumeNumTotal,
  getYesNoAssetIds,
  getYesNoOrderPrices,
  getYesNoPrices,
  getOrderMarketMetadata,
  hasMarketType,
  isZhLanguage,
  normalizeGame,
  parseJsonStringArray,
  type WorldCupGameEvent,
  type WorldCupGameMarket,
  type WorldCupGameTeam,
} from './get-world-cup-games'

type WorldCupEventDetailEnvelope = {
  code: number
  message: string
  data?: WorldCupGameEvent | { event?: WorldCupGameEvent } | null
}

function toMoreMarketsSlug(slug: string) {
  return slug.endsWith('-more-markets') ? slug : `${slug}-more-markets`
}

function toBaseEventSlug(slug: string) {
  return slug.replace(/-more-markets$/, '')
}

function toMarketBaseSlug(slug: string) {
  return toBaseEventSlug(slug).replace(/-(exact-score|halftime-result|second-half-result)$/, '')
}

function toExactScoreSlug(slug: string) {
  const baseSlug = toMarketBaseSlug(slug)
  return `${baseSlug}-exact-score`
}

function toHalftimeResultSlug(slug: string) {
  const baseSlug = toMarketBaseSlug(slug)
  return `${baseSlug}-halftime-result`
}

function toSecondHalfResultSlug(slug: string) {
  const baseSlug = toMarketBaseSlug(slug)
  return `${baseSlug}-second-half-result`
}

function toTotalCornersSlug(slug: string) {
  const baseSlug = toMarketBaseSlug(slug)
  return `${baseSlug}-total-corners`
}

function resolveEvent(payload: WorldCupEventDetailEnvelope['data']) {
  if (!payload) {
    return null
  }

  if ('id' in payload) {
    return payload
  }

  return payload.event ?? null
}

function getEventForMarketType(event: WorldCupGameEvent | null | undefined, type: string) {
  if (!event) {
    return undefined
  }

  if (hasMarketType(event, type)) {
    return event
  }

  return event.relatedEvents?.find((item) => hasMarketType(item, type))
}

function buildTypedVolumeLabel(
  event: WorldCupGameEvent | undefined,
  marketType: string,
  language?: string,
) {
  if (!event) {
    return undefined
  }

  const typedMarkets = event.markets?.filter((market) => market.sportsMarketType === marketType) ?? []

  return formatVolumeLabel(getMarketVolumeNumTotal(typedMarkets), language)
}

function sanitizeMatchTitle(title?: string) {
  return title?.replace(/\s*-\s*More Markets$/i, '').trim() || title
}

async function fetchWorldCupEventBySlug(slug: string) {
  const response = await apiClient.get<WorldCupEventDetailEnvelope>(`/api/world-cup/events/${slug}`)
  return resolveEvent(response.data.data)
}

function createFallbackMatchEvent(event: WorldCupGameEvent, baseSlug: string): WorldCupGameEvent {
  return {
    ...event,
    slug: baseSlug,
    ticker: toBaseEventSlug(event.ticker ?? baseSlug),
    title: sanitizeMatchTitle(event.title),
    markets: [],
  }
}

function formatHeaderDate(value?: string, language?: string) {
  if (!value) {
    return i18n.t('dataLabels.tbd', { lng: language })
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatEventDate(value?: string, fallback?: string, language?: string) {
  if (value) {
    return formatHeaderDate(value, language)
  }

  return formatHeaderDate(fallback, language)
}

function formatCountdown(value?: string, language?: string) {
  if (!value) {
    return i18n.t('dataLabels.timeTbd', { lng: language })
  }

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return i18n.t('dataLabels.timeTbd', { lng: language })
  }

  const diff = target.getTime() - Date.now()
  if (diff <= 0) {
    return i18n.t('dataLabels.inProgressOrEnded', { lng: language })
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return i18n.t('dataLabels.countdown', { lng: language, days, hours })
}

function normalizeScoreLabel(score?: string | null) {
  const normalizedScore = score?.trim()
  if (!normalizedScore) {
    return undefined
  }

  const scoreParts = normalizedScore.match(/^(.+?)\s*[-:]\s*(.+)$/)
  return scoreParts ? `${scoreParts[1]}:${scoreParts[2]}` : normalizedScore
}

function formatLiveStatusLabel(live: boolean | null | undefined, fallbackTime?: string, language?: string) {
  if (live === null) {
    return i18n.t('dataLabels.notStarted', { lng: language })
  }

  if (live === true) {
    return i18n.t('dataLabels.live', { lng: language })
  }

  if (live === false) {
    return i18n.t('dataLabels.ended', { lng: language })
  }

  return formatCountdown(fallbackTime, language)
}

function getOrderedTeams(teams?: WorldCupGameTeam[]) {
  return {
    home: teams?.find((team) => team.ordering === 'home'),
    away: teams?.find((team) => team.ordering === 'away'),
  }
}

function toExactScoreBadge(scoreLabel: string, homeTeam?: WorldCupGameTeam, awayTeam?: WorldCupGameTeam) {
  const match = scoreLabel.match(/(\d+)\s*-\s*(\d+)/)
  if (!match) {
    return { badge: '', badgeLogo: undefined as string | undefined }
  }

  const homeScore = Number(match[1])
  const awayScore = Number(match[2])
  const homeBadge = homeTeam?.abbreviation?.toUpperCase() ?? homeTeam?.name?.slice(0, 3).toUpperCase() ?? ''
  const awayBadge = awayTeam?.abbreviation?.toUpperCase() ?? awayTeam?.name?.slice(0, 3).toUpperCase() ?? ''

  if (homeScore > awayScore) {
    return {
      badge: homeBadge,
      badgeLogo: homeTeam?.logo,
    }
  }

  if (awayScore > homeScore) {
    return {
      badge: awayBadge,
      badgeLogo: awayTeam?.logo,
    }
  }

  return { badge: '', badgeLogo: undefined }
}

function buildHalftimeResult(event: WorldCupGameEvent | undefined, match: MatchDetail['match'], language?: string): MatchDetailThreeWay | undefined {
  if (!event?.markets?.length) {
    return undefined
  }

  const outcomeByKey = {
    home: match.winnerMarket.outcomes[0],
    draw: match.winnerMarket.outcomes[1],
    away: match.winnerMarket.outcomes[2],
  }

  const outcomes = event.markets
    .map((market) => {
      const label = (market.groupItemTitle ?? '').trim()
      const { yesPrice, noPrice } = getYesNoPrices(market)
      const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

      if (/draw/i.test(label)) {
        return {
          id: String(market.id),
          ...getOrderMarketMetadata(event, market),
          negRisk: market.negRisk,
          shortLabel: 'DRAW',
          subject: i18n.t('markets.outcomes.draw', { lng: language }),
          badge: '◌',
          yesPrice,
          noPrice,
          yesOrderPrice,
          noOrderPrice,
          yesAssetId,
          noAssetId,
          tone: 'slate' as const,
          sortOrder: 1,
        }
      }

      const home = outcomeByKey.home
      const away = outcomeByKey.away

      const homeSourceName = match.primaryTeamSourceName ?? home?.subject
      const awaySourceName = match.secondaryTeamSourceName ?? away?.subject

      if (label.toLowerCase() === homeSourceName?.toLowerCase()) {
        return {
          id: String(market.id),
          ...getOrderMarketMetadata(event, market),
          negRisk: market.negRisk,
          shortLabel: home.shortLabel,
          subject: home.subject,
          badge: home.badge,
          badgeLogo: home.badgeLogo,
          yesPrice,
          noPrice,
          yesOrderPrice,
          noOrderPrice,
          yesAssetId,
          noAssetId,
          tone: 'emerald' as const,
          sortOrder: 0,
        }
      }

      if (label.toLowerCase() === awaySourceName?.toLowerCase()) {
        return {
          id: String(market.id),
          ...getOrderMarketMetadata(event, market),
          negRisk: market.negRisk,
          shortLabel: away.shortLabel,
          subject: away.subject,
          badge: away.badge,
          badgeLogo: away.badgeLogo,
          yesPrice,
          noPrice,
          yesOrderPrice,
          noOrderPrice,
          yesAssetId,
          noAssetId,
          tone: 'emerald' as const,
          sortOrder: 2,
        }
      }

      return null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => {
      const { sortOrder, ...outcome } = item
      void sortOrder
      return outcome
    })

  if (!outcomes.length) {
    return undefined
  }

  const titleZh = event.titleZh?.trim()
  const titleEn = event.title?.trim()

  return {
    id: String(event.id),
    title: isZhLanguage(language) ? titleZh || titleEn || 'Halftime Result' : titleEn || titleZh || 'Halftime Result',
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal(event.markets), language),
    outcomes,
  }
}

function buildExactScores(event: WorldCupGameEvent | undefined, teams?: WorldCupGameTeam[], language?: string) {
  if (!event?.markets?.length) {
    return undefined
  }

  const { home, away } = getOrderedTeams(teams)

  const exactScores: MatchDetailProposition[] = [...event.markets]
    .sort((left, right) => {
      const leftOrder = Number(left.groupItemThreshold ?? Number.MAX_SAFE_INTEGER)
      const rightOrder = Number(right.groupItemThreshold ?? Number.MAX_SAFE_INTEGER)
      return leftOrder - rightOrder
    })
    .map((market) => {
      const rawTitle = getLocalizedGroupItemTitle(market, language) ?? market.question ?? 'Exact Score'
      const scoreLabel = rawTitle.replace(/^(Exact Score|准确比分|确切比分)\s*[:：]\s*/i, '')
      const { badge, badgeLogo } = toExactScoreBadge(scoreLabel, home, away)
      const { yesPrice, noPrice } = getYesNoPrices(market)
      const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

      return {
        id: String(market.id),
        ...getOrderMarketMetadata(event, market),
        negRisk: market.negRisk,
        title: rawTitle,
        volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([market]), language),
        badge,
        badgeLogo,
        shortLabel: scoreLabel,
        subject: rawTitle,
        yesPrice,
        noPrice,
        yesOrderPrice,
        noOrderPrice,
        yesAssetId,
        noAssetId,
      }
    })

  return exactScores
}

function buildBothTeamsToScore(event: WorldCupGameEvent | undefined, language?: string) {
  const market = event?.markets?.find((item) => item.sportsMarketType === 'both_teams_to_score')
  if (!market) {
    return undefined
  }

  const { yesPrice, noPrice } = getYesNoPrices(market)
  const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
  const { yesAssetId, noAssetId } = getYesNoAssetIds(market)
  const rawTitle = getLocalizedGroupItemTitle(market, language) || market.question?.split(':').pop()?.trim() || 'Both Teams to Score'
  const title = rawTitle.endsWith('?') ? rawTitle : `${rawTitle}?`

  return {
    id: String(market.id),
    ...getOrderMarketMetadata(event, market),
    negRisk: market.negRisk,
    title,
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([market]), language),
    badge: '⚽',
    shortLabel: 'BTTS',
    subject: title,
    yesPrice,
    noPrice,
    yesOrderPrice,
    noOrderPrice,
    yesAssetId,
    noAssetId,
  }
}

function getCornerGroup(market: WorldCupGameMarket) {
  const type = market.sportsMarketType
  const slug = market.slug || ''

  if (type === 'total_corners') {
    return 'Corners'
  }

  if (type === 'soccer_first_half_total_corners') {
    return '1st Half Corners'
  }

  if (type === 'soccer_second_half_total_corners') {
    return '2nd Half Corners'
  }

  if (type === 'soccer_team_total_corners' && slug.includes('team-home')) {
    return 'Spain Corners'
  }

  if (type === 'soccer_team_total_corners' && slug.includes('team-away')) {
    return 'Cabo Verde Corners'
  }

  if (type === 'soccer_game_corners_odd_even') {
    return 'Corners Odd/Even'
  }

  if (type === 'soccer_first_corner') {
    return 'First Corner'
  }

  return 'Unknown'
}

function getCornerGroupTitle(key: string, match?: MatchDetail['match'], language?: string) {
  const isZh = isZhLanguage(language)
  const homeTeam = match?.primaryTeam ?? 'Spain'
  const awayTeam = match?.secondaryTeam ?? 'Cabo Verde'

  if (!isZh) {
    if (key === 'Spain Corners') {
      return `${homeTeam} Corners`
    }

    if (key === 'Cabo Verde Corners') {
      return `${awayTeam} Corners`
    }

    return key
  }

  const zhTitleMap: Record<string, string> = {
    Corners: '总角球',
    '1st Half Corners': '上半场角球',
    '2nd Half Corners': '下半场角球',
    'Corners Odd/Even': '角球单双',
    'First Corner': '第一个角球',
    Unknown: '其他角球',
  }

  if (key === 'Spain Corners') {
    return `${homeTeam}角球`
  }

  if (key === 'Cabo Verde Corners') {
    return `${awayTeam}角球`
  }

  return zhTitleMap[key] ?? key
}

function getCornerGroupSortOrder(key: string) {
  const sortOrder: Record<string, number> = {
    Corners: 0,
    '1st Half Corners': 1,
    '2nd Half Corners': 2,
    'Spain Corners': 3,
    'Cabo Verde Corners': 4,
    'Corners Odd/Even': 5,
    'First Corner': 6,
    Unknown: 99,
  }

  return sortOrder[key] ?? sortOrder.Unknown
}

function formatCornerLine(market: WorldCupGameMarket) {
  if (typeof market.line === 'number' && Number.isFinite(market.line)) {
    return Number.isInteger(market.line) ? String(market.line) : String(market.line)
  }

  return ''
}

function getCornerOutcomeLabel(
  market: WorldCupGameMarket,
  outcome: string | undefined,
  side: 'yes' | 'no',
  lineLabel: string,
  language?: string,
) {
  const normalized = outcome?.trim() || ''
  const lower = normalized.toLowerCase()
  const isZh = isZhLanguage(language)

  if (market.sportsMarketType === 'soccer_first_corner') {
    if (side === 'yes') {
      return isZh ? '主' : 'Home'
    }

    return isZh ? '客' : 'Away'
  }

  if (lineLabel) {
    if (lower === 'over') {
      return isZh ? `大于 ${lineLabel}` : `Over ${lineLabel}`
    }

    if (lower === 'under') {
      return isZh ? `小于 ${lineLabel}` : `Under ${lineLabel}`
    }
  }

  if (isZh) {
    if (lower === 'odd') {
      return '单'
    }

    if (lower === 'even') {
      return '双'
    }
  }

  return normalized || (isZh ? '选项' : 'Pick')
}

function getCornerShortLabel(market: WorldCupGameMarket, language?: string) {
  const lineLabel = formatCornerLine(market)
  const localizedTitle = getLocalizedGroupItemTitle(market, language)
  const rawTitle = localizedTitle || market.groupItemTitle || market.question || 'Corners'
  const cleanedTitle = rawTitle
    .replace(/\s*[:：]\s*(O\/U|大于\/小于|大小盘)\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return lineLabel || cleanedTitle
}

function buildCornerMarket(
  event: WorldCupGameEvent,
  market: WorldCupGameMarket,
  groupKey: string,
  match: MatchDetail['match'] | undefined,
  language?: string,
): MatchDetailCornerMarket {
  const outcomes = parseJsonStringArray(market.outcomes)
  const { yesPrice, noPrice } = getYesNoPrices(market)
  const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
  const { yesAssetId, noAssetId } = getYesNoAssetIds(market)
  const lineLabel = formatCornerLine(market)
  const title = getLocalizedGroupItemTitle(market, language) || market.groupItemTitle || market.question || groupKey
  const shortLabel = getCornerShortLabel(market, language)
  const cornerOutcomes: MatchDetailCornerOutcome[] = [
    {
      id: `${market.id}:yes`,
      side: 'yes',
      label: getCornerOutcomeLabel(market, outcomes[0], 'yes', lineLabel, language),
      labelZh: getCornerOutcomeLabel(market, outcomes[0], 'yes', lineLabel, 'zh'),
      price: yesPrice,
      orderPrice: yesOrderPrice,
      assetId: yesAssetId,
    },
    {
      id: `${market.id}:no`,
      side: 'no',
      label: getCornerOutcomeLabel(market, outcomes[1], 'no', lineLabel, language),
      labelZh: getCornerOutcomeLabel(market, outcomes[1], 'no', lineLabel, 'zh'),
      price: noPrice,
      orderPrice: noOrderPrice,
      assetId: noAssetId,
    },
  ]

  return {
    id: String(market.id),
    ...getOrderMarketMetadata(event, market),
    negRisk: market.negRisk,
    title,
    titleZh: market.groupItemTitleZh,
    shortLabel,
    subject: title,
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([market]), language),
    badge: '◿',
    badgeLogo: market.icon,
    yesPrice,
    noPrice,
    yesOrderPrice,
    noOrderPrice,
    yesAssetId,
    noAssetId,
    outcomes: cornerOutcomes,
    eventTitle: event.title ?? match?.matchup,
    eventTitleZh: event.titleZh ?? match?.matchup,
  }
}

function buildCornerGroups(
  event: WorldCupGameEvent | undefined,
  match: MatchDetail['match'] | undefined,
  language?: string,
) {
  if (!event?.markets?.length) {
    return []
  }

  const groupMap = new Map<string, MatchDetailCornerMarket[]>()
  const groupVolumeMap = new Map<string, number>()

  for (const market of event.markets) {
    const key = getCornerGroup(market)
    const markets = groupMap.get(key) ?? []
    markets.push(buildCornerMarket(event, market, key, match, language))
    groupMap.set(key, markets)
    groupVolumeMap.set(key, (groupVolumeMap.get(key) ?? 0) + getMarketVolumeNumTotal([market]))
  }

  return Array.from(groupMap.entries())
    .sort(([left], [right]) => getCornerGroupSortOrder(left) - getCornerGroupSortOrder(right))
    .map(([key, markets]): MatchDetailCornerGroup => {
      const sortedMarkets = [...markets].sort((left, right) => {
        const leftLine = Number(left.shortLabel)
        const rightLine = Number(right.shortLabel)

        if (Number.isFinite(leftLine) && Number.isFinite(rightLine)) {
          return leftLine - rightLine
        }

        return left.shortLabel.localeCompare(right.shortLabel)
      })

      return {
        key,
        title: getCornerGroupTitle(key, match, language),
        volumeLabel: formatVolumeLabel(groupVolumeMap.get(key), language),
        markets: sortedMarkets,
      }
    })
}

export async function getWorldCupExactScores(slug: string, language?: string): Promise<MatchDetailProposition[]> {
  const event = await fetchWorldCupEventBySlug(toExactScoreSlug(slug))

  if (!event) {
    return []
  }

  return buildExactScores(event, event.teams, language) ?? []
}

export async function getWorldCupHalftimeResult(
  slug: string,
  match: MatchDetail['match'],
  language?: string,
): Promise<MatchDetailThreeWay | null> {
  const event = await fetchWorldCupEventBySlug(toHalftimeResultSlug(slug))

  if (!event) {
    return null
  }

  return buildHalftimeResult(event, match, language) ?? null
}

export async function getWorldCupSecondHalfResult(
  slug: string,
  match: MatchDetail['match'],
  language?: string,
): Promise<MatchDetailThreeWay | null> {
  const event = await fetchWorldCupEventBySlug(toSecondHalfResultSlug(slug))

  if (!event) {
    return null
  }

  return buildHalftimeResult(event, match, language) ?? null
}

export async function getWorldCupCornerGroups(
  slug: string,
  match?: MatchDetail['match'],
  language?: string,
): Promise<MatchDetailCornerGroup[]> {
  const event = await fetchWorldCupEventBySlug(toTotalCornersSlug(slug))

  if (!event) {
    return []
  }

  return buildCornerGroups(event, match, language)
}

export async function getWorldCupEventDetail(slug: string, language?: string): Promise<MatchDetail | null> {
  const baseSlug = toBaseEventSlug(slug)
  const moreMarketsSlug = toMoreMarketsSlug(baseSlug)
  const [baseEventResult, moreMarketsEventResult] = await Promise.allSettled([
    fetchWorldCupEventBySlug(baseSlug),
    fetchWorldCupEventBySlug(moreMarketsSlug),
  ])

  const baseEvent = baseEventResult.status === 'fulfilled' ? baseEventResult.value : null
  const moreMarketsEvent = moreMarketsEventResult.status === 'fulfilled' ? moreMarketsEventResult.value : null
  const primaryEvent = baseEvent ?? moreMarketsEvent

  if (!primaryEvent) {
    if (moreMarketsEventResult.status === 'rejected') {
      throw moreMarketsEventResult.reason
    }

    if (baseEventResult.status === 'rejected') {
      throw baseEventResult.reason
    }

    return null
  }

  const matchEvent = baseEvent ?? createFallbackMatchEvent(primaryEvent, baseSlug)
  const match = normalizeGame(matchEvent, language)
  const eventTime =
    primaryEvent.startTime ??
    baseEvent?.startTime ??
    primaryEvent.endDate ??
    baseEvent?.endDate ??
    primaryEvent.startDate ??
    baseEvent?.startDate
  const scoreLabel =
    normalizeScoreLabel(primaryEvent.score) ??
    normalizeScoreLabel(baseEvent?.score)
  const live = primaryEvent.live !== undefined ? primaryEvent.live : baseEvent?.live
  const statusLabel = formatLiveStatusLabel(live, eventTime, language)
  const bothTeamsToScoreEvent =
    getEventForMarketType(moreMarketsEvent, 'both_teams_to_score') ??
    getEventForMarketType(baseEvent ?? primaryEvent, 'both_teams_to_score')
  const spreadEvent =
    getEventForMarketType(moreMarketsEvent, 'spreads') ??
    getEventForMarketType(baseEvent ?? primaryEvent, 'spreads')
  const totalEvent =
    getEventForMarketType(moreMarketsEvent, 'totals') ??
    getEventForMarketType(baseEvent ?? primaryEvent, 'totals')
  const spreadVariants = buildSpreadVariants(spreadEvent, match)
  const totalLines = buildTotalLines(totalEvent)
  const detailMatch = {
    ...match,
    spreadMarket: {
      defaultVariantId: spreadVariants?.[0]?.id ?? match.spreadMarket.defaultVariantId,
      variants: spreadVariants ?? match.spreadMarket.variants,
    },
    totalMarket: {
      defaultLineId: totalLines?.[0]?.id ?? match.totalMarket.defaultLineId,
      lines: totalLines ?? match.totalMarket.lines,
    },
  }

  return buildMatchDetail(detailMatch, {
    countdownLabel: formatCountdown(eventTime, language),
    scoreLabel,
    live,
    statusLabel,
    headerTimeLabel: formatTimeLabel(eventTime, language),
    headerDateLabel: formatEventDate(baseEvent?.eventDate ?? primaryEvent.eventDate, eventTime, language),
    contextDescription: primaryEvent.eventMetadata?.context_description ?? primaryEvent.description,
    moneylineVolumeLabel: formatVolumeLabel(getMarketVolumeNumTotal((baseEvent ?? matchEvent).markets), language),
    spreadVolumeLabel: buildTypedVolumeLabel(spreadEvent, 'spreads', language),
    totalVolumeLabel: buildTypedVolumeLabel(totalEvent, 'totals', language),
    spreadVariants,
    totalLines,
    bothTeamsToScore: buildBothTeamsToScore(bothTeamsToScoreEvent, language),
    exactScores: [],
    halftimeResult: undefined,
    cornerGroups: [],
  })
}
