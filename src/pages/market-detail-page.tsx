import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useDisplayPrice } from '../features/market-realtime/price-utils'
import { RollingNumber } from '../features/market-realtime/rolling-number'
import { usePolymarketAssetSubscription } from '../features/market-realtime/use-polymarket-asset-subscription'
import {
  getWorldCupPropCardById,
  WORLD_CUP_PROPS_PAGE_SIZE,
} from '../features/home/api/get-world-cup-props'
import { MobileOrderDrawer } from '../features/home/components/mobile-order-drawer'
import { OrderPanel } from '../features/home/components/order-panel'
import { TeamMark } from '../features/home/components/team-mark'
import type { MarketCard } from '../features/home/home-data'
import { useOrderStore } from '../features/home/order-store'

type MarketDetailLocationState = {
  preselectedCandidateName?: string
  marketCard?: MarketCard
  backTo?: string
}

function wrapperClass() {
  return 'rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_12px_28px_rgba(0,0,0,0.14)]'
}

function isAcceptingOrders(item: { acceptingOrders?: boolean }) {
  return item.acceptingOrders === true
}

function actionButtonClass(active: boolean, tone: 'positive' | 'negative' = 'positive') {
  if (!active) {
    return 'border-transparent bg-white/4 text-ink-soft hover:border-white/14 hover:text-ink'
  }

  return tone === 'negative'
    ? 'border-transparent bg-rose-500/90 text-white'
    : 'border-transparent bg-emerald-500/85 text-white'
}

function RealtimePriceValue({
  assetId,
  fallbackPrice,
  suffix = '',
}: {
  assetId?: string
  fallbackPrice: number
  suffix?: string
}) {
  const price = useDisplayPrice(assetId, fallbackPrice)
  return (
    <>
      <RollingNumber value={price} />
      {suffix}
    </>
  )
}

export function MarketDetailPage() {
  const { marketId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const state = location.state as MarketDetailLocationState | null
  const initialMarket = state?.marketCard?.id === marketId ? state.marketCard : undefined
  const initialSelectionKeyRef = useRef<string | null>(null)
  const { activeSelection, clearSelection, selectProposition } = useOrderStore()
  const isActiveMarketWinnerSelection =
    activeSelection?.contextType === 'market' && activeSelection.template === 'winner'
  const { data: market, isLoading, isError } = useQuery({
    queryKey: ['world-cup-prop-card', marketId, language],
    queryFn: () => getWorldCupPropCardById(marketId, WORLD_CUP_PROPS_PAGE_SIZE, language),
    enabled: marketId.length > 0,
    initialData: initialMarket,
  })

  usePolymarketAssetSubscription(
    market
      ? market.kind === 'list'
        ? market.candidates.flatMap((candidate) => [candidate.yesAssetId, candidate.noAssetId])
        : [market.yesAssetId, market.noAssetId]
      : [],
  )

  useEffect(() => {
    if (!market) {
      return
    }

    if (market.kind === 'list') {
      const requestedCandidateName = state?.preselectedCandidateName ?? market.candidates[0]?.name ?? ''
      const initialSelectionKey = `${market.id}:${requestedCandidateName}`

      if (initialSelectionKeyRef.current === initialSelectionKey) {
        return
      }

      const requestedCandidate = market.candidates.find((item) => item.name === state?.preselectedCandidateName)
      if (requestedCandidate && !isAcceptingOrders(requestedCandidate)) {
        initialSelectionKeyRef.current = initialSelectionKey
        clearSelection()
        return
      }

      const candidate =
        requestedCandidate && isAcceptingOrders(requestedCandidate)
          ? requestedCandidate
          : market.candidates.find(isAcceptingOrders)

      if (!candidate) {
        initialSelectionKeyRef.current = initialSelectionKey
        clearSelection()
        return
      }

      const hasSelectionForCurrentMarket =
        isActiveMarketWinnerSelection &&
        activeSelection.matchId === market.id &&
        market.candidates.some((item) => item.name === activeSelection.subject && isAcceptingOrders(item))
      const shouldApplyRequestedCandidate =
        Boolean(state?.preselectedCandidateName) &&
        (!isActiveMarketWinnerSelection ||
          activeSelection.matchId !== market.id ||
          activeSelection.subject !== candidate.name)

      if (!hasSelectionForCurrentMarket || shouldApplyRequestedCandidate) {
        selectProposition(
          {
            contextType: 'market',
            sourceTab: 'markets',
            matchId: market.id,
            eventSlug: candidate.eventSlug ?? market.id,
            marketId: candidate.marketId ?? candidate.id,
            marketSlug: candidate.marketSlug,
            conditionId: candidate.conditionId,
            acceptingOrders: candidate.acceptingOrders,
            negRisk: candidate.negRisk,
            eventTitle: candidate.eventTitle,
            eventTitleZh: candidate.eventTitleZh,
            marketTitle: candidate.marketTitle,
            marketTitleZh: candidate.marketTitleZh,
            yesOutcomeTitle: candidate.yesOutcomeTitle,
            noOutcomeTitle: candidate.noOutcomeTitle,
            yesOutcomeTitleZh: candidate.yesOutcomeTitleZh,
            noOutcomeTitleZh: candidate.noOutcomeTitleZh,
            title: market.title,
            badge: market.icon,
            badgeLogo: market.iconLogo,
            subject: candidate.name,
            shortLabel: candidate.name,
            yesPrice: candidate.yesPrice,
            noPrice: candidate.noPrice,
            yesOrderPrice: candidate.yesOrderPrice,
            noOrderPrice: candidate.noOrderPrice,
            yesAssetId: candidate.yesAssetId,
            noAssetId: candidate.noAssetId,
            activeSide: 'yes',
          },
          { openPanel: false },
        )
      }

      initialSelectionKeyRef.current = initialSelectionKey
      return
    }

    const initialSelectionKey = `${market.id}:${market.subject}`

    if (initialSelectionKeyRef.current === initialSelectionKey) {
      return
    }

    const shouldReselect =
      !isActiveMarketWinnerSelection ||
      activeSelection.matchId !== market.id ||
      activeSelection.subject !== market.subject

    if (shouldReselect) {
      if (!isAcceptingOrders(market)) {
        initialSelectionKeyRef.current = initialSelectionKey
        clearSelection()
        return
      }

      selectProposition(
        {
          contextType: 'market',
          sourceTab: 'markets',
          matchId: market.id,
          eventSlug: market.eventSlug ?? market.id,
          marketId: market.marketId ?? market.id,
          marketSlug: market.marketSlug,
          conditionId: market.conditionId,
          acceptingOrders: market.acceptingOrders,
          negRisk: market.negRisk,
          eventTitle: market.eventTitle,
          eventTitleZh: market.eventTitleZh,
          marketTitle: market.marketTitle,
          marketTitleZh: market.marketTitleZh,
          yesOutcomeTitle: market.yesOutcomeTitle,
          noOutcomeTitle: market.noOutcomeTitle,
          yesOutcomeTitleZh: market.yesOutcomeTitleZh,
          noOutcomeTitleZh: market.noOutcomeTitleZh,
          title: market.title,
          badge: market.icon,
          badgeLogo: market.iconLogo,
          subject: market.subject,
          shortLabel: market.subject,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          yesOrderPrice: market.yesOrderPrice,
          noOrderPrice: market.noOrderPrice,
          yesAssetId: market.yesAssetId,
          noAssetId: market.noAssetId,
          activeSide: 'yes',
        },
        { openPanel: false },
      )
    }

    initialSelectionKeyRef.current = initialSelectionKey
  }, [activeSelection, clearSelection, isActiveMarketWinnerSelection, market, selectProposition, state?.preselectedCandidateName])

  if (isLoading && !market) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        正在加载玩法详情...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel/95 p-4 text-[13px] text-rose-300">
        玩法详情加载失败，请稍后重试。
      </div>
    )
  }

  if (!market) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        未找到对应玩法详情。
      </div>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.42fr)_300px]">
      <div className="min-w-0">
        <div className="mb-3 sm:mb-4">
          <button
            type="button"
            onClick={() => navigate(state?.backTo ?? '/markets')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-white/14 hover:text-ink sm:px-3.5 sm:py-2 sm:text-[12px]"
          >
            <span aria-hidden="true" className="text-[13px] leading-none">
              ‹
            </span>
            返回
          </button>
        </div>

        <section className="rounded-[24px] border border-white/8 bg-panel/95 px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.16)] sm:px-5 sm:py-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-white text-[20px]">
              <TeamMark
                alt={market.title}
                emoji={market.icon}
                logo={market.iconLogo}
                className="h-11 w-11 rounded-[14px] object-cover"
                fallbackClassName="text-[20px]"
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-[24px] font-semibold tracking-tight text-ink sm:text-[28px]">
                {market.title}
              </h1>
              <p className="mt-2 text-[13px] text-ink-soft sm:text-[14px]">{market.volumeLabel}</p>
            </div>
          </div>
        </section>

        {market.kind === 'list' ? (
          <div className="mt-4 grid gap-4">
            {market.candidates.map((candidate) => {
              const canPlaceOrder = isAcceptingOrders(candidate)
              const isActive =
                canPlaceOrder &&
                isActiveMarketWinnerSelection &&
                activeSelection.matchId === market.id &&
                activeSelection.subject === candidate.name

              return (
                <section key={candidate.id ?? candidate.name} className={wrapperClass()}>
                  <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="text-[18px] font-semibold text-ink">{candidate.name}</div>
                      <div className="mt-1 text-[13px] text-ink-soft">
                        <RealtimePriceValue assetId={candidate.yesAssetId} fallbackPrice={candidate.yesPrice} />
                      </div>
                    </div>
                    {canPlaceOrder ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() =>
                            selectProposition(
                              {
                                contextType: 'market',
                                sourceTab: 'markets',
                                matchId: market.id,
                                eventSlug: candidate.eventSlug ?? market.id,
                                marketId: candidate.marketId ?? candidate.id,
                                marketSlug: candidate.marketSlug,
                                conditionId: candidate.conditionId,
                                acceptingOrders: candidate.acceptingOrders,
                                negRisk: candidate.negRisk,
                                eventTitle: candidate.eventTitle,
                                eventTitleZh: candidate.eventTitleZh,
                                marketTitle: candidate.marketTitle,
                                marketTitleZh: candidate.marketTitleZh,
                                yesOutcomeTitle: candidate.yesOutcomeTitle,
                                noOutcomeTitle: candidate.noOutcomeTitle,
                                yesOutcomeTitleZh: candidate.yesOutcomeTitleZh,
                                noOutcomeTitleZh: candidate.noOutcomeTitleZh,
                                title: market.title,
                                badge: market.icon,
                                badgeLogo: market.iconLogo,
                                subject: candidate.name,
                                shortLabel: candidate.name,
                                yesPrice: candidate.yesPrice,
                                noPrice: candidate.noPrice,
                                yesOrderPrice: candidate.yesOrderPrice,
                                noOrderPrice: candidate.noOrderPrice,
                                yesAssetId: candidate.yesAssetId,
                                noAssetId: candidate.noAssetId,
                                activeSide: 'yes',
                              },
                              { openPanel: true },
                            )
                          }
                          className={[
                            'rounded-[16px] border px-4 py-3 text-[15px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px]',
                            actionButtonClass(isActive && activeSelection.activeSide === 'yes', 'positive'),
                          ].join(' ')}
                        >
                          YES <RealtimePriceValue assetId={candidate.yesAssetId} fallbackPrice={candidate.yesPrice} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            selectProposition(
                              {
                                contextType: 'market',
                                sourceTab: 'markets',
                                matchId: market.id,
                                eventSlug: candidate.eventSlug ?? market.id,
                                marketId: candidate.marketId ?? candidate.id,
                                marketSlug: candidate.marketSlug,
                                conditionId: candidate.conditionId,
                                acceptingOrders: candidate.acceptingOrders,
                                negRisk: candidate.negRisk,
                                eventTitle: candidate.eventTitle,
                                eventTitleZh: candidate.eventTitleZh,
                                marketTitle: candidate.marketTitle,
                                marketTitleZh: candidate.marketTitleZh,
                                yesOutcomeTitle: candidate.yesOutcomeTitle,
                                noOutcomeTitle: candidate.noOutcomeTitle,
                                yesOutcomeTitleZh: candidate.yesOutcomeTitleZh,
                                noOutcomeTitleZh: candidate.noOutcomeTitleZh,
                                title: market.title,
                                badge: market.icon,
                                badgeLogo: market.iconLogo,
                                subject: candidate.name,
                                shortLabel: candidate.name,
                                yesPrice: candidate.yesPrice,
                                noPrice: candidate.noPrice,
                                yesOrderPrice: candidate.yesOrderPrice,
                                noOrderPrice: candidate.noOrderPrice,
                                yesAssetId: candidate.yesAssetId,
                                noAssetId: candidate.noAssetId,
                                activeSide: 'no',
                              },
                              { openPanel: true },
                            )
                          }
                          className={[
                            'rounded-[16px] border px-4 py-3 text-[15px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px]',
                            actionButtonClass(isActive && activeSelection.activeSide === 'no', 'negative'),
                          ].join(' ')}
                        >
                          NO <RealtimePriceValue assetId={candidate.noAssetId} fallbackPrice={candidate.noPrice} />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <section className={[wrapperClass(), 'mt-4 px-4 py-5 sm:px-5'].join(' ')}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="text-[18px] font-semibold text-ink sm:text-[20px]">{market.title}</div>
                <div className="mt-2 text-[14px] text-ink-soft">{market.subject}</div>
              </div>
              <div className="text-[32px] font-semibold text-brand sm:text-[38px]">
                <RealtimePriceValue assetId={market.yesAssetId} fallbackPrice={market.yesPrice} />
              </div>
            </div>

            {isAcceptingOrders(market) ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    selectProposition(
                      {
                        contextType: 'market',
                        sourceTab: 'markets',
                        matchId: market.id,
                        eventSlug: market.eventSlug ?? market.id,
                        marketId: market.marketId ?? market.id,
                        marketSlug: market.marketSlug,
                        conditionId: market.conditionId,
                        acceptingOrders: market.acceptingOrders,
                        negRisk: market.negRisk,
                        eventTitle: market.eventTitle,
                        eventTitleZh: market.eventTitleZh,
                        marketTitle: market.marketTitle,
                        marketTitleZh: market.marketTitleZh,
                        yesOutcomeTitle: market.yesOutcomeTitle,
                        noOutcomeTitle: market.noOutcomeTitle,
                        yesOutcomeTitleZh: market.yesOutcomeTitleZh,
                        noOutcomeTitleZh: market.noOutcomeTitleZh,
                        title: market.title,
                        badge: market.icon,
                        badgeLogo: market.iconLogo,
                        subject: market.subject,
                        shortLabel: market.subject,
                        yesPrice: market.yesPrice,
                        noPrice: market.noPrice,
                        yesOrderPrice: market.yesOrderPrice,
                        noOrderPrice: market.noOrderPrice,
                        yesAssetId: market.yesAssetId,
                        noAssetId: market.noAssetId,
                        activeSide: 'yes',
                      },
                      { openPanel: true },
                    )
                  }
                  className={[
                    'rounded-[16px] border px-4 py-3 text-[15px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition',
                    actionButtonClass(
                      isActiveMarketWinnerSelection &&
                        activeSelection.matchId === market.id &&
                        activeSelection.activeSide === 'yes',
                      'positive',
                    ),
                  ].join(' ')}
                >
                  YES <RealtimePriceValue assetId={market.yesAssetId} fallbackPrice={market.yesPrice} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    selectProposition(
                      {
                        contextType: 'market',
                        sourceTab: 'markets',
                        matchId: market.id,
                        eventSlug: market.eventSlug ?? market.id,
                        marketId: market.marketId ?? market.id,
                        marketSlug: market.marketSlug,
                        conditionId: market.conditionId,
                        acceptingOrders: market.acceptingOrders,
                        negRisk: market.negRisk,
                        eventTitle: market.eventTitle,
                        eventTitleZh: market.eventTitleZh,
                        marketTitle: market.marketTitle,
                        marketTitleZh: market.marketTitleZh,
                        yesOutcomeTitle: market.yesOutcomeTitle,
                        noOutcomeTitle: market.noOutcomeTitle,
                        yesOutcomeTitleZh: market.yesOutcomeTitleZh,
                        noOutcomeTitleZh: market.noOutcomeTitleZh,
                        title: market.title,
                        badge: market.icon,
                        badgeLogo: market.iconLogo,
                        subject: market.subject,
                        shortLabel: market.subject,
                        yesPrice: market.yesPrice,
                        noPrice: market.noPrice,
                        yesOrderPrice: market.yesOrderPrice,
                        noOrderPrice: market.noOrderPrice,
                        yesAssetId: market.yesAssetId,
                        noAssetId: market.noAssetId,
                        activeSide: 'no',
                      },
                      { openPanel: true },
                    )
                  }
                  className={[
                    'rounded-[16px] border px-4 py-3 text-[15px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition',
                    actionButtonClass(
                      isActiveMarketWinnerSelection &&
                        activeSelection.matchId === market.id &&
                        activeSelection.activeSide === 'no',
                      'negative',
                    ),
                  ].join(' ')}
                >
                  NO <RealtimePriceValue assetId={market.noAssetId} fallbackPrice={market.noPrice} />
                </button>
              </div>
            ) : null}
          </section>
        )}
      </div>

      <div className="hidden lg:sticky lg:top-[84px] lg:block lg:self-start">
        <OrderPanel />
      </div>

      <MobileOrderDrawer />
    </div>
  )
}
