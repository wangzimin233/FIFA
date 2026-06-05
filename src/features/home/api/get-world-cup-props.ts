import { apiClient } from '../../../lib/api-client'
import type { MarketCard, MarketListCandidate } from '../home-data'
import {
  formatVolumeLabel,
  getLocalizedGroupItemTitle,
  getMarketVolumeNumTotal,
  getYesNoAssetIds,
  getYesNoOrderPrices,
  getYesNoPrices,
  getEventSlug,
  getOrderMarketMetadata,
  type WorldCupGameEvent,
  type WorldCupGameMarket,
} from './get-world-cup-games'

export const WORLD_CUP_PROPS_PAGE_SIZE = 20

export type WorldCupPropsQuery = {
  pageNum: number
  pageSize: number
  language?: string
}

type WorldCupPropsApiData = {
  events?: WorldCupGameEvent[]
  pageNum?: number
  pageSize?: number
  hasNext?: boolean
  nextCursor?: string
  total?: number
  sourceLimit?: number
  sourceEventsScanned?: number
}

export type WorldCupPropsApiEnvelope = {
  code?: number
  message?: string
  data?: WorldCupPropsApiData
}

export type WorldCupPropsPage = {
  cards: MarketCard[]
  events: WorldCupGameEvent[]
  pageNum: number
  pageSize: number
  hasNext: boolean
  nextCursor?: string
}

function getEventCardId(event: WorldCupGameEvent) {
  return String(event.slug ?? event.id)
}

function getLocalizedEventTitle(event: WorldCupGameEvent, language?: string) {
  const zhTitle = event.titleZh?.trim()
  const enTitle = event.title?.trim()
  const title = language?.toLowerCase().startsWith('zh') ? zhTitle || enTitle : enTitle || zhTitle

  return title && title.length > 0 ? title : 'Untitled market'
}

function getEventIconLogo(event: WorldCupGameEvent) {
  return (
    event.icon ??
    event.image ??
    event.markets?.find((market) => market.icon || market.image)?.icon ??
    event.markets?.find((market) => market.icon || market.image)?.image
  )
}

function getFallbackIcon(event: WorldCupGameEvent) {
  const title = `${event.title ?? ''} ${event.titleZh ?? ''}`.toLowerCase()

  if (title.includes('winner') || title.includes('champion')) {
    return '🏆'
  }

  if (title.includes('group')) {
    return '⚽'
  }

  return event.markets && event.markets.length === 1 ? '◎' : '⚽'
}

function getCandidateName(market: WorldCupGameMarket, index: number, language?: string) {
  const zhQuestion = market.questionZh?.trim()
  const enQuestion = market.question?.trim()
  const question = language?.toLowerCase().startsWith('zh') ? zhQuestion || enQuestion : enQuestion || zhQuestion
  const label = getLocalizedGroupItemTitle(market, language) || market.name?.trim() || question
  return label && label.length > 0 ? label : `Option ${index + 1}`
}

function buildCandidate(
  event: WorldCupGameEvent,
  market: WorldCupGameMarket,
  index: number,
  language?: string,
): MarketListCandidate {
  const { yesPrice, noPrice } = getYesNoPrices(market)
  const { yesOrderPrice, noOrderPrice } = getYesNoOrderPrices(market)
  const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

  return {
    id: String(market.id ?? `${index}`),
    ...getOrderMarketMetadata(event, market),
    negRisk: market.negRisk,
    name: getCandidateName(market, index, language),
    probability: yesPrice,
    yesPrice,
    noPrice,
    yesOrderPrice,
    noOrderPrice,
    yesAssetId,
    noAssetId,
  }
}

function buildMarketCard(event: WorldCupGameEvent, language?: string): MarketCard | null {
  const markets = event.markets ?? []
  if (!markets.length) {
    return null
  }

  const id = getEventCardId(event)
  const eventSlug = getEventSlug(event)
  const title = getLocalizedEventTitle(event, language)
  const icon = getFallbackIcon(event)
  const iconLogo = getEventIconLogo(event)

  if (markets.length === 1) {
    const candidate = buildCandidate(event, markets[0], 0, language)

    return {
      id,
      kind: 'binary',
      title,
      icon,
      iconLogo,
      subject: candidate.name,
      probability: candidate.probability,
      yesPrice: candidate.yesPrice,
      noPrice: candidate.noPrice,
      yesOrderPrice: candidate.yesOrderPrice,
      noOrderPrice: candidate.noOrderPrice,
      eventSlug,
      marketId: candidate.marketId,
      marketSlug: candidate.marketSlug,
      conditionId: candidate.conditionId,
      negRisk: candidate.negRisk,
      yesAssetId: candidate.yesAssetId,
      noAssetId: candidate.noAssetId,
      volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([markets[0]])),
    }
  }

  const candidates = markets.map((market, index) => buildCandidate(event, market, index, language))

  return {
    id,
    kind: 'list',
    title,
    icon,
    iconLogo,
    volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal(markets)),
    candidates,
    detailCount: candidates.length > 2 ? candidates.length - 2 : undefined,
  }
}

async function fetchWorldCupPropsPage({ pageNum, pageSize }: WorldCupPropsQuery) {
  const response = await apiClient.get<WorldCupPropsApiEnvelope>('/api/world-cup/props', {
    params: {
      pageNum,
      pageSize,
    },
  })

  return response.data
}

export async function getWorldCupPropsPage(query: WorldCupPropsQuery): Promise<WorldCupPropsPage> {
  const envelope = await fetchWorldCupPropsPage(query)
  const data = envelope.data
  const events = data?.events ?? []

  return {
    cards: events.map((event) => buildMarketCard(event, query.language)).filter((card): card is MarketCard => card !== null),
    events,
    pageNum: data?.pageNum ?? query.pageNum,
    pageSize: data?.pageSize ?? query.pageSize,
    hasNext: data?.hasNext ?? false,
    nextCursor: data?.nextCursor,
  }
}

export async function getWorldCupPropCardById(
  marketId: string,
  pageSize = WORLD_CUP_PROPS_PAGE_SIZE,
  language?: string,
): Promise<MarketCard | null> {
  let pageNum = 1

  while (true) {
    const page = await getWorldCupPropsPage({ pageNum, pageSize, language })
    const match = page.cards.find((card) => card.id === marketId)

    if (match) {
      return match
    }

    if (!page.hasNext) {
      return null
    }

    pageNum += 1
  }
}
