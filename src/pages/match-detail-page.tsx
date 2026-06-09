import { useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { Fragment, type ReactNode, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getWorldCupEventDetail,
  getWorldCupExactScores,
  getWorldCupHalftimeResult,
} from '../features/home/api/get-world-cup-event-detail'
import { MobileOrderDrawer } from '../features/home/components/mobile-order-drawer'
import { OrderPanel } from '../features/home/components/order-panel'
import { TeamMark } from '../features/home/components/team-mark'
import type { MatchDetailProposition } from '../features/home/detail-data'
import type { MatchCard, TotalLine, WinnerOutcome } from '../features/home/home-data'
import { useOrderStore } from '../features/home/order-store'
import { useDisplayPrice } from '../features/market-realtime/price-utils'
import { RollingNumber } from '../features/market-realtime/rolling-number'
import { usePolymarketAssetSubscription } from '../features/market-realtime/use-polymarket-asset-subscription'

type MatchDetailLocationState = {
  backTo?: string
}

function sectionCardClass() {
  return 'overflow-hidden rounded-[20px] border border-white/8 bg-panel/95 shadow-[0_12px_28px_rgba(0,0,0,0.14)]'
}

function outcomeButtonClass(active: boolean) {
  return active
    ? 'border-brand/35 bg-brand/16 text-brand shadow-[inset_0_-6px_0_rgba(0,0,0,0.14)]'
    : 'border-white/8 bg-white/[0.035] text-ink-soft hover:border-white/18 hover:bg-white/[0.06] hover:text-ink'
}

function getWinnerOutcomeDisplayLabel(index: number, t: TFunction) {
  return index === 0
    ? t('matchDetail.betLabels.homeWin')
    : index === 1
      ? t('matchDetail.betLabels.draw')
      : t('matchDetail.betLabels.awayWin')
}

function formatOdds(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function RealtimePriceValue({
  assetId,
  fallbackPrice,
}: {
  assetId?: string
  fallbackPrice: number
}) {
  const price = useDisplayPrice(assetId, fallbackPrice)
  const displayPrice = formatOdds(price)

  return (
    <>
      <span aria-hidden="true">
        <RollingNumber value={displayPrice} />
      </span>
      <span className="sr-only">{displayPrice}</span>
    </>
  )
}

function MarketSection({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <section className={sectionCardClass()}>
      <div className="border-b border-white/8 px-3.5 py-3 sm:px-5 sm:py-4">
        <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">{title}</h2>
        {subtitle ? <p className="mt-1 text-[12px] text-ink-soft sm:text-[13px]">{subtitle}</p> : null}
      </div>
      <div className="px-3 py-3 sm:px-4 sm:py-4">{children}</div>
    </section>
  )
}

function EmptyDataSection({ title }: { title: string }) {
  const { t } = useTranslation()

  return (
    <MarketSection title={title}>
      <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3 text-[12px] text-ink-soft sm:text-[13px]">
        {t('matchDetail.emptyData')}
      </div>
    </MarketSection>
  )
}

function LoadingDataSection({ title, message }: { title: string; message: string }) {
  return (
    <MarketSection title={title}>
      <div className="rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-3 text-[12px] text-ink-soft sm:text-[13px]">
        {message}
      </div>
    </MarketSection>
  )
}

function ErrorDataSection({ title, message }: { title: string; message: string }) {
  return (
    <MarketSection title={title}>
      <div className="rounded-[14px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200 sm:text-[13px]">
        {message}
      </div>
    </MarketSection>
  )
}

function OddsButton({
  active,
  label,
  subLabel,
  assetId,
  fallbackPrice,
  onClick,
}: {
  active: boolean
  label: string
  subLabel?: string
  assetId?: string
  fallbackPrice: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'grid min-h-[58px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[13px] border px-3 py-2.5 text-left transition sm:min-h-[62px]',
        outcomeButtonClass(active),
      ].join(' ')}
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold leading-tight sm:text-[14px]">{label}</span>
        {subLabel ? <span className="mt-1 block truncate text-[11px] font-medium text-current/65">{subLabel}</span> : null}
      </span>
      <span className="text-[15px] font-semibold tabular-nums sm:text-[16px]">
        <RealtimePriceValue assetId={assetId} fallbackPrice={fallbackPrice} />
      </span>
    </button>
  )
}

function CompactOddsButton({
  active,
  label,
  assetId,
  fallbackPrice,
  onClick,
}: {
  active: boolean
  label: string
  assetId?: string
  fallbackPrice: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'grid min-h-[54px] min-w-0 place-items-center rounded-[10px] border px-1.5 py-2 text-center transition sm:min-h-[58px]',
        active
          ? 'border-brand/40 bg-brand/16 text-brand'
          : 'border-white/8 bg-white/[0.025] text-ink-soft hover:border-white/18 hover:bg-white/[0.05] hover:text-ink',
      ].join(' ')}
    >
      <span className="block max-w-full truncate text-[13px] font-semibold leading-tight sm:text-[14px]">
        {label}
      </span>
      <span className="mt-1 block text-[13px] font-semibold leading-none tabular-nums text-current/78 sm:text-[14px]">
        <RealtimePriceValue assetId={assetId} fallbackPrice={fallbackPrice} />
      </span>
    </button>
  )
}

function isWinnerOutcomeActive(
  activeSelection: ReturnType<typeof useOrderStore.getState>['activeSelection'],
  matchId: string,
  outcome: WinnerOutcome,
) {
  return (
    activeSelection?.contextType === 'match' &&
    activeSelection.matchId === matchId &&
    activeSelection.template === 'winner' &&
    activeSelection.activeSide === 'yes' &&
    activeSelection.marketId === (outcome.marketId ?? outcome.id) &&
    activeSelection.subject === outcome.subject
  )
}

function MoneylineSection({ match }: { match: MatchCard }) {
  const { t } = useTranslation()
  const { activeSelection, selectWinner } = useOrderStore()

  return (
    <MarketSection title={t('markets.types.moneyline')} subtitle={match.volumeLabel}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {match.winnerMarket.outcomes.map((outcome, outcomeIndex) => (
          <OddsButton
            key={outcome.id}
            active={isWinnerOutcomeActive(activeSelection, match.id, outcome)}
            label={getWinnerOutcomeDisplayLabel(outcomeIndex, t)}
            subLabel={outcome.subject}
            assetId={outcome.yesAssetId}
            fallbackPrice={outcome.yesPrice}
            onClick={() => selectWinner(match, outcome, 'yes')}
          />
        ))}
      </div>
    </MarketSection>
  )
}

function SpreadSection({ match }: { match: MatchCard }) {
  const { t } = useTranslation()
  const { activeSelection, selectSpread } = useOrderStore()

  if (!match.spreadMarket.variants.length) {
    return null
  }

  return (
    <MarketSection title={t('markets.types.spread')}>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-6">
        {match.spreadMarket.variants.map((variant) => {
          const homeActive =
            activeSelection?.contextType === 'match' &&
            activeSelection.matchId === match.id &&
            activeSelection.template === 'spread' &&
            activeSelection.activeVariantId === variant.id &&
            activeSelection.activeTeamSide === 'home'
          const awayActive =
            activeSelection?.contextType === 'match' &&
            activeSelection.matchId === match.id &&
            activeSelection.template === 'spread' &&
              activeSelection.activeVariantId === variant.id &&
              activeSelection.activeTeamSide === 'away'

          return (
            <Fragment key={variant.id}>
              <CompactOddsButton
                active={homeActive}
                label={`${t('markets.outcomes.home')} ${variant.homeHandicap}`}
                assetId={variant.homeAssetId}
                fallbackPrice={variant.homePrice}
                onClick={() => selectSpread(match, variant.id, 'home')}
              />
              <CompactOddsButton
                active={awayActive}
                label={`${t('markets.outcomes.away')} ${variant.awayHandicap}`}
                assetId={variant.awayAssetId}
                fallbackPrice={variant.awayPrice}
                onClick={() => selectSpread(match, variant.id, 'away')}
              />
            </Fragment>
          )
        })}
      </div>
    </MarketSection>
  )
}

function TotalSection({ match }: { match: MatchCard }) {
  const { t } = useTranslation()
  const { activeSelection, selectTotal } = useOrderStore()

  if (!match.totalMarket.lines.length) {
    return null
  }

  return (
    <MarketSection title={t('markets.types.total')}>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 xl:grid-cols-6">
        {match.totalMarket.lines.map((line: TotalLine) => {
          const overActive =
            activeSelection?.contextType === 'match' &&
            activeSelection.matchId === match.id &&
            activeSelection.template === 'total' &&
            activeSelection.activeLineId === line.id &&
            activeSelection.activeSide === 'over'
          const underActive =
            activeSelection?.contextType === 'match' &&
            activeSelection.matchId === match.id &&
            activeSelection.template === 'total' &&
              activeSelection.activeLineId === line.id &&
              activeSelection.activeSide === 'under'

          return (
            <Fragment key={line.id}>
              <CompactOddsButton
                active={overActive}
                label={`${t('markets.outcomes.over')} ${line.line}`}
                assetId={line.overAssetId}
                fallbackPrice={line.overPrice}
                onClick={() => selectTotal(match, line.id, 'over')}
              />
              <CompactOddsButton
                active={underActive}
                label={`${t('markets.outcomes.under')} ${line.line}`}
                assetId={line.underAssetId}
                fallbackPrice={line.underPrice}
                onClick={() => selectTotal(match, line.id, 'under')}
              />
            </Fragment>
          )
        })}
      </div>
    </MarketSection>
  )
}

export function MatchDetailPage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const state = location.state as MatchDetailLocationState | null
  const defaultSelectionKeyRef = useRef('')
  const { activeSelection, selectWinner, selectProposition } = useOrderStore()
  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ['world-cup-event-detail', slug, language],
    queryFn: () => getWorldCupEventDetail(slug, language),
    enabled: slug.length > 0,
  })
  const {
    data: exactScores = [],
    isLoading: isExactScoresLoading,
    isError: isExactScoresError,
  } = useQuery({
    queryKey: ['world-cup-event-detail-exact-score', slug, language],
    queryFn: () => getWorldCupExactScores(slug, language),
    enabled: slug.length > 0,
  })
  const {
    data: halftimeResult,
    isLoading: isHalftimeResultLoading,
    isError: isHalftimeResultError,
  } = useQuery({
    queryKey: ['world-cup-event-detail-halftime-result', slug, detail?.match.id, language],
    queryFn: () => getWorldCupHalftimeResult(slug, detail.match, language),
    enabled: slug.length > 0 && !!detail,
  })

  const subscribedAssetIds = useMemo(() => {
    if (!detail) {
      return []
    }

    return [
      ...detail.match.winnerMarket.outcomes.map((outcome) => outcome.yesAssetId),
      ...detail.match.spreadMarket.variants.flatMap((variant) => [variant.homeAssetId, variant.awayAssetId]),
      ...detail.match.totalMarket.lines.flatMap((line) => [line.overAssetId, line.underAssetId]),
      ...exactScores.map((item) => item.yesAssetId),
      ...(halftimeResult?.outcomes.map((outcome) => outcome.yesAssetId) ?? []),
    ]
  }, [detail, exactScores, halftimeResult])

  usePolymarketAssetSubscription(subscribedAssetIds)

  useEffect(() => {
    const defaultOutcome = detail?.match.winnerMarket.outcomes[0]
    if (!detail || !defaultOutcome) {
      return
    }

    const defaultSelectionKey = `${detail.match.id}:moneyline:${defaultOutcome.id}`
    if (defaultSelectionKeyRef.current === defaultSelectionKey) {
      return
    }

    defaultSelectionKeyRef.current = defaultSelectionKey
    selectWinner(detail.match, defaultOutcome, 'yes', { openPanel: false })
  }, [detail, selectWinner])

  if (isLoading) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        {t('matchDetail.loading')}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-[20px] border border-rose-500/20 bg-panel/95 p-4 text-[13px] text-rose-300">
        {t('matchDetail.error')}
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="rounded-[20px] border border-white/8 bg-panel/95 p-4 text-[13px] text-ink-soft">
        {t('matchDetail.notFound')}
      </div>
    )
  }

  const selectExactScore = (item: MatchDetailProposition) => {
    selectProposition({
      contextType: 'match',
      sourceTab: 'matches',
      matchId: detail.match.id,
      eventSlug: item.eventSlug ?? detail.match.slug,
      marketId: item.marketId ?? item.id,
      marketSlug: item.marketSlug,
      conditionId: item.conditionId,
      acceptingOrders: item.acceptingOrders,
      negRisk: item.negRisk,
      eventTitle: detail.match.matchup,
      eventTitleZh: detail.match.matchup,
      marketTitle: item.shortLabel,
      marketTitleZh: item.shortLabel,
      yesOutcomeTitle: item.yesOutcomeTitle,
      noOutcomeTitle: item.noOutcomeTitle,
      yesOutcomeTitleZh: item.yesOutcomeTitleZh,
      noOutcomeTitleZh: item.noOutcomeTitleZh,
      title: detail.match.matchup,
      badge: item.badge,
      badgeLogo: item.badgeLogo,
      subject: item.shortLabel,
      shortLabel: item.shortLabel,
      yesPrice: item.yesPrice,
      noPrice: item.noPrice,
      yesOrderPrice: item.yesOrderPrice,
      noOrderPrice: item.noOrderPrice,
      yesAssetId: item.yesAssetId,
      noAssetId: item.noAssetId,
      activeSide: 'yes',
    })
  }

  const selectHalftimeOutcome = (outcome: WinnerOutcome) => {
    selectProposition({
      contextType: 'match',
      sourceTab: 'matches',
      matchId: detail.match.id,
      eventSlug: outcome.eventSlug ?? detail.match.slug,
      marketId: outcome.marketId ?? outcome.id,
      marketSlug: outcome.marketSlug,
      conditionId: outcome.conditionId,
      acceptingOrders: outcome.acceptingOrders,
      negRisk: outcome.negRisk,
      eventTitle: detail.match.matchup,
      eventTitleZh: detail.match.matchup,
      marketTitle: outcome.marketTitle,
      marketTitleZh: outcome.marketTitleZh,
      yesOutcomeTitle: outcome.yesOutcomeTitle,
      noOutcomeTitle: outcome.noOutcomeTitle,
      yesOutcomeTitleZh: outcome.yesOutcomeTitleZh,
      noOutcomeTitleZh: outcome.noOutcomeTitleZh,
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
    })
  }

  return (
    <div className="grid gap-3 sm:gap-4">
      <div>
        <button
          type="button"
          onClick={() => {
            if (state?.backTo) {
              navigate(-1)
              return
            }

            navigate('/matches')
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-white/14 hover:text-ink sm:px-3.5 sm:py-2 sm:text-[12px]"
        >
          <span aria-hidden="true" className="text-[13px] leading-none">
            ‹
          </span>
          {t('actions.back')}
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
        <div className="grid min-w-0 gap-3 sm:gap-4">
          <div className="grid gap-3 sm:gap-4">
            <div className="px-1 text-[13px] font-semibold text-ink-soft sm:text-[14px]">
              {t('matchDetail.sections.matchMarkets')}
            </div>
            <MoneylineSection match={detail.match} />
            <SpreadSection match={detail.match} />
            <TotalSection match={detail.match} />
          </div>

          {isExactScoresLoading ? (
            <LoadingDataSection title={t('matchDetail.sections.exactScore')} message={t('matchDetail.exact.loading')} />
          ) : isExactScoresError ? (
            <ErrorDataSection title={t('matchDetail.sections.exactScore')} message={t('matchDetail.exact.error')} />
          ) : exactScores.length ? (
            <MarketSection title={t('matchDetail.sections.exactScore')}>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6">
                {exactScores.map((item) => {
                  const isActive =
                    activeSelection?.contextType === 'match' &&
                    activeSelection.matchId === detail.match.id &&
                    activeSelection.template === 'winner' &&
                    activeSelection.activeSide === 'yes' &&
                    activeSelection.marketId === (item.marketId ?? item.id) &&
                    activeSelection.shortLabel === item.shortLabel

                  return (
                    <CompactOddsButton
                      key={item.id}
                      active={isActive}
                      label={item.shortLabel}
                      assetId={item.yesAssetId}
                      fallbackPrice={item.yesPrice}
                      onClick={() => selectExactScore(item)}
                    />
                  )
                })}
              </div>
            </MarketSection>
          ) : (
            <EmptyDataSection title={t('matchDetail.sections.exactScore')} />
          )}

          {isHalftimeResultLoading ? (
            <LoadingDataSection title={t('matchDetail.sections.halftime')} message={t('matchDetail.halftime.loading')} />
          ) : isHalftimeResultError ? (
            <ErrorDataSection title={t('matchDetail.sections.halftime')} message={t('matchDetail.halftime.error')} />
          ) : halftimeResult ? (
            <MarketSection title={halftimeResult.title} subtitle={halftimeResult.volumeLabel}>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {halftimeResult.outcomes.map((outcome, outcomeIndex) => (
                  <OddsButton
                    key={outcome.id}
                    active={isWinnerOutcomeActive(activeSelection, detail.match.id, outcome)}
                    label={getWinnerOutcomeDisplayLabel(outcomeIndex, t)}
                    subLabel={outcome.subject}
                    assetId={outcome.yesAssetId}
                    fallbackPrice={outcome.yesPrice}
                    onClick={() => selectHalftimeOutcome(outcome)}
                  />
                ))}
              </div>
            </MarketSection>
          ) : (
            <EmptyDataSection title={t('matchDetail.sections.halftime')} />
          )}

          {detail.contextDescription ? (
            <section className={sectionCardClass()}>
              <div className="px-3.5 py-3.5 sm:px-5 sm:py-4">
                <h2 className="text-[15px] font-semibold text-ink sm:text-[18px]">
                  {t('matchDetail.sections.context')}
                </h2>
                <p className="mt-2 text-[12px] leading-6 text-ink-soft sm:mt-3 sm:text-[14px] sm:leading-7">
                  {detail.contextDescription}
                </p>
              </div>
            </section>
          ) : null}
        </div>

        <div className="hidden lg:sticky lg:top-[84px] lg:block lg:self-start">
          <OrderPanel />
        </div>
      </div>

      <MobileOrderDrawer />
    </div>
  )
}
