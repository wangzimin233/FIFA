import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMatchDetail } from '../features/home/detail-data'
import { MobileOrderDrawer } from '../features/home/components/mobile-order-drawer'
import { OrderPanel } from '../features/home/components/order-panel'
import { useOrderStore } from '../features/home/order-store'

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

export function MatchDetailPage() {
  const { matchId = '' } = useParams()
  const navigate = useNavigate()
  const detail = useMemo(() => getMatchDetail(matchId), [matchId])
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
          onClick={() => navigate(-1)}
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
              <div className="text-[34px] sm:text-[44px]">{detail.match.primaryFlag}</div>
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
              <div className="text-[34px] sm:text-[44px]">{detail.match.secondaryFlag}</div>
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
                          {outcome.shortLabel} {outcome.yesPrice}¢
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>

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
                      {currentSpreadVariant.homePrice}¢
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
                      {currentSpreadVariant.awayPrice}¢
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
                              selectSpread(detail.match, variant.id, 'home')
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
                      O {currentTotalLine.line} {currentTotalLine.overPrice}¢
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
                      U {currentTotalLine.line} {currentTotalLine.underPrice}¢
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
                            title: detail.match.matchup,
                            badge: detail.bothTeamsToScore.badge,
                            subject: detail.bothTeamsToScore.title,
                            shortLabel: detail.bothTeamsToScore.shortLabel,
                            yesPrice: detail.bothTeamsToScore.yesPrice,
                            noPrice: detail.bothTeamsToScore.noPrice,
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
                      YES {detail.bothTeamsToScore.yesPrice}¢
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectProposition(
                          {
                            contextType: 'match',
                            sourceTab: 'matches',
                            matchId: detail.match.id,
                            title: detail.match.matchup,
                            badge: detail.bothTeamsToScore.badge,
                            subject: detail.bothTeamsToScore.title,
                            shortLabel: detail.bothTeamsToScore.shortLabel,
                            yesPrice: detail.bothTeamsToScore.yesPrice,
                            noPrice: detail.bothTeamsToScore.noPrice,
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
                      NO {detail.bothTeamsToScore.noPrice}¢
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : tab === 'exact' ? (
            <div className="grid gap-3 sm:gap-4">
              {detail.exactScores.map((item) => {
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
                                title: detail.match.matchup,
                                badge: item.badge,
                                subject: item.subject,
                                shortLabel: item.shortLabel,
                                yesPrice: item.yesPrice,
                                noPrice: item.noPrice,
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
                          YES {item.yesPrice}¢
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            selectProposition(
                              {
                                contextType: 'match',
                                sourceTab: 'matches',
                                matchId: detail.match.id,
                                title: detail.match.matchup,
                                badge: item.badge,
                                subject: item.subject,
                                shortLabel: item.shortLabel,
                                yesPrice: item.yesPrice,
                                noPrice: item.noPrice,
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
                          NO {item.noPrice}¢
                        </button>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <section className={sectionCardClass()}>
              <div className="flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                <div>
                  <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">
                    {detail.halftimeResult.title}
                  </h2>
                  <p className="mt-1 text-[12px] text-ink-soft sm:text-[14px]">
                    {detail.halftimeResult.volumeLabel}
                  </p>
                </div>
                <div className="grid min-w-0 grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:gap-2">
                  {detail.halftimeResult.outcomes.map((outcome) => {
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
                              title: detail.match.matchup,
                              badge: outcome.badge,
                              subject: outcome.subject,
                              shortLabel: outcome.shortLabel,
                              yesPrice: outcome.yesPrice,
                              noPrice: outcome.noPrice,
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
                        {outcome.shortLabel} {outcome.yesPrice}¢
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="hidden lg:sticky lg:top-[84px] lg:block lg:self-start">
          <OrderPanel />
        </div>
      </div>

      <MobileOrderDrawer />
    </div>
  )
}
