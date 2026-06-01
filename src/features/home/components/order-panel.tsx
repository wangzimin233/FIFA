import { Button } from '@heroui/react'
import { motion } from 'motion/react'
import { type ReactNode, useMemo } from 'react'
import { useActiveSelectionPrice, useDisplayPrice } from '../../market-realtime/price-utils'
import { TeamMark } from './team-mark'
import { type MarketSelection, useOrderStore } from '../order-store'

const quickAmounts = [1, 5, 10, 100]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function formatCents(value: number) {
  return Number.isInteger(value) ? `${value}¢` : `${value.toFixed(1)}¢`
}

function getResultTone(selection: MarketSelection) {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes' ? 'text-brand' : 'text-rose-400'
  }

  if (selection.template === 'total') {
    return selection.activeSide === 'over' ? 'text-brand' : 'text-rose-400'
  }

  return 'text-brand'
}

function SelectionBadge({ value, logo }: { value: string; logo?: string }) {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-white/8 text-[18px] font-semibold text-ink">
      <TeamMark
        alt={value}
        emoji={value}
        logo={logo}
        className="h-8 w-8 rounded-[10px] object-cover"
        fallbackClassName="text-[18px]"
      />
    </div>
  )
}

function PanelShell({
  children,
  compact,
}: {
  children: ReactNode
  compact: boolean
}) {
  return (
    <motion.aside
      layout
      className={[
        'rounded-[20px] border border-white/8 bg-panel/95 shadow-[0_18px_38px_rgba(0,0,0,0.2)]',
        compact ? 'p-3' : 'p-3.5',
      ].join(' ')}
    >
      {children}
    </motion.aside>
  )
}

function AmountSection() {
  const { activeSelection, amount, addAmount, setAmount } = useOrderStore()
  const activePrice = useActiveSelectionPrice(activeSelection)
  const amountDisplay = useMemo(() => `$${amount}`, [amount])
  const amountTone = amount > 0 ? 'text-ink' : 'text-[#66758d]'
  const computedResult = useMemo(() => {
    if (!activeSelection || amount <= 0 || activePrice === null) {
      return null
    }

    const potentialReturn = activePrice > 0 ? amount / (activePrice / 100) : 0

    return {
      activePrice,
      potentialReturn,
      toneClass: getResultTone(activeSelection),
    }
  }, [activePrice, activeSelection, amount])

  return (
    <>
      <label className="mt-5 block">
        <div className="grid grid-cols-[24px_minmax(0,1fr)] items-end gap-x-3">
          <span className="whitespace-pre-line text-[12px] font-semibold leading-[0.96] text-ink">
            {'金\n额'}
          </span>
          <div className="relative min-w-0 text-right">
            <div
              className={[
                'pointer-events-none text-[42px] font-semibold leading-none tracking-[-0.04em] sm:text-[48px]',
                amountTone,
              ].join(' ')}
            >
              {amountDisplay}
            </div>
            <input
              value={amount === 0 ? '' : amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              inputMode="decimal"
              placeholder="0"
              aria-label="输入金额"
              className="absolute inset-0 w-full border-none bg-transparent text-right text-[42px] font-semibold text-transparent caret-white outline-none placeholder:text-transparent sm:text-[48px]"
            />
          </div>
        </div>
      </label>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {quickAmounts.map((quickAmount) => (
          <button
            key={quickAmount}
            type="button"
            onClick={() => addAmount(quickAmount)}
            className="flex h-10 items-center justify-center rounded-[12px] border border-white/8 bg-white/4 px-2 text-[11px] font-semibold text-ink-soft transition hover:border-brand/25 hover:text-ink"
          >
            +${quickAmount}
          </button>
        ))}
      </div>

      {computedResult ? (
        <div className="mt-3.5 text-center">
          <div className="text-[14px] font-semibold">
            <span className="text-ink">赢取 </span>
            <span className={computedResult.toneClass}>{formatCurrency(computedResult.potentialReturn)}</span>
          </div>
          <div className="mt-1 text-[11px] font-medium text-ink-soft">
            {formatCents(computedResult.activePrice)}
          </div>
        </div>
      ) : null}

      <Button className="mt-5 h-11 w-full rounded-[15px] bg-sky-500 text-[13px] font-semibold text-white shadow-[inset_0_-7px_0_rgba(0,0,0,0.14)] sm:h-12 sm:text-sm">
        交易
      </Button>
    </>
  )
}

function PanelHeader({
  badge,
  badgeLogo,
  title,
  subject,
  onClose,
}: {
  badge: string
  badgeLogo?: string
  title: string
  subject: string
  onClose?: () => void
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <SelectionBadge value={badge} logo={badgeLogo} />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand sm:text-[11px]">
              当前下单
            </p>
            <h3 className="mt-1.5 text-[15px] font-medium leading-tight text-ink-soft sm:text-[16px]">
              {title}
            </h3>
            <p className="mt-1 text-[15px] font-semibold leading-tight text-brand sm:text-[16px]">
              {subject}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/8 bg-white/4 text-[17px] text-ink-soft transition hover:text-ink"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}

function WinnerContent({ onClose }: { onClose?: () => void }) {
  const { activeSelection, setWinnerSide } = useOrderStore()
  const winnerSelection = activeSelection?.template === 'winner' ? activeSelection : null
  const yesPrice = useDisplayPrice(winnerSelection?.yesAssetId, winnerSelection?.yesPrice ?? 50)
  const noPrice = useDisplayPrice(winnerSelection?.noAssetId, winnerSelection?.noPrice ?? 50)

  if (!winnerSelection) {
    return null
  }

  const yesActive = winnerSelection.activeSide === 'yes'

  return (
    <>
      <PanelHeader
        badge={winnerSelection.badge}
        badgeLogo={winnerSelection.badgeLogo}
        title={winnerSelection.title}
        subject={winnerSelection.subject}
        onClose={onClose}
      />

      <div className="mt-4.5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setWinnerSide('yes')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            yesActive ? 'bg-emerald-500/85 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">Yes {yesPrice}¢</div>
        </button>
        <button
          type="button"
          onClick={() => setWinnerSide('no')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            !yesActive ? 'bg-rose-500/90 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">No {noPrice}¢</div>
        </button>
      </div>

      <AmountSection />
    </>
  )
}

function SpreadContent({ onClose }: { onClose?: () => void }) {
  const { activeSelection, setSpreadTeamSide } = useOrderStore()
  const spreadSelection = activeSelection?.template === 'spread' ? activeSelection : null

  const activeVariant =
    spreadSelection?.variants.find((variant) => variant.id === spreadSelection.activeVariantId) ??
    spreadSelection?.variants[0]
  const awayPrice = useDisplayPrice(activeVariant?.awayAssetId, activeVariant?.awayPrice ?? 50)
  const homePrice = useDisplayPrice(activeVariant?.homeAssetId, activeVariant?.homePrice ?? 50)

  if (!spreadSelection || !activeVariant) {
    return null
  }

  const awayActive = spreadSelection.activeTeamSide === 'away'

  return (
    <>
      <PanelHeader
        badge={spreadSelection.badge}
        badgeLogo={spreadSelection.badgeLogo}
        title={spreadSelection.title}
        subject={
          awayActive
            ? `${spreadSelection.awayTeam} ${activeVariant.awayHandicap}`
            : `${spreadSelection.homeTeam} ${activeVariant.homeHandicap}`
        }
        onClose={onClose}
      />

      <div className="mt-4.5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setSpreadTeamSide('away')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            awayActive ? 'bg-emerald-500/85 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">
            {spreadSelection.awayShortLabel} {activeVariant.awayHandicap} {awayPrice}¢
          </div>
        </button>
        <button
          type="button"
          onClick={() => setSpreadTeamSide('home')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            !awayActive ? 'bg-emerald-500/85 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">
            {spreadSelection.homeShortLabel} {activeVariant.homeHandicap} {homePrice}¢
          </div>
        </button>
      </div>

      <AmountSection />
    </>
  )
}

function TotalContent({ onClose }: { onClose?: () => void }) {
  const { activeSelection, setTotalSide } = useOrderStore()
  const totalSelection = activeSelection?.template === 'total' ? activeSelection : null

  const activeLine =
    totalSelection?.lines.find((line) => line.id === totalSelection.activeLineId) ??
    totalSelection?.lines[0]
  const overPrice = useDisplayPrice(activeLine?.overAssetId, activeLine?.overPrice ?? 50)
  const underPrice = useDisplayPrice(activeLine?.underAssetId, activeLine?.underPrice ?? 50)

  if (!totalSelection || !activeLine) {
    return null
  }

  const overActive = totalSelection.activeSide === 'over'

  return (
    <>
      <PanelHeader
        badge={totalSelection.badge}
        badgeLogo={totalSelection.badgeLogo}
        title="Over vs Under"
        subject={overActive ? `Over ${activeLine.line}` : `Under ${activeLine.line}`}
        onClose={onClose}
      />

      <div className="mt-4.5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTotalSide('over')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            overActive ? 'bg-emerald-500/85 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">
            O {activeLine.line} {overPrice}¢
          </div>
        </button>
        <button
          type="button"
          onClick={() => setTotalSide('under')}
          className={[
            'flex min-h-[58px] items-center justify-center rounded-[15px] px-3 py-3 text-center shadow-[inset_0_-7px_0_rgba(0,0,0,0.12)] transition',
            !overActive ? 'bg-rose-500/90 text-white' : 'bg-white/4 text-ink-soft hover:text-ink',
          ].join(' ')}
        >
          <div className="text-[15px] font-semibold sm:text-[16px]">
            U {activeLine.line} {underPrice}¢
          </div>
        </button>
      </div>

      <AmountSection />
    </>
  )
}

export function OrderPanel({
  compact = false,
  onClose,
}: {
  compact?: boolean
  onClose?: () => void
}) {
  const { activeSelection } = useOrderStore()

  if (!activeSelection) {
    return (
      <aside className="rounded-[20px] border border-white/8 bg-panel/95 p-3 text-ink-soft shadow-[0_14px_32px_rgba(0,0,0,0.18)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand sm:text-[11px]">
          待选择
        </p>
        <h3 className="mt-2.5 text-[16px] font-semibold text-ink sm:text-[17px]">下单面板</h3>
        <p className="mt-1.5 text-[12px] leading-5">
          从比赛列表中选择胜负线、让分或总分盘口，右侧会按当前市场模板同步更新。
        </p>
      </aside>
    )
  }

  return (
    <PanelShell compact={compact}>
      {activeSelection.template === 'winner' ? (
        <WinnerContent onClose={onClose} />
      ) : activeSelection.template === 'spread' ? (
        <SpreadContent onClose={onClose} />
      ) : (
        <TotalContent onClose={onClose} />
      )}
    </PanelShell>
  )
}
