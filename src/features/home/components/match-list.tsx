import { useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDisplayPrice } from '../../market-realtime/price-utils'
import { usePolymarketAssetSubscription } from '../../market-realtime/use-polymarket-asset-subscription'
import { getWorldCupGames } from '../api/get-world-cup-games'
import { TeamMark } from './team-mark'
import type { MatchCard, SpreadVariant, TotalLine } from '../home-data'
import { useOrderStore } from '../order-store'

const winnerToneClass: Record<string, string> = {
  emerald: 'bg-emerald-500/85 text-white',
  rose: 'bg-rose-500/90 text-white',
  blue: 'bg-blue-500/85 text-white',
  slate: 'bg-white/4 text-ink-soft hover:border-white/16 hover:text-ink',
}

const pairedToneClass = (isActive: boolean, tone: 'positive' | 'negative' | 'neutral') => {
  if (!isActive) {
    return 'border-transparent bg-white/4 text-ink-soft hover:border-white/16 hover:text-ink'
  }

  if (tone === 'negative') {
    return 'border-transparent bg-rose-500/88 text-white'
  }

  return 'border-transparent bg-emerald-500/82 text-white'
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

function getActiveSpreadVariant(match: MatchCard, activeSelection: ReturnType<typeof useOrderStore.getState>['activeSelection']) {
  if (
    activeSelection &&
    activeSelection.template === 'spread' &&
    activeSelection.matchId === match.id
  ) {
    return (
      match.spreadMarket.variants.find((variant) => variant.id === activeSelection.activeVariantId) ??
      match.spreadMarket.variants[0]
    )
  }

  return (
    match.spreadMarket.variants.find((variant) => variant.id === match.spreadMarket.defaultVariantId) ??
    match.spreadMarket.variants[0]
  )
}

function getActiveTotalLine(match: MatchCard, activeSelection: ReturnType<typeof useOrderStore.getState>['activeSelection']) {
  if (activeSelection && activeSelection.template === 'total' && activeSelection.matchId === match.id) {
    return (
      match.totalMarket.lines.find((line) => line.id === activeSelection.activeLineId) ??
      match.totalMarket.lines[0]
    )
  }

  return (
    match.totalMarket.lines.find((line) => line.id === match.totalMarket.defaultLineId) ??
    match.totalMarket.lines[0]
  )
}

function SpreadSelector({
  match,
  variants,
}: {
  match: MatchCard
  variants: SpreadVariant[]
}) {
  const { activeSelection, setSpreadVariant } = useOrderStore()

  if (
    !activeSelection ||
    activeSelection.template !== 'spread' ||
    activeSelection.matchId !== match.id
  ) {
    return null
  }

  return (
    <div className="mt-3.5 hidden border-t border-white/8 pt-3 lg:block">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="text-lg text-ink-soft transition hover:text-ink">
          ‹
        </button>
        <div className="flex flex-1 items-center justify-center gap-6 overflow-x-auto px-2 text-[12px] text-ink-soft sm:text-[13px]">
          {variants.map((variant) => {
            const isActive = activeSelection.activeVariantId === variant.id

            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSpreadVariant(variant.id)}
                className={[
                  'relative shrink-0 px-1 pb-1.5 transition',
                  isActive ? 'font-semibold text-ink' : 'hover:text-ink',
                ].join(' ')}
              >
                {isActive ? (
                  <span className="absolute left-1/2 top-[-10px] h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-0 border-t-[8px] border-x-transparent border-t-sky-500" />
                ) : null}
                {variant.displayLine}
              </button>
            )
          })}
        </div>
        <button type="button" className="text-lg text-ink-soft transition hover:text-ink">
          ›
        </button>
      </div>
    </div>
  )
}

function TotalSelector({
  match,
  lines,
}: {
  match: MatchCard
  lines: TotalLine[]
}) {
  const { activeSelection, setTotalLine } = useOrderStore()

  if (
    !activeSelection ||
    activeSelection.template !== 'total' ||
    activeSelection.matchId !== match.id
  ) {
    return null
  }

  return (
    <div className="mt-3.5 hidden border-t border-white/8 pt-3 lg:block">
      <div className="flex items-center justify-between gap-3">
        <button type="button" className="text-lg text-ink-soft transition hover:text-ink">
          ‹
        </button>
        <div className="flex flex-1 items-center justify-center gap-5 overflow-x-auto px-2 text-[12px] text-ink-soft sm:text-[13px]">
          {lines.map((line) => {
            const isActive = activeSelection.activeLineId === line.id

            return (
              <button
                key={line.id}
                type="button"
                onClick={() => setTotalLine(line.id)}
                className={[
                  'relative shrink-0 px-1 pb-1.5 transition',
                  isActive ? 'font-semibold text-ink' : 'hover:text-ink',
                ].join(' ')}
              >
                {isActive ? (
                  <span className="absolute left-1/2 top-[-10px] h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-0 border-t-[8px] border-x-transparent border-t-sky-500" />
                ) : null}
                {line.line}
              </button>
            )
          })}
        </div>
        <button type="button" className="text-lg text-ink-soft transition hover:text-ink">
          ›
        </button>
      </div>
    </div>
  )
}

export function MatchList() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const pageSize = 10
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const {
    activeSelection,
    selectWinner,
    selectSpread,
    selectTotal,
  } = useOrderStore()
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['world-cup-games', pageSize, language],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => getWorldCupGames({ page: pageParam, pageSize, language }),
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
  })

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry?.isIntersecting || !hasNextPage || isFetchingNextPage) {
          return
        }

        void fetchNextPage()
      },
      {
        rootMargin: '240px 0px',
      },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const matches = useMemo(() => data?.pages.flatMap((page) => page.list) ?? [], [data])

  const groups = useMemo(() => {
    const grouped = new Map<string, MatchCard[]>()

    matches.forEach((match) => {
      const current = grouped.get(match.date) ?? []
      current.push(match)
      grouped.set(match.date, current)
    })

    return Array.from(grouped.entries()).map(([date, groupedMatches]) => ({
      date,
      matches: groupedMatches,
    }))
  }, [matches])

  const subscribedAssetIds = useMemo(
    () =>
      matches.flatMap((match) => {
        const activeSpreadVariant = getActiveSpreadVariant(match, activeSelection)
        const activeTotalLine = getActiveTotalLine(match, activeSelection)

        return [
          ...match.winnerMarket.outcomes.flatMap((outcome) => [outcome.yesAssetId, outcome.noAssetId]),
          activeSpreadVariant?.homeAssetId,
          activeSpreadVariant?.awayAssetId,
          activeTotalLine?.overAssetId,
          activeTotalLine?.underAssetId,
        ]
      }),
    [activeSelection, matches],
  )

  usePolymarketAssetSubscription(subscribedAssetIds)

  useEffect(() => {
    if (activeSelection) {
      return
    }

    const firstMatch = data?.pages[0]?.list[0]
    const firstOutcome = firstMatch?.winnerMarket.outcomes[0]

    if (firstMatch && firstOutcome) {
      selectWinner(firstMatch, firstOutcome, 'yes', { openPanel: false })
    }
  }, [activeSelection, data, selectWinner])

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel px-4 py-6 text-sm text-ink-soft">
        正在加载比赛列表...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel px-4 py-6 text-sm text-rose-300">
        比赛列表加载失败：{error instanceof Error ? error.message : '未知错误'}
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.date} className="grid gap-2.5">
          <div className="grid items-center gap-2 lg:grid-cols-[1.08fr_1.2fr] lg:gap-4">
            <h2 className="text-[17px] font-semibold tracking-tight text-ink sm:text-[18px]">
              {group.date}
            </h2>
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.08fr)_minmax(0,0.92fr)] lg:gap-2">
              <span className="px-2 text-center text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                胜负线
              </span>
              <span className="px-2 text-center text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                让分
              </span>
              <span className="px-2 text-center text-[10px] uppercase tracking-[0.16em] text-ink-soft">
                总分
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            {group.matches.map((match, index) => {
              const activeSpreadVariant = getActiveSpreadVariant(match, activeSelection)
              const activeTotalLine = getActiveTotalLine(match, activeSelection)
              const isWinnerActive =
                activeSelection?.template === 'winner' && activeSelection.matchId === match.id
              const isSpreadActive =
                activeSelection?.template === 'spread' && activeSelection.matchId === match.id
              const isTotalActive =
                activeSelection?.template === 'total' && activeSelection.matchId === match.id

              return (
                <motion.article
                  key={match.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.22 }}
                  className="rounded-[20px] border border-white/8 bg-panel px-3.5 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:px-4 sm:py-4"
                >
                  <div className="grid gap-4 lg:hidden">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/matches/${match.slug ?? match.id}`, {
                          state: { backTo: '/matches' },
                        })
                      }
                      className="grid gap-4 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft sm:text-[13px]">
                        <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[12px] text-ink sm:text-[13px]">
                          {match.timeLabel}
                        </span>
                        <span>{match.volumeLabel}</span>
                      </div>

                        <div className="grid gap-3.5">
                          <div className="flex items-center gap-3 text-ink">
                            <TeamMark
                              alt={match.primaryTeam}
                              emoji={match.primaryFlag}
                              logo={match.primaryLogo}
                              className="h-8 w-8 rounded-[8px] object-cover"
                              fallbackClassName="text-[26px]"
                            />
                            <span className="text-[16px] font-semibold">{match.primaryTeam}</span>
                            <span className="text-[13px] text-ink-soft">{match.primaryRecord}</span>
                          </div>
                          <div className="flex items-center gap-3 text-ink">
                            <TeamMark
                              alt={match.secondaryTeam}
                              emoji={match.secondaryFlag}
                              logo={match.secondaryLogo}
                              className="h-8 w-8 rounded-[8px] object-cover"
                              fallbackClassName="text-[26px]"
                            />
                            <span className="text-[16px] font-semibold">{match.secondaryTeam}</span>
                            <span className="text-[13px] text-ink-soft">{match.secondaryRecord}</span>
                          </div>
                        </div>
                    </button>

                    <div className="grid grid-cols-3 gap-2.5">
                      {match.winnerMarket.outcomes.map((outcome) => {
                        const isActive =
                          isWinnerActive && activeSelection.shortLabel === outcome.shortLabel
                        const toneClass = winnerToneClass[outcome.tone ?? 'slate']

                        return (
                          <button
                            key={outcome.id}
                            type="button"
                            onClick={() => selectWinner(match, outcome)}
                            className={[
                              'rounded-[14px] border px-2 py-2.5 text-center shadow-[inset_0_-5px_0_rgba(0,0,0,0.12)] transition',
                              toneClass,
                              isActive ? 'ring-2 ring-brand/35' : 'border-transparent',
                            ].join(' ')}
                          >
                            <span className="block text-[13px] font-semibold">
                              {outcome.shortLabel} <RealtimePriceValue assetId={outcome.yesAssetId} fallbackPrice={outcome.yesPrice} />
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="hidden gap-3.5 lg:grid lg:grid-cols-[1.08fr_1.2fr] lg:gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/matches/${match.slug ?? match.id}`, {
                          state: { backTo: '/matches' },
                        })
                      }
                      className="min-w-0 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-soft sm:text-[13px]">
                        <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-[12px] text-ink sm:text-[13px]">
                          {match.timeLabel}
                        </span>
                        <span>{match.volumeLabel}</span>
                      </div>

                      <div className="mt-4 grid gap-3.5 sm:mt-5 sm:gap-4">
                        <div className="flex items-center gap-2.5 text-ink sm:gap-3">
                          <TeamMark
                            alt={match.primaryTeam}
                            emoji={match.primaryFlag}
                            logo={match.primaryLogo}
                            className="h-6 w-6 rounded-[6px] object-cover sm:h-7 sm:w-7"
                            fallbackClassName="text-[20px] sm:text-[22px]"
                          />
                          <span className="text-[14px] font-semibold sm:text-[15px]">
                            {match.primaryTeam}
                          </span>
                          <span className="text-[12px] text-ink-soft">{match.primaryRecord}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-ink sm:gap-3">
                          <TeamMark
                            alt={match.secondaryTeam}
                            emoji={match.secondaryFlag}
                            logo={match.secondaryLogo}
                            className="h-6 w-6 rounded-[6px] object-cover sm:h-7 sm:w-7"
                            fallbackClassName="text-[20px] sm:text-[22px]"
                          />
                          <span className="text-[14px] font-semibold sm:text-[15px]">
                            {match.secondaryTeam}
                          </span>
                          <span className="text-[12px] text-ink-soft">{match.secondaryRecord}</span>
                        </div>
                      </div>
                    </button>

                    <div className="grid gap-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/matches/${match.slug ?? match.id}`, {
                              state: { backTo: '/matches' },
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-2 py-1 text-[11px] text-ink-soft transition hover:text-ink sm:text-[12px]"
                        >
                          <span className="rounded-full bg-white/6 px-1.5 py-0.5 text-[9px] text-ink-soft">
                            {match.badgeCount}
                          </span>
                          比赛视图
                          <span aria-hidden="true">›</span>
                        </button>
                      </div>

                      <div className="grid gap-2 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.08fr)_minmax(0,0.92fr)]">
                        <div className="grid min-w-0 gap-2">
                          <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:hidden">
                            胜负线
                          </p>
                          {match.winnerMarket.outcomes.map((outcome) => {
                            const isActive =
                              isWinnerActive && activeSelection.shortLabel === outcome.shortLabel
                            const toneClass = winnerToneClass[outcome.tone ?? 'slate']

                            return (
                              <button
                                key={outcome.id}
                                type="button"
                                onClick={() => selectWinner(match, outcome)}
                                className={[
                                  'rounded-[13px] border px-2.5 py-2 text-left transition',
                                  toneClass,
                                  isActive ? 'ring-2 ring-brand/35' : 'border-transparent',
                                ].join(' ')}
                              >
                                <span className="block whitespace-nowrap text-[11px] font-semibold leading-none sm:text-[12px]">
                                  {outcome.shortLabel} <RealtimePriceValue assetId={outcome.yesAssetId} fallbackPrice={outcome.yesPrice} />
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        <div className="grid min-w-0 gap-2">
                          <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:hidden">
                            让分
                          </p>
                          <button
                            type="button"
                            onClick={() => selectSpread(match, activeSpreadVariant.id, 'home')}
                            className={[
                              'rounded-[13px] border px-2.5 py-2 text-left transition',
                              pairedToneClass(
                                isSpreadActive && activeSelection.activeTeamSide === 'home',
                                'positive',
                              ),
                            ].join(' ')}
                          >
                            <span className="flex items-center justify-between gap-3 text-[11px] font-semibold leading-none sm:text-[12px]">
                              <span className="truncate">
                                {match.winnerMarket.outcomes[0].shortLabel} {activeSpreadVariant.homeHandicap}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                <RealtimePriceValue assetId={activeSpreadVariant.homeAssetId} fallbackPrice={activeSpreadVariant.homePrice} />
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => selectSpread(match, activeSpreadVariant.id, 'away')}
                            className={[
                              'rounded-[13px] border px-2.5 py-2 text-left transition',
                              pairedToneClass(
                                isSpreadActive && activeSelection.activeTeamSide === 'away',
                                'positive',
                              ),
                            ].join(' ')}
                          >
                            <span className="flex items-center justify-between gap-3 text-[11px] font-semibold leading-none sm:text-[12px]">
                              <span className="truncate">
                                {match.winnerMarket.outcomes[2].shortLabel} {activeSpreadVariant.awayHandicap}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                <RealtimePriceValue assetId={activeSpreadVariant.awayAssetId} fallbackPrice={activeSpreadVariant.awayPrice} />
                              </span>
                            </span>
                          </button>
                        </div>

                        <div className="grid min-w-0 gap-2">
                          <p className="px-2 text-[10px] uppercase tracking-[0.14em] text-ink-soft lg:hidden">
                            总分
                          </p>
                          <button
                            type="button"
                            onClick={() => selectTotal(match, activeTotalLine.id, 'over')}
                            className={[
                              'rounded-[13px] border px-2.5 py-2 text-left transition',
                              pairedToneClass(
                                isTotalActive && activeSelection.activeSide === 'over',
                                'positive',
                              ),
                            ].join(' ')}
                          >
                            <span className="flex items-center justify-between gap-3 text-[11px] font-semibold leading-none sm:text-[12px]">
                              <span className="truncate">O {activeTotalLine.line}</span>
                              <span className="shrink-0 tabular-nums">
                                <RealtimePriceValue assetId={activeTotalLine.overAssetId} fallbackPrice={activeTotalLine.overPrice} />
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => selectTotal(match, activeTotalLine.id, 'under')}
                            className={[
                              'rounded-[13px] border px-2.5 py-2 text-left transition',
                              pairedToneClass(
                                isTotalActive && activeSelection.activeSide === 'under',
                                'negative',
                              ),
                            ].join(' ')}
                          >
                            <span className="flex items-center justify-between gap-3 text-[11px] font-semibold leading-none sm:text-[12px]">
                              <span className="truncate">U {activeTotalLine.line}</span>
                              <span className="shrink-0 tabular-nums">
                                <RealtimePriceValue assetId={activeTotalLine.underAssetId} fallbackPrice={activeTotalLine.underPrice} />
                              </span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {isSpreadActive ? (
                    <SpreadSelector match={match} variants={match.spreadMarket.variants} />
                  ) : null}
                  {isTotalActive ? (
                    <TotalSelector match={match} lines={match.totalMarket.lines} />
                  ) : null}
                </motion.article>
              )
            })}
          </div>
        </section>
      ))}

      {!groups.length ? (
        <div className="rounded-[20px] border border-white/8 bg-panel px-4 py-6 text-sm text-ink-soft">
          暂无比赛数据
        </div>
      ) : null}

      {groups.length ? (
        <div ref={loadMoreRef} className="flex min-h-12 items-center justify-center">
          <div className="text-xs text-ink-soft">
            {isFetchingNextPage
              ? '加载更多中...'
              : hasNextPage
                ? '继续下滑加载更多'
                : isFetching
                  ? '刷新中...'
                  : '已加载全部比赛'}
          </div>
        </div>
      ) : null}
    </div>
  )
}
