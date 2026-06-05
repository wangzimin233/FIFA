import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDisplayPrice } from '../../market-realtime/price-utils'
import { usePolymarketAssetSubscription } from '../../market-realtime/use-polymarket-asset-subscription'
import {
  getWorldCupPropsPage,
  WORLD_CUP_PROPS_PAGE_SIZE,
} from '../api/get-world-cup-props'
import { TeamMark } from './team-mark'

function OddsRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 42

  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16 shrink-0 sm:h-18 sm:w-18 lg:h-20 lg:w-20">
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
      <text x="60" y="58" textAnchor="middle" className="fill-[#f7fff1] text-[18px] font-semibold sm:text-[20px] lg:text-[22px]">
        {value}
      </text>
      <text x="60" y="82" textAnchor="middle" className="fill-[#8e9488] text-[11px] font-semibold sm:text-[12px] lg:text-[13px]">
        赔率
      </text>
    </svg>
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
      {price}
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

export function MarketGrid() {
  const navigate = useNavigate()
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['world-cup-props', WORLD_CUP_PROPS_PAGE_SIZE],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getWorldCupPropsPage({ pageNum: pageParam, pageSize: WORLD_CUP_PROPS_PAGE_SIZE }),
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
        正在加载玩法列表...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel px-4 py-6 text-sm text-rose-300">
        玩法列表加载失败：{error instanceof Error ? error.message : '未知错误'}
      </div>
    )
  }

  if (!cards.length) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel px-4 py-6 text-sm text-ink-soft">
        暂无玩法数据。
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
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink sm:text-[14px]">
                          {candidate.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-ink-soft sm:text-[11px]">
                          <RealtimePriceValue assetId={candidate.yesAssetId} fallbackPrice={candidate.yesPrice} />
                        </div>
                      </div>
                      <div className="flex h-8 min-w-[58px] items-center justify-center rounded-[11px] bg-emerald-500/18 px-2 text-center text-[11px] font-semibold text-emerald-300 sm:h-[34px] sm:text-[12px]">
                        Yes <RealtimePriceValue assetId={candidate.yesAssetId} fallbackPrice={candidate.yesPrice} />
                      </div>
                      <div className="flex h-8 min-w-[58px] items-center justify-center rounded-[11px] bg-rose-500/14 px-2 text-center text-[11px] font-semibold text-rose-300 sm:h-[34px] sm:text-[12px]">
                        No <RealtimePriceValue assetId={candidate.noAssetId} fallbackPrice={candidate.noPrice} />
                      </div>
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

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/markets/${card.id}`, {
                      state: { marketCard: card, backTo: '/markets' },
                    })
                  }
                  className="rounded-[13px] bg-emerald-500/20 px-3 py-2.5 text-center text-[14px] font-semibold text-emerald-300 transition hover:bg-emerald-500/30 sm:text-[15px]"
                >
                  Yes <RealtimePriceValue assetId={card.yesAssetId} fallbackPrice={card.yesPrice} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/markets/${card.id}`, {
                      state: { marketCard: card, backTo: '/markets' },
                    })
                  }
                  className="rounded-[13px] bg-rose-500/14 px-3 py-2.5 text-center text-[14px] font-semibold text-rose-300 transition hover:bg-rose-500/20 sm:text-[15px]"
                >
                  No <RealtimePriceValue assetId={card.noAssetId} fallbackPrice={card.noPrice} />
                </button>
              </div>

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
            {isFetchingNextPage ? '正在加载更多...' : '显示更多盘口'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
