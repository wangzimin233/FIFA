import { apiClient } from '../../../lib/api-client'
import { buildMatchDetail, type MatchDetail, type MatchDetailProposition, type MatchDetailThreeWay } from '../detail-data'
import {
  buildSpreadVariants,
  buildTotalLines,
  formatTimeLabel,
  formatVolumeLabel,
  getMarketVolumeNumTotal,
  getYesNoAssetIds,
  getYesNoPrices,
  getOrderMarketId,
  hasMarketType,
  normalizeGame,
  type WorldCupGameEvent,
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

function toExactScoreSlug(slug: string) {
  const baseSlug = toBaseEventSlug(slug).replace(/-exact-score$/, '')
  return `${baseSlug}-exact-score`
}

function toHalftimeResultSlug(slug: string) {
  const baseSlug = toBaseEventSlug(slug).replace(/-halftime-result$/, '')
  return `${baseSlug}-halftime-result`
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
) {
  if (!event) {
    return undefined
  }

  const typedMarkets = event.markets?.filter((market) => market.sportsMarketType === marketType) ?? []

  return formatVolumeLabel(getMarketVolumeNumTotal(typedMarkets))
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

function formatHeaderDate(value?: string) {
  if (!value) {
    return '待定'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatEventDate(value?: string, fallback?: string) {
  if (value) {
    return formatHeaderDate(value)
  }

  return formatHeaderDate(fallback)
}

function formatCountdown(value?: string) {
  if (!value) {
    return '时间待定'
  }

  const target = new Date(value)
  if (Number.isNaN(target.getTime())) {
    return '时间待定'
  }

  const diff = target.getTime() - Date.now()
  if (diff <= 0) {
    return '进行中或已结束'
  }

  const totalHours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  return `${days}天 ${hours}时`
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

function buildHalftimeResult(event: WorldCupGameEvent | undefined, match: MatchDetail['match']): MatchDetailThreeWay | undefined {
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
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

      if (/draw/i.test(label)) {
        return {
          id: String(market.id),
          marketId: getOrderMarketId(market),
          negRisk: market.negRisk,
          shortLabel: 'DRAW',
          subject: 'Draw',
          badge: '◌',
          yesPrice,
          noPrice,
          yesAssetId,
          noAssetId,
          tone: 'slate' as const,
          sortOrder: 1,
        }
      }

      const home = outcomeByKey.home
      const away = outcomeByKey.away

      if (label.toLowerCase() === home?.subject?.toLowerCase()) {
        return {
          id: String(market.id),
          marketId: getOrderMarketId(market),
          negRisk: market.negRisk,
          shortLabel: home.shortLabel,
          subject: home.subject,
          badge: home.badge,
          badgeLogo: home.badgeLogo,
          yesPrice,
          noPrice,
          yesAssetId,
          noAssetId,
          tone: 'emerald' as const,
          sortOrder: 0,
        }
      }

      if (label.toLowerCase() === away?.subject?.toLowerCase()) {
        return {
          id: String(market.id),
          marketId: getOrderMarketId(market),
          negRisk: market.negRisk,
          shortLabel: away.shortLabel,
          subject: away.subject,
          badge: away.badge,
          badgeLogo: away.badgeLogo,
          yesPrice,
          noPrice,
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

  return {
    id: String(event.id),
    title: event.title ?? 'Halftime Result',
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal(event.markets)),
    outcomes,
  }
}

function buildExactScores(event: WorldCupGameEvent | undefined, teams?: WorldCupGameTeam[]) {
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
      const rawTitle = market.groupItemTitle ?? market.question ?? 'Exact Score'
      const scoreLabel = rawTitle.replace(/^Exact Score:\s*/i, '')
      const { badge, badgeLogo } = toExactScoreBadge(scoreLabel, home, away)
      const { yesPrice, noPrice } = getYesNoPrices(market)
      const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

      return {
        id: String(market.id),
        marketId: getOrderMarketId(market),
        negRisk: market.negRisk,
        title: rawTitle,
        volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([market])),
        badge,
        badgeLogo,
        shortLabel: scoreLabel,
        subject: rawTitle,
        yesPrice,
        noPrice,
        yesAssetId,
        noAssetId,
      }
    })

  return exactScores
}

function buildBothTeamsToScore(event: WorldCupGameEvent | undefined) {
  const market = event?.markets?.find((item) => item.sportsMarketType === 'both_teams_to_score')
  if (!market) {
    return undefined
  }

  const { yesPrice, noPrice } = getYesNoPrices(market)
  const { yesAssetId, noAssetId } = getYesNoAssetIds(market)
  const rawTitle = market.groupItemTitle?.trim() || market.question?.split(':').pop()?.trim() || 'Both Teams to Score'
  const title = rawTitle.endsWith('?') ? rawTitle : `${rawTitle}?`

  return {
    id: String(market.id),
    marketId: getOrderMarketId(market),
    negRisk: market.negRisk,
    title,
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([market])),
    badge: '⚽',
    shortLabel: 'BTTS',
    subject: title,
    yesPrice,
    noPrice,
    yesAssetId,
    noAssetId,
  }
}

export async function getWorldCupExactScores(slug: string): Promise<MatchDetailProposition[]> {
  const event = await fetchWorldCupEventBySlug(toExactScoreSlug(slug))

  if (!event) {
    return []
  }

  return buildExactScores(event, event.teams) ?? []
}

export async function getWorldCupHalftimeResult(
  slug: string,
  match: MatchDetail['match'],
): Promise<MatchDetailThreeWay | null> {
  const event = await fetchWorldCupEventBySlug(toHalftimeResultSlug(slug))

  if (!event) {
    return null
  }

  return buildHalftimeResult(event, match) ?? null
}

export async function getWorldCupEventDetail(slug: string): Promise<MatchDetail | null> {
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
  const match = normalizeGame(matchEvent)
  const eventTime =
    primaryEvent.startTime ??
    baseEvent?.startTime ??
    primaryEvent.endDate ??
    baseEvent?.endDate ??
    primaryEvent.startDate ??
    baseEvent?.startDate
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
    countdownLabel: formatCountdown(eventTime),
    headerTimeLabel: formatTimeLabel(eventTime),
    headerDateLabel: formatEventDate(baseEvent?.eventDate ?? primaryEvent.eventDate, eventTime),
    contextDescription: primaryEvent.eventMetadata?.context_description ?? primaryEvent.description,
    moneylineVolumeLabel: formatVolumeLabel(getMarketVolumeNumTotal((baseEvent ?? matchEvent).markets)),
    spreadVolumeLabel: buildTypedVolumeLabel(spreadEvent, 'spreads'),
    totalVolumeLabel: buildTypedVolumeLabel(totalEvent, 'totals'),
    spreadVariants,
    totalLines,
    bothTeamsToScore: buildBothTeamsToScore(bothTeamsToScoreEvent),
    exactScores: [],
    halftimeResult: undefined,
  })
}
