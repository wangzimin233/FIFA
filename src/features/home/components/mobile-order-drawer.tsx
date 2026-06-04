import { Button } from '@heroui/react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo } from 'react'
import { useActiveSelectionPrice } from '../../market-realtime/price-utils'
import { TeamMark } from './team-mark'
import { type MarketSelection, useOrderStore } from '../order-store'
import { MIN_POLYMARKET_ORDER_AMOUNT, useSubmitPolymarketOrder } from '../use-submit-polymarket-order'

const quickAmounts = [2, 5, 10, 100]

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`
}

function formatCents(value: number) {
  return Number.isInteger(value) ? `${value}¢` : `${value.toFixed(1)}¢`
}

function getMobilePriceTone(selection: MarketSelection) {
  if (selection.template === 'winner') {
    return selection.activeSide === 'yes' ? 'text-brand' : 'text-rose-400'
  }

  if (selection.template === 'total') {
    return selection.activeSide === 'over' ? 'text-brand' : 'text-rose-400'
  }

  return 'text-brand'
}

function getMobileTitle(selection: MarketSelection) {
  return selection.template === 'total' ? 'Over vs Under' : selection.title
}

function getMobileSubject(selection: MarketSelection) {
  if (selection.template === 'winner') {
    return (
      <>
        <span className="text-ink">{selection.subject}</span>
        <span className="mx-2 text-ink-soft">•</span>
        <span className={getMobilePriceTone(selection)}>
          {selection.activeSide === 'yes' ? 'Yes' : 'No'}
        </span>
      </>
    )
  }

  if (selection.template === 'spread') {
    const activeVariant =
      selection.variants.find((variant) => variant.id === selection.activeVariantId) ??
      selection.variants[0]
    const label =
      selection.activeTeamSide === 'away'
        ? `${selection.awayTeam} ${activeVariant.awayHandicap}`
        : `${selection.homeTeam} ${activeVariant.homeHandicap}`

    return <span className="text-brand">{label}</span>
  }

  const activeLine = selection.lines.find((line) => line.id === selection.activeLineId) ?? selection.lines[0]

  return (
    <>
      <span className="text-ink">{selection.activeSide === 'over' ? 'Over' : 'Under'}</span>
      <span className="mx-2 text-ink-soft">•</span>
      <span className={getMobilePriceTone(selection)}>{activeLine.line}</span>
    </>
  )
}

function MobileSelectionBadge({ value, logo }: { value: string; logo?: string }) {
  if (!value && !logo) {
    return null
  }

  return (
    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-white/8 text-[18px] font-semibold text-ink">
      <TeamMark
        alt={value}
        emoji={value}
        logo={logo}
        className="h-9 w-9 rounded-[10px] object-cover"
        fallbackClassName="text-[18px]"
      />
    </div>
  )
}

function MobileHeader() {
  const { activeSelection } = useOrderStore()

  if (!activeSelection) {
    return null
  }

  return (
    <>
      <div className="mx-auto h-1.5 w-24 rounded-full bg-white/8" />
      <div className="mt-7 flex items-start gap-3.5">
        <MobileSelectionBadge
          value={activeSelection.badge}
          logo={'badgeLogo' in activeSelection ? activeSelection.badgeLogo : undefined}
        />
        <div className="min-w-0">
          <h3 className="text-[18px] font-medium leading-tight text-ink-soft">
            {getMobileTitle(activeSelection)}
          </h3>
          <div className="mt-1.5 text-[20px] font-semibold leading-tight">
            {getMobileSubject(activeSelection)}
          </div>
        </div>
      </div>
    </>
  )
}

function MobileAmountDisplay() {
  const { amount, setAmount } = useOrderStore()
  const amountDisplay = useMemo(() => `$${amount}`, [amount])

  return (
    <label className="relative mt-10 block">
      <div className="pointer-events-none text-center text-[84px] font-semibold leading-none tracking-[-0.05em] text-ink">
        {amountDisplay}
      </div>
      <input
        value={amount === 0 ? '' : amount}
        onChange={(event) => setAmount(Number(event.target.value))}
        inputMode="decimal"
        placeholder="0"
        aria-label="输入金额"
        className="absolute inset-0 h-full w-full border-none bg-transparent text-center text-[84px] font-semibold text-transparent caret-white outline-none placeholder:text-transparent"
      />
    </label>
  )
}

function MobileWinnerSegment() {
  const { activeSelection, setWinnerSide } = useOrderStore()

  if (!activeSelection || activeSelection.template !== 'winner') {
    return null
  }

  const yesActive = activeSelection.activeSide === 'yes'

  return (
    <div className="mt-8 flex justify-center">
      <div className="inline-flex rounded-full bg-white/4 p-0.75">
        <button
          type="button"
          onClick={() => setWinnerSide('yes')}
          className={[
            'min-w-[96px] rounded-full px-6 py-2.5 text-[15px] font-semibold transition',
            yesActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setWinnerSide('no')}
          className={[
            'min-w-[96px] rounded-full px-6 py-2.5 text-[15px] font-semibold transition',
            !yesActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          No
        </button>
      </div>
    </div>
  )
}

function MobileSpreadSegment() {
  const { activeSelection, setSpreadTeamSide } = useOrderStore()

  if (!activeSelection || activeSelection.template !== 'spread') {
    return null
  }

  const activeVariant =
    activeSelection.variants.find((variant) => variant.id === activeSelection.activeVariantId) ??
    activeSelection.variants[0]
  const awayActive = activeSelection.activeTeamSide === 'away'

  return (
    <div className="mt-8 flex justify-center">
      <div className="inline-flex max-w-full rounded-full bg-white/4 p-1">
        <button
          type="button"
          onClick={() => setSpreadTeamSide('away')}
          className={[
            'rounded-full px-5 py-3 text-[15px] font-semibold transition',
            awayActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          {activeSelection.awayShortLabel} {activeVariant.awayHandicap}
        </button>
        <button
          type="button"
          onClick={() => setSpreadTeamSide('home')}
          className={[
            'rounded-full px-5 py-3 text-[15px] font-semibold transition',
            !awayActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          {activeSelection.homeShortLabel} {activeVariant.homeHandicap}
        </button>
      </div>
    </div>
  )
}

function MobileTotalSegment() {
  const { activeSelection, setTotalSide } = useOrderStore()

  if (!activeSelection || activeSelection.template !== 'total') {
    return null
  }

  const activeLine = activeSelection.lines.find((line) => line.id === activeSelection.activeLineId) ?? activeSelection.lines[0]
  const overActive = activeSelection.activeSide === 'over'

  return (
    <div className="mt-8 flex justify-center">
      <div className="inline-flex rounded-full bg-white/4 p-1">
        <button
          type="button"
          onClick={() => setTotalSide('over')}
          className={[
            'min-w-[120px] rounded-full px-7 py-3 text-[16px] font-semibold transition',
            overActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          O {activeLine.line}
        </button>
        <button
          type="button"
          onClick={() => setTotalSide('under')}
          className={[
            'min-w-[120px] rounded-full px-7 py-3 text-[16px] font-semibold transition',
            !overActive ? 'bg-white/10 text-ink' : 'text-ink-soft',
          ].join(' ')}
        >
          U {activeLine.line}
        </button>
      </div>
    </div>
  )
}

function MobileComputedResult() {
  const { activeSelection, amount } = useOrderStore()
  const activePrice = useActiveSelectionPrice(activeSelection)

  if (!activeSelection || amount <= 0 || activePrice === null) {
    return null
  }

  const potentialReturn = activePrice > 0 ? amount / (activePrice / 100) : 0

  return (
    <div className="mt-9 text-center">
      <div className="text-[18px] font-semibold">
        <span className="text-ink">赢取 </span>
        <span className={getMobilePriceTone(activeSelection)}>{formatCurrency(potentialReturn)}</span>
      </div>
      <div className="mt-2 text-[14px] font-medium text-ink-soft">{formatCents(activePrice)}</div>
    </div>
  )
}

function MobileQuickAmounts() {
  const { addAmount } = useOrderStore()

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-2">
      {quickAmounts.map((quickAmount) => (
        <button
          key={quickAmount}
          type="button"
          onClick={() => addAmount(quickAmount)}
          className="rounded-[13px] border border-white/8 bg-white/4 px-4 py-2.5 text-[14px] font-semibold text-ink-soft transition hover:border-brand/25 hover:text-ink"
        >
          +${quickAmount}
        </button>
      ))}
    </div>
  )
}

function MobileDrawerContent() {
  const { activeSelection } = useOrderStore()
  const { canSubmit, isSubmitting, slippageConfirmed, submitOrder } = useSubmitPolymarketOrder()

  if (!activeSelection) {
    return null
  }

  return (
    <div className="rounded-t-[28px] border border-white/8 bg-panel px-5 pb-5 pt-4 shadow-[0_-18px_38px_rgba(0,0,0,0.28)]">
      <MobileHeader />
      <MobileAmountDisplay />
      {activeSelection.template === 'winner' ? (
        <MobileWinnerSegment />
      ) : activeSelection.template === 'spread' ? (
        <MobileSpreadSegment />
      ) : (
        <MobileTotalSegment />
      )}
      <MobileComputedResult />
      <div className="mt-4 text-center text-[13px] font-medium text-ink-soft">
        最低下单金额 ${MIN_POLYMARKET_ORDER_AMOUNT}
      </div>
      <MobileQuickAmounts />
      <Button
        isDisabled={!canSubmit}
        onPress={submitOrder}
        className="mt-8 h-16 w-full rounded-[18px] bg-sky-500 text-[18px] font-semibold text-white shadow-[inset_0_-8px_0_rgba(0,0,0,0.14)] disabled:opacity-60"
      >
        {isSubmitting ? '提交中...' : slippageConfirmed ? '确认滑点并交易' : '交易'}
      </Button>
    </div>
  )
}

export function MobileOrderDrawer() {
  const { activeSelection, isPanelOpen, closePanel } = useOrderStore()

  return (
    <AnimatePresence>
      {activeSelection && isPanelOpen ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭下单抽屉"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePanel}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          />
          <motion.div
            initial={{ y: 56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 56, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl px-2 pb-0 lg:hidden"
          >
            <MobileDrawerContent />
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
