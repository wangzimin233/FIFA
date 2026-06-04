import { apiClient } from '../../../lib/api-client'
import type { MarketCard, MarketListCandidate } from '../home-data'
import {
  formatVolumeLabel,
  getMarketVolumeNumTotal,
  getYesNoAssetIds,
  getYesNoPrices,
  getOrderMarketId,
  type WorldCupGameEvent,
  type WorldCupGameMarket,
} from './get-world-cup-games'

export const WORLD_CUP_PROPS_PAGE_SIZE = 20

export type WorldCupPropsQuery = {
  pageNum: number
  pageSize: number
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

function getEventTitle(event: WorldCupGameEvent) {
  const title = event.title?.trim()
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
  const title = getEventTitle(event).toLowerCase()

  if (title.includes('winner') || title.includes('champion')) {
    return '🏆'
  }

  if (title.includes('group')) {
    return '⚽'
  }

  return event.markets && event.markets.length === 1 ? '◎' : '⚽'
}

function getCandidateName(market: WorldCupGameMarket, index: number) {
  const label = market.groupItemTitle?.trim() || market.name?.trim() || market.question?.trim()
  return label && label.length > 0 ? label : `Option ${index + 1}`
}

function buildCandidate(market: WorldCupGameMarket, index: number): MarketListCandidate {
  const { yesPrice, noPrice } = getYesNoPrices(market)
  const { yesAssetId, noAssetId } = getYesNoAssetIds(market)

  return {
    id: String(market.id ?? `${index}`),
    marketId: getOrderMarketId(market),
    negRisk: market.negRisk,
    name: getCandidateName(market, index),
    probability: yesPrice,
    yesPrice,
    noPrice,
    yesAssetId,
    noAssetId,
  }
}

function buildMarketCard(event: WorldCupGameEvent): MarketCard | null {
  const markets = event.markets ?? []
  if (!markets.length) {
    return null
  }

  const id = getEventCardId(event)
  const title = getEventTitle(event)
  const icon = getFallbackIcon(event)
  const iconLogo = getEventIconLogo(event)

  if (markets.length === 1) {
    const candidate = buildCandidate(markets[0], 0)

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
      marketId: candidate.marketId,
      negRisk: candidate.negRisk,
      yesAssetId: candidate.yesAssetId,
      noAssetId: candidate.noAssetId,
      volumeLabel: formatVolumeLabel(getMarketVolumeNumTotal([markets[0]])),
    }
  }

  const candidates = markets.map(buildCandidate)

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
    cards: events.map(buildMarketCard).filter((card): card is MarketCard => card !== null),
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
): Promise<MarketCard | null> {
  let pageNum = 1

  while (true) {
    const page = await getWorldCupPropsPage({ pageNum, pageSize })
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
