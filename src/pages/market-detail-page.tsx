import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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

function actionButtonClass(active: boolean, tone: 'positive' | 'negative' = 'positive') {
  if (!active) {
    return 'border-transparent bg-white/4 text-ink-soft hover:border-white/14 hover:text-ink'
  }

  return tone === 'negative'
    ? 'border-transparent bg-rose-500/90 text-white'
    : 'border-transparent bg-emerald-500/85 text-white'
}

export function MarketDetailPage() {
  const { marketId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as MarketDetailLocationState | null
  const initialMarket = state?.marketCard?.id === marketId ? state.marketCard : undefined
  const { activeSelection, selectProposition } = useOrderStore()
  const isActiveMarketWinnerSelection =
    activeSelection?.contextType === 'market' && activeSelection.template === 'winner'
  const { data: market, isLoading, isError, error } = useQuery({
    queryKey: ['world-cup-prop-card', marketId],
    queryFn: () => getWorldCupPropCardById(marketId, WORLD_CUP_PROPS_PAGE_SIZE),
    enabled: marketId.length > 0,
    initialData: initialMarket,
  })

  useEffect(() => {
    if (!market) {
      return
    }

    if (market.kind === 'list') {
      const candidate =
        market.candidates.find((item) => item.name === state?.preselectedCandidateName) ?? market.candidates[0]

      if (!candidate) {
        return
      }

      const shouldReselect =
        !isActiveMarketWinnerSelection ||
        activeSelection.matchId !== market.id ||
        activeSelection.subject !== candidate.name

      if (shouldReselect) {
        selectProposition(
          {
            contextType: 'market',
            sourceTab: 'markets',
            matchId: market.id,
            title: market.title,
            badge: market.icon,
            badgeLogo: market.iconLogo,
            subject: candidate.name,
            shortLabel: candidate.name,
            yesPrice: candidate.yesPrice,
            noPrice: candidate.noPrice,
            activeSide: 'yes',
          },
          { openPanel: false },
        )
      }

      return
    }

    const shouldReselect =
      !isActiveMarketWinnerSelection ||
      activeSelection.matchId !== market.id ||
      activeSelection.subject !== market.subject

    if (shouldReselect) {
      selectProposition(
        {
          contextType: 'market',
          sourceTab: 'markets',
          matchId: market.id,
          title: market.title,
          badge: market.icon,
          badgeLogo: market.iconLogo,
          subject: market.subject,
          shortLabel: market.subject,
          yesPrice: market.yesPrice,
          noPrice: market.noPrice,
          activeSide: 'yes',
        },
        { openPanel: false },
      )
    }
  }, [activeSelection, isActiveMarketWinnerSelection, market, selectProposition, state?.preselectedCandidateName])

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
        玩法详情加载失败：{error instanceof Error ? error.message : '未知错误'}
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
              const isActive =
                isActiveMarketWinnerSelection &&
                activeSelection.matchId === market.id &&
                activeSelection.subject === candidate.name

              return (
                <section key={candidate.id ?? candidate.name} className={wrapperClass()}>
                  <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                      <div className="text-[18px] font-semibold text-ink">{candidate.name}</div>
                      <div className="mt-1 text-[13px] text-ink-soft">{candidate.probability}%</div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          selectProposition(
                            {
                              contextType: 'market',
                              sourceTab: 'markets',
                              matchId: market.id,
                              title: market.title,
                              badge: market.icon,
                              badgeLogo: market.iconLogo,
                              subject: candidate.name,
                              shortLabel: candidate.name,
                              yesPrice: candidate.yesPrice,
                              noPrice: candidate.noPrice,
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
                        YES {candidate.yesPrice}¢
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          selectProposition(
                            {
                              contextType: 'market',
                              sourceTab: 'markets',
                              matchId: market.id,
                              title: market.title,
                              badge: market.icon,
                              badgeLogo: market.iconLogo,
                              subject: candidate.name,
                              shortLabel: candidate.name,
                              yesPrice: candidate.yesPrice,
                              noPrice: candidate.noPrice,
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
                        NO {candidate.noPrice}¢
                      </button>
                    </div>
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
              <div className="text-[32px] font-semibold text-brand sm:text-[38px]">{market.probability}%</div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  selectProposition(
                    {
                      contextType: 'market',
                      sourceTab: 'markets',
                      matchId: market.id,
                      title: market.title,
                      badge: market.icon,
                      badgeLogo: market.iconLogo,
                      subject: market.subject,
                      shortLabel: market.subject,
                      yesPrice: market.yesPrice,
                      noPrice: market.noPrice,
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
                  ),
                ].join(' ')}
              >
                YES {market.yesPrice}¢
              </button>
              <button
                type="button"
                onClick={() =>
                  selectProposition(
                    {
                      contextType: 'market',
                      sourceTab: 'markets',
                      matchId: market.id,
                      title: market.title,
                      badge: market.icon,
                      badgeLogo: market.iconLogo,
                      subject: market.subject,
                      shortLabel: market.subject,
                      yesPrice: market.yesPrice,
                      noPrice: market.noPrice,
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
                NO {market.noPrice}¢
              </button>
            </div>
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
