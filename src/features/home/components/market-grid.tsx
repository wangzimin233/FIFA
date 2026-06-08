import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDisplayPrice } from '../../market-realtime/price-utils'
import { RollingNumber } from '../../market-realtime/rolling-number'
import { usePolymarketAssetSubscription } from '../../market-realtime/use-polymarket-asset-subscription'
import {
  getWorldCupPropsPage,
  WORLD_CUP_PROPS_PAGE_SIZE,
} from '../api/get-world-cup-props'
import { TeamMark } from './team-mark'

function OddsRing({ value }: { value: number }) {
  const { t } = useTranslation()
  const circumference = 2 * Math.PI * 42

  return (
    <div className="relative h-16 w-16 shrink-0 sm:h-18 sm:w-18 lg:h-20 lg:w-20">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full">
        <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="42"
          fill="none"
          stroke="rgba(74,222,128,0.95)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset="0"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <RollingNumber
            value={value}
            className="justify-center text-[15px] font-semibold leading-none text-ink sm:text-[16px] lg:text-[18px]"
          />
          <div className="mt-0.5 text-[9px] font-semibold leading-none text-ink-soft sm:text-[10px] lg:text-[11px]">
            {t('marketGrid.odds')}
          </div>
        </div>
      </div>
    </div>
  )
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

function RealtimeOddsRing({
  assetId,
  fallbackPrice,
}: {
  assetId?: string
  fallbackPrice: number
}) {
  const price = useDisplayPrice(assetId, fallbackPrice)
  return <OddsRing value={price} />
}

function isAcceptingOrders(item: { acceptingOrders?: boolean }) {
  return item.acceptingOrders === true
}

export function MarketGrid() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const {
    data,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['world-cup-props', WORLD_CUP_PROPS_PAGE_SIZE, language],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getWorldCupPropsPage({ pageNum: pageParam, pageSize: WORLD_CUP_PROPS_PAGE_SIZE, language }),
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.pageNum + 1 : undefined),
  })

  const cards = useMemo(() => data?.pages.flatMap((page) => page.cards) ?? [], [data])
  const subscribedAssetIds = useMemo(
    () =>
      cards.flatMap((card) =>
        card.kind === 'list'
          ? card.candidates.flatMap((candidate) => [candidate.yesAssetId, candidate.noAssetId])
          : [card.yesAssetId, card.noAssetId],
      ),
    [cards],
  )

  usePolymarketAssetSubscription(subscribedAssetIds)

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel px-4 py-6 text-sm text-ink-soft">
        {t('marketGrid.loading')}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel px-4 py-6 text-sm text-rose-300">
        {t('marketGrid.error')}
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel px-4 py-6 text-sm text-ink-soft">
        {t('marketGrid.empty')}
      </div>
    )
  }

  const titleClampClass =
    'overflow-hidden break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.article
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.22 }}
          className={[
            'rounded-[18px] border border-white/8 bg-panel px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:px-3.5 sm:py-3.5',
          ].join(' ')}
        >
          {card.kind === 'list' ? (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate(`/markets/${card.id}`, {
                    state: { marketCard: card, backTo: '/markets' },
                  })
                }
                className="flex w-full items-start justify-between gap-2.5 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[17px]">
                    <TeamMark
                      alt={card.title}
                      emoji={card.icon}
                      logo={card.iconLogo}
                      className="h-9 w-9 rounded-[12px] object-cover"
                      fallbackClassName="text-[17px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={[
                        'min-h-[2.25rem] text-[13px] font-semibold leading-tight text-ink sm:min-h-[2.5rem] sm:text-[14px]',
                        titleClampClass,
                      ].join(' ')}
                    >
                      {card.title}
                    </h3>
                  </div>
                </div>
              </button>

              <div className="mt-5 grid gap-3">
                {card.candidates.slice(0, 2).map((candidate) => {
                  const canPlaceOrder = isAcceptingOrders(candidate)

                  return (
                    <button
                      key={candidate.id ?? candidate.name}
                      type="button"
                      onClick={() =>
                        navigate(`/markets/${card.id}`, {
                          state: {
                            preselectedCandidateName: candidate.name,
                            marketCard: card,
                            backTo: '/markets',
                          },
                        })
                      }
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink sm:text-[14px]">
                          {candidate.name}
                        </div>
                      </div>
                      {canPlaceOrder ? (
                        <div className="flex h-8 min-w-[64px] items-center justify-center rounded-[11px] bg-white/[0.05] px-2 text-center text-[12px] font-semibold text-brand sm:h-[34px] sm:text-[13px]">
                          <RealtimePriceValue assetId={candidate.yesAssetId} fallbackPrice={candidate.yesPrice} />
                        </div>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between text-ink-soft">
                <span className="text-[11px] sm:text-[12px]">{card.volumeLabel}</span>
                <button type="button" className="text-[15px] sm:text-[17px]">
                  ⌑
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  navigate(`/markets/${card.id}`, {
                    state: { marketCard: card, backTo: '/markets' },
                  })
                }
                className="flex w-full items-start justify-between gap-2.5 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[17px]">
                    <TeamMark
                      alt={card.title}
                      emoji={card.icon}
                      logo={card.iconLogo}
                      className="h-9 w-9 rounded-[12px] object-cover"
                      fallbackClassName="text-[17px]"
                    />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={[
                        'min-h-[3rem] text-[14px] font-semibold leading-snug text-ink sm:min-h-[3.3rem] sm:text-[15px]',
                        titleClampClass,
                      ].join(' ')}
                    >
                      {card.title}
                    </h3>
                  </div>
                </div>
                <RealtimeOddsRing assetId={card.yesAssetId} fallbackPrice={card.probability} />
              </button>

              {isAcceptingOrders(card) ? (
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/markets/${card.id}`, {
                      state: { marketCard: card, backTo: '/markets' },
                    })
                  }
                  className="mt-5 flex h-11 w-full items-center justify-center rounded-[13px] bg-white/[0.05] px-3 text-center text-[15px] font-semibold text-brand transition hover:bg-white/[0.08]"
                >
                  <RealtimePriceValue assetId={card.yesAssetId} fallbackPrice={card.yesPrice} />
                </button>
              ) : null}

              <div className="mt-5 flex items-center justify-between text-ink-soft">
                <span className="text-[11px] sm:text-[12px]">{card.volumeLabel}</span>
                <button type="button" className="text-[15px] sm:text-[17px]">
                  ⌑
                </button>
              </div>
            </>
          )}
        </motion.article>
      ))}

      {hasNextPage ? (
        <div className="flex justify-center pt-0.5 md:col-span-2 lg:col-span-4">
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-full border border-white/8 bg-white/3 px-4.5 py-2 text-[12px] font-medium text-ink-soft transition hover:border-brand/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 sm:px-5 sm:text-[13px]"
          >
            {isFetchingNextPage ? t('common.loadingMore') : t('marketGrid.showMore')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
