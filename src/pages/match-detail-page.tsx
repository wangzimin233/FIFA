import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getWorldCupEventDetail,
  getWorldCupExactScores,
  getWorldCupHalftimeResult,
} from '../features/home/api/get-world-cup-event-detail'
import { MobileOrderDrawer } from '../features/home/components/mobile-order-drawer'
import { OrderPanel } from '../features/home/components/order-panel'
import { TeamMark } from '../features/home/components/team-mark'
import { useOrderStore } from '../features/home/order-store'
import { useDisplayPrice } from '../features/market-realtime/price-utils'
import { usePolymarketAssetSubscription } from '../features/market-realtime/use-polymarket-asset-subscription'

type MatchDetailTab = 'markets' | 'exact' | 'halftime'

const detailTabs: Array<{ key: MatchDetailTab; label: string }> = [
  { key: 'markets', label: '比赛盘口' },
  { key: 'exact', label: '准确比分' },
  { key: 'halftime', label: '半场结果' },
]

function sectionCardClass() {
  return 'rounded-[20px] border border-white/8 bg-panel/95 shadow-[0_12px_28px_rgba(0,0,0,0.14)]'
}

function outcomeButtonClass(active: boolean, tone: 'positive' | 'negative' | 'neutral' = 'neutral') {
  if (!active) {
    return 'border-transparent bg-white/4 text-ink-soft hover:border-white/14 hover:text-ink'
  }

  if (tone === 'negative') {
    return 'border-transparent bg-rose-500/90 text-white'
  }

  return 'border-transparent bg-emerald-500/85 text-white'
}

function getSpreadFavoredSide(variant: { favoredSide?: 'home' | 'away'; homeHandicap: string }) {
  if (variant.favoredSide) {
    return variant.favoredSide
  }

  return variant.homeHandicap.startsWith('-') ? 'home' : 'away'
}

function EmptyDataSection({ title }: { title: string }) {
  return (
    <section className={sectionCardClass()}>
      <div className="px-3.5 py-3.5 sm:px-5 sm:py-4">
        <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">{title}</h2>
        <p className="mt-2 text-[12px] text-ink-soft sm:text-[14px]">当前详情接口暂未返回这部分真实数据。</p>
      </div>
    </section>
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

type MatchDetailLocationState = {
  backTo?: string
}

export function MatchDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as MatchDetailLocationState | null
  const [tab, setTab] = useState<MatchDetailTab>('markets')
  const {
    activeSelection,
    selectWinner,
    selectSpread,
    selectTotal,
    selectProposition,
    setSpreadVariant,
    setTotalLine,
  } = useOrderStore()
  const { data: detail, isLoading, isError, error } = useQuery({
    queryKey: ['world-cup-event-detail', slug],
    queryFn: () => getWorldCupEventDetail(slug),
    enabled: slug.length > 0,
  })
  const {
    data: exactScores = [],
    isLoading: isExactScoresLoading,
    isError: isExactScoresError,
    error: exactScoresError,
  } = useQuery({
    queryKey: ['world-cup-event-detail-exact-score', slug],
    queryFn: () => getWorldCupExactScores(slug),
    enabled: slug.length > 0 && tab === 'exact',
  })
  const {
    data: halftimeResult,
    isLoading: isHalftimeResultLoading,
    isError: isHalftimeResultError,
    error: halftimeResultError,
  } = useQuery({
    queryKey: ['world-cup-event-detail-halftime-result', slug, detail?.match.id],
    queryFn: () => getWorldCupHalftimeResult(slug, detail.match),
    enabled: slug.length > 0 && tab === 'halftime' && !!detail,
  })

  const subscribedAssetIds = useMemo(() => {
    if (!detail) {
      return []
    }

    const activeSpreadVariant =
      activeSelection?.contextType === 'match' &&
      activeSelection.matchId === detail.match.id &&
      activeSelection.template === 'spread'
        ? detail.spreadVariants.find((variant) => variant.id === activeSelection.activeVariantId) ??
          detail.spreadVariants[0]
        : detail.spreadVariants[0]

    const activeTotalLine =
      activeSelection?.contextType === 'match' &&
      activeSelection.matchId === detail.match.id &&
      activeSelection.template === 'total'
        ? detail.totalLines.find((line) => line.id === activeSelection.activeLineId) ??
          detail.totalLines[0]
        : detail.totalLines[0]

    return [
      ...detail.match.winnerMarket.outcomes.flatMap((outcome) => [outcome.yesAssetId, outcome.noAssetId]),
      activeSpreadVariant?.homeAssetId,
      activeSpreadVariant?.awayAssetId,
      activeTotalLine?.overAssetId,
      activeTotalLine?.underAssetId,
      ...(detail.bothTeamsToScore
        ? [detail.bothTeamsToScore.yesAssetId, detail.bothTeamsToScore.noAssetId]
        : []),
      ...(tab === 'exact' ? exactScores.flatMap((item) => [item.yesAssetId, item.noAssetId]) : []),
      ...(tab === 'halftime'
        ? (halftimeResult?.outcomes.flatMap((outcome) => [outcome.yesAssetId, outcome.noAssetId]) ?? [])
        : []),
    ]
  }, [activeSelection, detail, exactScores, halftimeResult, tab])

  usePolymarketAssetSubscription(subscribedAssetIds)

  useEffect(() => {
    if (!detail) {
      return
    }

    const currentMatchSelected =
      activeSelection?.contextType === 'match' && activeSelection.matchId === detail.match.id

    if (!currentMatchSelected) {
      const defaultOutcome = detail.match.winnerMarket.outcomes[0]

      if (defaultOutcome) {
        selectWinner(detail.match, defaultOutcome, 'yes', { openPanel: false })
      }
    }
  }, [activeSelection, detail, selectWinner])

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        正在加载比赛详情...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel/95 p-4 text-[13px] text-rose-300">
        比赛详情加载失败：{error instanceof Error ? error.message : '未知错误'}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        未找到对应比赛详情。
      </div>
    )
  }

  const isCurrentMatchSelection =
    activeSelection?.contextType === 'match' && activeSelection.matchId === detail.match.id

  const currentSpreadVariant =
    isCurrentMatchSelection && activeSelection?.template === 'spread'
      ? detail.spreadVariants.find((variant) => variant.id === activeSelection.activeVariantId) ??
        detail.spreadVariants[0]
      : detail.spreadVariants[0]

  const currentTotalLine =
    isCurrentMatchSelection && activeSelection?.template === 'total'
      ? detail.totalLines.find((line) => line.id === activeSelection.activeLineId) ?? detail.totalLines[0]
      : detail.totalLines[0]

  return (
    <div className="grid gap-3 sm:gap-4">
      <div>
        <button
          type="button"
          onClick={() => navigate(state?.backTo ?? '/matches')}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-white/14 hover:text-ink sm:px-3.5 sm:py-2 sm:text-[12px]"
        >
          <span aria-hidden="true" className="text-[13px] leading-none">
            ‹
          </span>
          返回
        </button>
      </div>

      <section className="rounded-[22px] border border-white/8 bg-panel/95 px-3.5 py-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.16)] sm:px-5 sm:py-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink sm:text-[34px]">
          {detail.match.matchup}
        </h1>
        <div className="mt-2 text-[13px] font-medium text-ink-soft sm:mt-3 sm:text-[16px]">
          ◔ {detail.countdownLabel}
        </div>

        <div className="mt-4 border-t border-white/8 pt-4 sm:mt-6 sm:pt-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex items-center justify-center gap-2.5 lg:justify-start">
              <TeamMark
                alt={detail.match.primaryTeam}
                emoji={detail.match.primaryFlag}
                logo={detail.match.primaryLogo}
                className="h-11 w-11 rounded-[12px] object-cover sm:h-14 sm:w-14"
                fallbackClassName="text-[34px] sm:text-[44px]"
              />
              <div className="text-[18px] font-semibold text-ink sm:text-[30px]">
                {detail.match.primaryTeam}
              </div>
            </div>

            <div className="text-center">
              <div className="text-[17px] font-semibold text-ink sm:text-[26px]">
                {detail.headerTimeLabel}
              </div>
              <div className="mt-1.5 text-[13px] text-ink-soft sm:mt-2 sm:text-[18px]">
                {detail.headerDateLabel}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2.5 lg:justify-end">
              <div className="text-[18px] font-semibold text-ink sm:text-[30px]">
                {detail.match.secondaryTeam}
              </div>
              <TeamMark
                alt={detail.match.secondaryTeam}
                emoji={detail.match.secondaryFlag}
                logo={detail.match.secondaryLogo}
                className="h-11 w-11 rounded-[12px] object-cover sm:h-14 sm:w-14"
                fallbackClassName="text-[34px] sm:text-[44px]"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.42fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-4 overflow-x-auto text-[12px] font-semibold text-ink-soft sm:mb-4 sm:text-[15px]">
            {detailTabs.map((detailTab) => (
              <button
                key={detailTab.key}
                type="button"
                onClick={() => setTab(detailTab.key)}
                className={detailTab.key === tab ? 'text-ink' : 'transition hover:text-ink'}
              >
                {detailTab.label}
              </button>
            ))}
          </div>

          {tab === 'markets' ? (
            <div className="grid gap-3 sm:gap-4">
              <section className={sectionCardClass()}>
                <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">Moneyline</h2>
                    <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">{detail.moneylineVolumeLabel}</p>
                  </div>
                  <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
                    {detail.match.winnerMarket.outcomes.map((outcome) => {
                      const isActive =
                        isCurrentMatchSelection &&
                        activeSelection?.template === 'winner' &&
                        activeSelection.subject === outcome.subject

                      return (
                        <button
                          key={outcome.id}
                          type="button"
                          onClick={() => selectWinner(detail.match, outcome)}
                          className={[
                            'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                            outcomeButtonClass(isActive, outcome.shortLabel === 'DRAW' ? 'neutral' : 'positive'),
                          ].join(' ')}
                        >
                          {outcome.shortLabel}{' '}
                          <RealtimePriceValue assetId={outcome.yesAssetId} fallbackPrice={outcome.yesPrice} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>

              {detail.spreadVariants.length && currentSpreadVariant ? (
                <section className={sectionCardClass()}>
                  <div className="flex flex-col gap-3 border-b border-white/8 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                    <div>
                      <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">让分</h2>
                      <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">{detail.spreadVolumeLabel}</p>
                    </div>
                    <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => selectSpread(detail.match, currentSpreadVariant.id, 'home')}
                        className={[
                          'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[140px] sm:px-4 sm:py-3 sm:text-[15px]',
                          outcomeButtonClass(
                            isCurrentMatchSelection &&
                              activeSelection?.template === 'spread' &&
                              activeSelection.activeTeamSide === 'home',
                            'positive',
                          ),
                        ].join(' ')}
                      >
                        {detail.match.winnerMarket.outcomes[0]?.shortLabel} {currentSpreadVariant.homeHandicap}{' '}
                        <RealtimePriceValue
                          assetId={currentSpreadVariant.homeAssetId}
                          fallbackPrice={currentSpreadVariant.homePrice}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectSpread(detail.match, currentSpreadVariant.id, 'away')}
                        className={[
                          'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[140px] sm:px-4 sm:py-3 sm:text-[15px]',
                          outcomeButtonClass(
                            isCurrentMatchSelection &&
                              activeSelection?.template === 'spread' &&
                              activeSelection.activeTeamSide === 'away',
                            'negative',
                          ),
                        ].join(' ')}
                      >
                        {detail.match.winnerMarket.outcomes[2]?.shortLabel} {currentSpreadVariant.awayHandicap}{' '}
                        <RealtimePriceValue
                          assetId={currentSpreadVariant.awayAssetId}
                          fallbackPrice={currentSpreadVariant.awayPrice}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3.5 py-3 text-[13px] text-ink-soft sm:px-5 sm:py-4 sm:text-[14px]">
                    <span className="text-lg sm:text-xl">‹</span>
                    <div className="flex flex-1 items-center justify-center gap-5 overflow-x-auto sm:gap-6">
                      {detail.spreadVariants.map((variant) => {
                        const isActive = currentSpreadVariant.id === variant.id

                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() => {
                              if (isCurrentMatchSelection && activeSelection?.template === 'spread') {
                                setSpreadVariant(variant.id)
                              } else {
                                selectSpread(detail.match, variant.id, getSpreadFavoredSide(variant))
                              }
                            }}
                            className={isActive ? 'font-semibold text-ink' : 'transition hover:text-ink'}
                          >
                            {variant.displayLine}
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-lg sm:text-xl">›</span>
                  </div>
                </section>
              ) : null}

              {detail.totalLines.length && currentTotalLine ? (
                <section className={sectionCardClass()}>
                  <div className="flex flex-col gap-3 border-b border-white/8 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                    <div>
                      <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">总分</h2>
                      <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">{detail.totalVolumeLabel}</p>
                    </div>
                    <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => selectTotal(detail.match, currentTotalLine.id, 'over')}
                        className={[
                          'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[140px] sm:px-4 sm:py-3 sm:text-[15px]',
                          outcomeButtonClass(
                            isCurrentMatchSelection &&
                              activeSelection?.template === 'total' &&
                              activeSelection.activeSide === 'over',
                            'positive',
                          ),
                        ].join(' ')}
                      >
                        O {currentTotalLine.line}{' '}
                        <RealtimePriceValue
                          assetId={currentTotalLine.overAssetId}
                          fallbackPrice={currentTotalLine.overPrice}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => selectTotal(detail.match, currentTotalLine.id, 'under')}
                        className={[
                          'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[140px] sm:px-4 sm:py-3 sm:text-[15px]',
                          outcomeButtonClass(
                            isCurrentMatchSelection &&
                              activeSelection?.template === 'total' &&
                              activeSelection.activeSide === 'under',
                            'negative',
                          ),
                        ].join(' ')}
                      >
                        U {currentTotalLine.line}{' '}
                        <RealtimePriceValue
                          assetId={currentTotalLine.underAssetId}
                          fallbackPrice={currentTotalLine.underPrice}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3.5 py-3 text-[13px] text-ink-soft sm:px-5 sm:py-4 sm:text-[14px]">
                    <span className="text-lg sm:text-xl">‹</span>
                    <div className="flex flex-1 items-center justify-center gap-5 overflow-x-auto sm:gap-6">
                      {detail.totalLines.map((line) => {
                        const isActive = currentTotalLine.id === line.id

                        return (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => {
                              if (isCurrentMatchSelection && activeSelection?.template === 'total') {
                                setTotalLine(line.id)
                              } else {
                                selectTotal(detail.match, line.id, 'over')
                              }
                            }}
                            className={isActive ? 'font-semibold text-ink' : 'transition hover:text-ink'}
                          >
                            {line.line}
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-lg sm:text-xl">›</span>
                  </div>
                </section>
              ) : null}

              {detail.bothTeamsToScore ? (
                <section className={sectionCardClass()}>
                <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">
                      {detail.bothTeamsToScore.title}
                    </h2>
                    <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">
                      {detail.bothTeamsToScore.volumeLabel}
                    </p>
                  </div>
                  <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        selectProposition(
                          {
                            contextType: 'match',
                            sourceTab: 'matches',
                            matchId: detail.match.id,
                            marketId: detail.bothTeamsToScore.marketId ?? detail.bothTeamsToScore.id,
                            negRisk: detail.bothTeamsToScore.negRisk,
                            title: detail.match.matchup,
                            badge: detail.bothTeamsToScore.badge,
                            badgeLogo: detail.bothTeamsToScore.badgeLogo,
                            subject: detail.bothTeamsToScore.title,
                            shortLabel: detail.bothTeamsToScore.shortLabel,
                            yesPrice: detail.bothTeamsToScore.yesPrice,
                            noPrice: detail.bothTeamsToScore.noPrice,
                            yesOrderPrice: detail.bothTeamsToScore.yesOrderPrice,
                            noOrderPrice: detail.bothTeamsToScore.noOrderPrice,
                            yesAssetId: detail.bothTeamsToScore.yesAssetId,
                            noAssetId: detail.bothTeamsToScore.noAssetId,
                            activeSide: 'yes',
                          },
                          { openPanel: true },
                        )
                      }
                      className={[
                        'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                        outcomeButtonClass(
                          isCurrentMatchSelection &&
                            activeSelection?.template === 'winner' &&
                            activeSelection.subject === detail.bothTeamsToScore.title &&
                            activeSelection.activeSide === 'yes',
                          'positive',
                        ),
                      ].join(' ')}
                    >
                      YES{' '}
                      <RealtimePriceValue
                        assetId={detail.bothTeamsToScore.yesAssetId}
                        fallbackPrice={detail.bothTeamsToScore.yesPrice}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectProposition(
                          {
                            contextType: 'match',
                            sourceTab: 'matches',
                            matchId: detail.match.id,
                            marketId: detail.bothTeamsToScore.marketId ?? detail.bothTeamsToScore.id,
                            negRisk: detail.bothTeamsToScore.negRisk,
                            title: detail.match.matchup,
                            badge: detail.bothTeamsToScore.badge,
                            badgeLogo: detail.bothTeamsToScore.badgeLogo,
                            subject: detail.bothTeamsToScore.title,
                            shortLabel: detail.bothTeamsToScore.shortLabel,
                            yesPrice: detail.bothTeamsToScore.yesPrice,
                            noPrice: detail.bothTeamsToScore.noPrice,
                            yesOrderPrice: detail.bothTeamsToScore.yesOrderPrice,
                            noOrderPrice: detail.bothTeamsToScore.noOrderPrice,
                            yesAssetId: detail.bothTeamsToScore.yesAssetId,
                            noAssetId: detail.bothTeamsToScore.noAssetId,
                            activeSide: 'no',
                          },
                          { openPanel: true },
                        )
                      }
                      className={[
                        'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                        outcomeButtonClass(
                          isCurrentMatchSelection &&
                            activeSelection?.template === 'winner' &&
                            activeSelection.subject === detail.bothTeamsToScore.title &&
                            activeSelection.activeSide === 'no',
                          'negative',
                        ),
                      ].join(' ')}
                    >
                      NO{' '}
                      <RealtimePriceValue
                        assetId={detail.bothTeamsToScore.noAssetId}
                        fallbackPrice={detail.bothTeamsToScore.noPrice}
                      />
                    </button>
                  </div>
                </div>
                </section>
              ) : null}
            </div>
          ) : tab === 'exact' ? (
            isExactScoresLoading ? (
              <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
                正在加载准确比分...
              </div>
            ) : isExactScoresError ? (
              <div className="rounded-[20px] border border-rose-500/20 bg-panel/95 p-4 text-[13px] text-rose-300">
                准确比分加载失败：{exactScoresError instanceof Error ? exactScoresError.message : '未知错误'}
              </div>
            ) : exactScores.length ? (
            <div className="grid gap-3 sm:gap-4">
              {exactScores.map((item) => {
                const isActive =
                  isCurrentMatchSelection &&
                  activeSelection?.template === 'winner' &&
                  activeSelection.subject === item.subject

                return (
                  <section key={item.id} className={sectionCardClass()}>
                    <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                      <div>
                        <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">{item.title}</h2>
                        <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">{item.volumeLabel}</p>
                      </div>
                      <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,1fr))] gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            selectProposition(
                              {
                                contextType: 'match',
                                sourceTab: 'matches',
                                matchId: detail.match.id,
                                marketId: item.marketId ?? item.id,
                                negRisk: item.negRisk,
                                title: detail.match.matchup,
                                badge: item.badge,
                                badgeLogo: item.badgeLogo,
                                subject: item.subject,
                                shortLabel: item.shortLabel,
                                yesPrice: item.yesPrice,
                                noPrice: item.noPrice,
                                yesOrderPrice: item.yesOrderPrice,
                                noOrderPrice: item.noOrderPrice,
                                yesAssetId: item.yesAssetId,
                                noAssetId: item.noAssetId,
                                activeSide: 'yes',
                              },
                              { openPanel: true },
                            )
                          }
                          className={[
                            'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                            outcomeButtonClass(isActive && activeSelection?.activeSide === 'yes', 'positive'),
                          ].join(' ')}
                        >
                          YES <RealtimePriceValue assetId={item.yesAssetId} fallbackPrice={item.yesPrice} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            selectProposition(
                              {
                                contextType: 'match',
                                sourceTab: 'matches',
                                matchId: detail.match.id,
                                marketId: item.marketId ?? item.id,
                                negRisk: item.negRisk,
                                title: detail.match.matchup,
                                badge: item.badge,
                                badgeLogo: item.badgeLogo,
                                subject: item.subject,
                                shortLabel: item.shortLabel,
                                yesPrice: item.yesPrice,
                                noPrice: item.noPrice,
                                yesOrderPrice: item.yesOrderPrice,
                                noOrderPrice: item.noOrderPrice,
                                yesAssetId: item.yesAssetId,
                                noAssetId: item.noAssetId,
                                activeSide: 'no',
                              },
                              { openPanel: true },
                            )
                          }
                          className={[
                            'min-w-0 whitespace-nowrap rounded-[14px] border px-2 py-2.5 text-[11px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                            outcomeButtonClass(isActive && activeSelection?.activeSide === 'no', 'negative'),
                          ].join(' ')}
                        >
                          NO <RealtimePriceValue assetId={item.noAssetId} fallbackPrice={item.noPrice} />
                        </button>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
            ) : (
              <EmptyDataSection title="准确比分" />
            )
          ) : isHalftimeResultLoading ? (
            <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
              正在加载半场结果...
            </div>
          ) : isHalftimeResultError ? (
            <div className="rounded-[20px] border border-rose-500/20 bg-panel/95 p-4 text-[13px] text-rose-300">
              半场结果加载失败：{halftimeResultError instanceof Error ? halftimeResultError.message : '未知错误'}
            </div>
          ) : (
            halftimeResult ? (
            <section className={sectionCardClass()}>
              <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">
                    {halftimeResult.title}
                  </h2>
                  <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">
                    {halftimeResult.volumeLabel}
                  </p>
                </div>
                <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
                  {halftimeResult.outcomes.map((outcome) => {
                    const isActive =
                      isCurrentMatchSelection &&
                      activeSelection?.template === 'winner' &&
                      activeSelection.subject === outcome.subject

                    return (
                      <button
                        key={outcome.id}
                        type="button"
                        onClick={() =>
                          selectProposition(
                            {
                              contextType: 'match',
                              sourceTab: 'matches',
                              matchId: detail.match.id,
                              marketId: outcome.marketId ?? outcome.id,
                              negRisk: outcome.negRisk,
                              title: detail.match.matchup,
                              badge: outcome.badge,
                              badgeLogo: outcome.badgeLogo,
                              subject: outcome.subject,
                              shortLabel: outcome.shortLabel,
                              yesPrice: outcome.yesPrice,
                              noPrice: outcome.noPrice,
                              yesOrderPrice: outcome.yesOrderPrice,
                              noOrderPrice: outcome.noOrderPrice,
                              yesAssetId: outcome.yesAssetId,
                              noAssetId: outcome.noAssetId,
                              activeSide: 'yes',
                            },
                            { openPanel: true },
                          )
                        }
                        className={[
                          'min-w-0 whitespace-nowrap rounded-[14px] border px-1.5 py-2.5 text-[10.5px] font-semibold shadow-[inset_0_-6px_0_rgba(0,0,0,0.12)] transition sm:min-w-[126px] sm:px-4 sm:py-3 sm:text-[15px]',
                          outcomeButtonClass(isActive, outcome.shortLabel === 'DRAW' ? 'neutral' : 'positive'),
                        ].join(' ')}
                      >
                        {outcome.shortLabel}{' '}
                        <RealtimePriceValue assetId={outcome.yesAssetId} fallbackPrice={outcome.yesPrice} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
            ) : (
              <EmptyDataSection title="半场结果" />
            )
          )}
        </div>

        <div className="hidden lg:sticky lg:top-[84px] lg:block lg:self-start">
          <OrderPanel />
        </div>
      </div>

      {detail.contextDescription ? (
        <section className={sectionCardClass()}>
          <div className="px-3.5 py-3.5 sm:px-5 sm:py-4">
            <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">比赛背景</h2>
            <p className="mt-2 text-[12px] leading-6 text-ink-soft sm:mt-3 sm:text-[14px] sm:leading-7">
              {detail.contextDescription}
            </p>
          </div>
        </section>
      ) : null}

      <MobileOrderDrawer />
    </div>
  )
}
