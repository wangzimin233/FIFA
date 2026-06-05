import { useAppKit } from '@reown/appkit/react'
import { toast } from '@heroui/react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '../config/i18n'
import { getWalletUserInfo } from '../features/wallet-auth/api'
import { useWalletAuthStore } from '../features/wallet-auth/auth-store'
import { useWalletAuth } from '../features/wallet-auth/use-wallet-auth'
import {
  getPolymarketOrdersPage,
  type PolymarketOrderPageItem,
} from '../features/home/api/polymarket-orders'
import { getWalletContractConfig } from '../features/wallet/deposit/api'
import { useDeposit } from '../features/wallet/deposit/use-deposit'
import {
  getDepositHistory,
  getWithdrawHistory,
  type DepositOrderPageItem,
  type WalletHistoryPage,
  type WithdrawOrderPageItem,
} from '../features/wallet/history/api'
import {
  getWalletRewardPage,
  getWalletUserDirectPage,
  getWalletUserUmbrellaPage,
  getWalletUserRelationStats,
  type WalletProfilePage,
  type WalletRewardBizType,
  type WalletRewardPageItem,
  type WalletUserDirectPageItem,
} from '../features/wallet/profile/api'
import { useWithdraw } from '../features/wallet/withdraw/use-withdraw'
import { shortenAddress, shortenHash } from '../lib/format'

const WALLET_HISTORY_PAGE_SIZE = 10
const ORDER_HISTORY_PAGE_SIZE = 10
const DIRECT_USER_PAGE_SIZE = 10
const REWARD_PAGE_SIZE = 10
const DIALOG_LIST_HEIGHT_CLASS = 'h-[min(30rem,calc(92vh-130px))]'
const DIALOG_TALL_LIST_HEIGHT_CLASS = 'h-[min(32rem,calc(92vh-73px))]'
const DIALOG_SEARCH_LIST_HEIGHT_CLASS = 'h-[min(26rem,calc(92vh-172px))]'

type ActiveAction = 'deposit' | 'withdraw' | null
type ActiveHistory = 'deposit' | 'withdraw' | null
type RelationUsersListKind = 'direct' | 'umbrella'
type DepositHistoryStatus = 1 | 2 | 3 | 4
type WithdrawHistoryStatus = 1 | 2 | 3 | 4 | 5 | 6 | 7

const DEPOSIT_HISTORY_STATUS_OPTIONS: Array<{
  labelKey: string
  value?: DepositHistoryStatus
}> = [
  { labelKey: 'profile.filters.all' },
  { labelKey: 'profile.status.submitted', value: 2 },
  { labelKey: 'profile.status.success', value: 3 },
  { labelKey: 'profile.status.failed', value: 4 },
]

const WITHDRAW_HISTORY_STATUS_OPTIONS: Array<{
  labelKey: string
  value?: WithdrawHistoryStatus
}> = [
  { labelKey: 'profile.filters.all' },
  { labelKey: 'profile.status.pendingReview', value: 1 },
  { labelKey: 'profile.status.pendingPayment', value: 2 },
  { labelKey: 'profile.status.processing', value: 3 },
  { labelKey: 'profile.status.success', value: 4 },
  { labelKey: 'profile.status.rejected', value: 5 },
  { labelKey: 'profile.status.failed', value: 6 },
  { labelKey: 'profile.status.canceled', value: 7 },
]

const REWARD_BIZ_TYPE_OPTIONS: Array<{
  labelKey: string
  value?: WalletRewardBizType
}> = [
  { labelKey: 'profile.filters.all' },
  { labelKey: 'profile.rewards.direct', value: 11 },
  { labelKey: 'profile.rewards.node', value: 12 },
]

function resolveDepositStatusMeta(status: ReturnType<typeof useDeposit>['status']) {
  const labelMap: Record<ReturnType<typeof useDeposit>['status'], string> = {
    idle: i18n.t('profile.deposit.status.idle'),
    switching_network: i18n.t('profile.deposit.status.switchingNetwork'),
    creating_order: i18n.t('profile.deposit.status.creatingOrder'),
    approving: i18n.t('profile.deposit.status.approving'),
    submitting: i18n.t('profile.deposit.status.submitting'),
    confirming: i18n.t('profile.deposit.status.confirming'),
    callback_pending: i18n.t('profile.deposit.status.callbackPending'),
    success: i18n.t('profile.deposit.status.success'),
    error: i18n.t('profile.status.flowError'),
  }

  const toneMap: Record<ReturnType<typeof useDeposit>['status'], string> = {
    idle: 'border-white/10 bg-white/[0.04] text-ink-soft',
    switching_network: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    creating_order: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    approving: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    submitting: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    confirming: 'border-brand/20 bg-brand/12 text-brand',
    callback_pending: 'border-brand/20 bg-brand/12 text-brand',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    error: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
  }

  return {
    label: labelMap[status],
    tone: toneMap[status],
  }
}

function resolveDepositButtonLabel({
  isConnected,
  isSessionReady,
  status,
}: {
  isConnected: boolean
  isSessionReady: boolean
  status: ReturnType<typeof useDeposit>['status']
}) {
  if (!isConnected) {
    return i18n.t('actions.connectWallet')
  }

  if (!isSessionReady) {
    return i18n.t('profile.auth.completeLogin')
  }

  switch (status) {
    case 'switching_network':
      return i18n.t('profile.deposit.buttons.switchingNetwork')
    case 'creating_order':
      return i18n.t('profile.deposit.buttons.creatingOrder')
    case 'approving':
      return i18n.t('profile.deposit.buttons.approving')
    case 'submitting':
      return i18n.t('profile.deposit.buttons.submitting')
    case 'confirming':
      return i18n.t('profile.deposit.buttons.confirming')
    case 'callback_pending':
      return i18n.t('profile.deposit.buttons.callbackPending')
    case 'success':
      return i18n.t('profile.deposit.buttons.continue')
    case 'error':
      return i18n.t('profile.deposit.buttons.retry')
    default:
      return i18n.t('profile.deposit.buttons.confirm')
  }
}

function resolveWithdrawStatusMeta(status: ReturnType<typeof useWithdraw>['status']) {
  const labelMap: Record<ReturnType<typeof useWithdraw>['status'], string> = {
    idle: i18n.t('profile.deposit.status.idle'),
    applying: i18n.t('profile.withdraw.status.applying'),
    success: i18n.t('profile.withdraw.status.success'),
    error: i18n.t('profile.status.flowError'),
  }

  const toneMap: Record<ReturnType<typeof useWithdraw>['status'], string> = {
    idle: 'border-white/10 bg-white/[0.04] text-ink-soft',
    applying: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
    success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    error: 'border-rose-500/20 bg-rose-500/10 text-rose-200',
  }

  return {
    label: labelMap[status],
    tone: toneMap[status],
  }
}

function resolveWithdrawButtonLabel({
  isConnected,
  isSessionReady,
  status,
}: {
  isConnected: boolean
  isSessionReady: boolean
  status: ReturnType<typeof useWithdraw>['status']
}) {
  if (!isConnected) {
    return i18n.t('actions.connectWallet')
  }

  if (!isSessionReady) {
    return i18n.t('profile.auth.completeLogin')
  }

  switch (status) {
    case 'applying':
      return i18n.t('profile.withdraw.buttons.applying')
    case 'success':
      return i18n.t('profile.withdraw.buttons.continue')
    case 'error':
      return i18n.t('profile.withdraw.buttons.retry')
    default:
      return i18n.t('profile.withdraw.buttons.confirm')
  }
}

function resolveDepositRecordStatus(status: number) {
  if (status === 3) {
    return { label: i18n.t('profile.status.success'), tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 4) {
    return { label: i18n.t('profile.status.failed'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 2) {
    return { label: i18n.t('profile.status.submitted'), tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 1) {
    return { label: i18n.t('profile.status.pendingPaymentOrder'), tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200' }
  }

  return { label: i18n.t('profile.status.withValue', { status }), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveWithdrawRecordStatus(status: number) {
  if (status === 4) {
    return { label: i18n.t('profile.status.success'), tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 7) {
    return { label: i18n.t('profile.status.canceled'), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  if (status === 6) {
    return { label: i18n.t('profile.status.failed'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 5) {
    return { label: i18n.t('profile.status.rejected'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 3) {
    return { label: i18n.t('profile.status.processing'), tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 2) {
    return { label: i18n.t('profile.status.pendingPayment'), tone: 'border-brand/20 bg-brand/12 text-brand' }
  }

  if (status === 1) {
    return { label: i18n.t('profile.status.pendingReview'), tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200' }
  }

  return { label: i18n.t('profile.status.withValue', { status }), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolvePolymarketOrderStatus(status?: number, errorMessage?: string) {
  if (errorMessage) {
    return { label: i18n.t('profile.status.abnormal'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === undefined || status === null) {
    return { label: '--', tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  if (status === 1) {
    return { label: i18n.t('profile.status.processing'), tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 2) {
    return { label: i18n.t('profile.status.completed'), tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 3) {
    return { label: i18n.t('profile.status.failed'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  return { label: i18n.t('profile.status.withValue', { status }), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveDirectUserType(userType: number) {
  if (userType === 2) {
    return { label: i18n.t('profile.userTypes.node'), tone: 'border-brand/20 bg-brand/12 text-brand' }
  }

  if (userType === 1) {
    return { label: i18n.t('profile.userTypes.normal'), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  return { label: i18n.t('profile.userTypes.withValue', { type: userType }), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveDirectUserStatus(status: number) {
  if (status === 1) {
    return { label: i18n.t('profile.status.normal'), tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 2) {
    return { label: i18n.t('profile.status.disabled'), tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  return { label: i18n.t('profile.status.withValue', { status }), tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveRewardBizType(bizType: number, bizTypeName?: string) {
  if (bizTypeName) {
    return bizTypeName
  }

  if (bizType === 11) {
    return i18n.t('profile.rewards.direct')
  }

  if (bizType === 12) {
    return i18n.t('profile.rewards.node')
  }

  return i18n.t('profile.userTypes.withValue', { type: bizType })
}

function formatMaybeDate(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(i18n.resolvedLanguage === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatAmount(value?: string, coinCode = 'USDT') {
  if (!value) {
    return '--'
  }

  return `${value} ${coinCode}`
}

function formatNumberValue(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '--'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
  }).format(value)
}

function formatIntegerValue(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '--'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercentValue(value?: number) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '--'
  }

  return `${formatNumberValue(value * 100)}%`
}

function formatOrderDisplayId(item: Pick<PolymarketOrderPageItem, 'orderNo' | 'polymarketOrderId' | 'id'>) {
  return item.orderNo || item.polymarketOrderId || String(item.id)
}

function getLocalizedOrderTitle(item: PolymarketOrderPageItem, key: 'event' | 'market' | 'outcome') {
  const isZh = i18n.resolvedLanguage?.startsWith('zh')

  if (key === 'event') {
    return (isZh ? item.eventTitleZh : item.eventTitle) || item.eventTitle || item.eventTitleZh || '--'
  }

  if (key === 'market') {
    return (isZh ? item.marketTitleZh : item.marketTitle) || item.marketTitle || item.marketTitleZh || '--'
  }

  return (isZh ? item.outcomeTitleZh : item.outcomeTitle) || item.outcomeTitle || item.outcomeTitleZh || '--'
}

function IconMark({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.04] text-[15px] text-brand">
      {children}
    </span>
  )
}

function useDebouncedValue<TValue>(value: TValue, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  return debouncedValue
}

function FieldLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.75rem_minmax(0,1fr)] items-center gap-3 border-b border-white/6 py-2.5 last:border-b-0">
      <span className="text-[12px] text-ink-soft">{label}</span>
      <span className="min-w-0 text-right text-[13px] font-medium text-ink">{value}</span>
    </div>
  )
}

function MetricCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-white/6 px-3 py-3 sm:border-r sm:last:border-r-0">
      <div className="text-[11px] text-ink-soft">{label}</div>
      <div className="mt-1 truncate text-[18px] font-semibold text-ink">{value}</div>
    </div>
  )
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function RelationMetricAction({
  label,
  onClick,
  value,
}: {
  label: string
  onClick: () => void
  value: ReactNode
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[5.25rem] min-w-0 items-center justify-between gap-3 border-white/6 px-3 py-3 text-left transition hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:border-r sm:last:border-r-0"
      aria-label={t('profile.relation.openList', { label })}
    >
      <span className="min-w-0">
        <span className="block text-[11px] text-ink-soft">{label}</span>
        <span className="mt-1 block truncate text-[18px] font-semibold text-ink">{value}</span>
      </span>
      <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-ink-soft transition group-hover:border-brand/25 group-hover:text-brand">
        <ArrowRightIcon className="size-4" />
      </span>
    </button>
  )
}

function DialogFrame({
  children,
  isOpen,
  maxWidthClass = 'max-w-xl',
  onClose,
}: {
  children: ReactNode
  isOpen: boolean
  maxWidthClass?: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] grid place-items-center bg-black/65 px-3 py-4 backdrop-blur-sm sm:px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose()
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className={`max-h-[92vh] w-full overflow-hidden rounded-[24px] border border-white/10 bg-[#171918] shadow-[0_20px_70px_rgba(0,0,0,0.48)] ${maxWidthClass}`}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function DialogHeader({
  eyebrow,
  title,
  status,
  onClose,
}: {
  eyebrow: string
  title: string
  status?: ReactNode
  onClose: () => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase text-brand">{eyebrow}</div>
        <h2 className="mt-1 text-[20px] font-semibold text-ink">{title}</h2>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {status}
        <button
          type="button"
          onClick={onClose}
          aria-label={t('actions.close')}
          className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-[18px] leading-none text-ink-soft transition hover:border-white/16 hover:text-ink"
        >
          ×
        </button>
      </div>
    </div>
  )
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 items-center justify-center rounded-[16px] border border-brand/20 bg-brand px-4 text-[14px] font-semibold text-black transition hover:bg-[#19ff53] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function SecondaryButton({
  children,
  disabled,
  onClick,
}: {
  children: ReactNode
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-ink-soft transition hover:border-white/16 hover:bg-white/[0.06] hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  )
}

function HistoryStatusFilter<TStatus extends number>({
  options,
  value,
  onChange,
}: {
  options: Array<{
    labelKey: string
    value?: TStatus
  }>
  value?: TStatus
  onChange: (value?: TStatus) => void
}) {
  const { t } = useTranslation()
  const gridClass = options.length > 5 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'

  return (
    <div className="border-b border-white/8 px-4 py-3 sm:px-5">
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const isActive = value === option.value

          return (
            <button
              key={option.labelKey}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                'inline-flex h-9 items-center justify-center rounded-[13px] border px-2 text-[12px] font-semibold transition',
                isActive
                  ? 'border-brand/25 bg-brand/12 text-brand'
                  : 'border-white/10 bg-white/[0.03] text-ink-soft hover:border-white/16 hover:text-ink',
              ].join(' ')}
            >
              {t(option.labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DepositActionDialog({
  amount,
  authStatus,
  deposit,
  isConnected,
  isContractConfigError,
  isContractConfigLoading,
  isOpen,
  isSessionReady,
  minAmount,
  onAmountChange,
  onClose,
  onConnect,
  onLogin,
  onSubmit,
}: {
  amount: string
  authStatus: ReturnType<typeof useWalletAuth>['status']
  deposit: ReturnType<typeof useDeposit>
  isConnected: boolean
  isContractConfigError: boolean
  isContractConfigLoading: boolean
  isOpen: boolean
  isSessionReady: boolean
  minAmount?: string
  onAmountChange: (value: string) => void
  onClose: () => void
  onConnect: () => void
  onLogin: () => void
  onSubmit: () => void
}) {
  const { t } = useTranslation()
  const statusMeta = resolveDepositStatusMeta(deposit.status)
  const buttonLabel = resolveDepositButtonLabel({
    isConnected,
    isSessionReady,
    status: deposit.status,
  })

  return (
    <DialogFrame isOpen={isOpen} onClose={onClose}>
      <DialogHeader
        eyebrow="Recharge"
        title={t('profile.deposit.title')}
        status={<span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>}
        onClose={onClose}
      />
      <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <FieldLine label={t('profile.fields.network')} value="BSC" />
          <FieldLine label={t('profile.fields.coin')} value="USDT" />
          <FieldLine label={t('profile.deposit.minDeposit')} value={minAmount ? `${minAmount} USDT` : '--'} />
        </div>

        {isContractConfigLoading ? (
          <p className="mt-4 text-[12px] text-ink-soft">{t('profile.fundsConfig.loading')}</p>
        ) : null}

        {isContractConfigError ? (
          <div className="mt-4 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200">
            {t('profile.fundsConfig.error')}
          </div>
        ) : null}

        {deposit.lastSuccessHash ? (
          <div className="mt-4 rounded-[16px] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-[12px] text-emerald-100">
            {t('profile.deposit.lastReceipt')}: {shortenHash(deposit.lastSuccessHash)}
          </div>
        ) : null}

        <label className="mt-5 block">
          <span className="block text-[12px] font-medium text-ink-soft">{t('profile.deposit.amount')}</span>
          <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              inputMode="decimal"
              placeholder={minAmount ? t('profile.form.minPlaceholder', { amount: minAmount }) : t('profile.form.amountPlaceholder')}
              className="h-14 w-full bg-transparent text-[19px] font-medium text-ink outline-none placeholder:text-ink-soft/45"
            />
            <span className="text-[12px] font-semibold uppercase text-ink-soft">USDT</span>
          </div>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => onAmountChange(minAmount ?? '')}>{t('profile.form.fillMin')}</SecondaryButton>
          <SecondaryButton onClick={() => onAmountChange('100')}>{t('profile.form.quickFill', { amount: 100 })}</SecondaryButton>
        </div>

        <div className="mt-4 grid gap-2.5">
          <PrimaryButton
            onClick={() => {
              if (!isConnected) {
                onConnect()
                return
              }

              if (!isSessionReady) {
                onLogin()
                return
              }

              onSubmit()
            }}
            disabled={authStatus === 'logging_in' || authStatus === 'signing' || deposit.isBusy || Boolean(deposit.providerWarning)}
          >
            {buttonLabel}
          </PrimaryButton>

          {deposit.hasPendingCallback ? (
            <SecondaryButton onClick={() => void deposit.retryCallback()}>{t('profile.deposit.retryCallback')}</SecondaryButton>
          ) : null}

          {deposit.providerWarning ? (
            <div className="rounded-[16px] border border-amber-400/25 bg-amber-400/10 px-3 py-3 text-[12px] text-amber-100">
              {deposit.providerWarning}
            </div>
          ) : null}

          {(deposit.error || deposit.status === 'error') && deposit.error ? (
            <div className="rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200">
              {deposit.error}
            </div>
          ) : null}
        </div>
      </div>
    </DialogFrame>
  )
}

function WithdrawActionDialog({
  amount,
  authStatus,
  availableBalance,
  feeLabel,
  isConnected,
  isOpen,
  isSessionReady,
  maxAmountLabel,
  minAmount,
  minAmountLabel,
  onAmountChange,
  onClose,
  onConnect,
  onLogin,
  onSubmit,
  withdraw,
}: {
  amount: string
  authStatus: ReturnType<typeof useWalletAuth>['status']
  availableBalance?: string
  feeLabel: string
  isConnected: boolean
  isOpen: boolean
  isSessionReady: boolean
  maxAmountLabel: string
  minAmount?: string
  minAmountLabel: string
  onAmountChange: (value: string) => void
  onClose: () => void
  onConnect: () => void
  onLogin: () => void
  onSubmit: () => void
  withdraw: ReturnType<typeof useWithdraw>
}) {
  const { t } = useTranslation()
  const statusMeta = resolveWithdrawStatusMeta(withdraw.status)
  const buttonLabel = resolveWithdrawButtonLabel({
    isConnected,
    isSessionReady,
    status: withdraw.status,
  })

  return (
    <DialogFrame isOpen={isOpen} onClose={onClose}>
      <DialogHeader
        eyebrow="Withdraw"
        title={t('profile.withdraw.title')}
        status={<span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>}
        onClose={onClose}
      />
      <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <FieldLine label={t('profile.fields.availableBalance')} value={availableBalance ? `${availableBalance} USDT` : '--'} />
          <FieldLine label={t('profile.fields.fee')} value={feeLabel} />
          <FieldLine label={t('profile.withdraw.minWithdraw')} value={minAmountLabel} />
          <FieldLine label={t('profile.withdraw.maxWithdraw')} value={maxAmountLabel} />
        </div>

        <label className="mt-5 block">
          <span className="block text-[12px] font-medium text-ink-soft">{t('profile.withdraw.amount')}</span>
          <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              inputMode="decimal"
              placeholder={minAmount ? t('profile.form.minPlaceholder', { amount: minAmount }) : t('profile.form.amountPlaceholder')}
              className="h-14 w-full bg-transparent text-[19px] font-medium text-ink outline-none placeholder:text-ink-soft/45"
            />
            <span className="text-[12px] font-semibold uppercase text-ink-soft">USDT</span>
          </div>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => onAmountChange(minAmount ?? '')}>{t('profile.form.fillMin')}</SecondaryButton>
          <SecondaryButton onClick={() => onAmountChange(availableBalance || '')}>{t('profile.form.fillAllAvailable')}</SecondaryButton>
        </div>

        <div className="mt-4 grid gap-2.5">
          <PrimaryButton
            onClick={() => {
              if (!isConnected) {
                onConnect()
                return
              }

              if (!isSessionReady) {
                onLogin()
                return
              }

              onSubmit()
            }}
            disabled={authStatus === 'logging_in' || authStatus === 'signing' || withdraw.isBusy}
          >
            {buttonLabel}
          </PrimaryButton>

          {(withdraw.error || withdraw.status === 'error') && withdraw.error ? (
            <div className="rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200">
              {withdraw.error}
            </div>
          ) : null}
        </div>
      </div>
    </DialogFrame>
  )
}

function DepositRecordRow({ item }: { item: DepositOrderPageItem }) {
  const { t } = useTranslation()
  const status = resolveDepositRecordStatus(item.status)

  return (
    <div className="border-b border-white/6 px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{item.orderNo}</div>
          <div className="mt-1 text-[12px] text-ink-soft">{formatMaybeDate(item.createTime)}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span>{t('profile.fields.amount')}: <b className="font-semibold text-ink">{formatAmount(item.amount, item.coinCode)}</b></span>
        <span>{t('profile.fields.network')}: <b className="font-semibold text-ink">{item.chainType}</b></span>
        <span>{t('profile.fields.txReceipt')}: <b className="font-semibold text-ink">{shortenHash(item.txHash)}</b></span>
      </div>
    </div>
  )
}

function WithdrawRecordRow({ item }: { item: WithdrawOrderPageItem }) {
  const { t } = useTranslation()
  const status = resolveWithdrawRecordStatus(item.status)

  return (
    <div className="border-b border-white/6 px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{item.withdrawNo}</div>
          <div className="mt-1 text-[12px] text-ink-soft">{formatMaybeDate(item.createTime)}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span>{t('profile.fields.apply')}: <b className="font-semibold text-ink">{formatAmount(item.applyAmount, item.coinCode)}</b></span>
        <span>{t('profile.fields.received')}: <b className="font-semibold text-ink">{formatAmount(item.actualAmount, item.coinCode)}</b></span>
        <span>{t('profile.fields.fee')}: <b className="font-semibold text-ink">{formatAmount(item.feeAmount, item.coinCode)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
        <span>{t('profile.fields.receiveAddress')}: <b className="font-semibold text-ink">{shortenAddress(item.toAddress)}</b></span>
        <span>{t('profile.fields.txReceipt')}: <b className="font-semibold text-ink">{shortenHash(item.txHash)}</b></span>
      </div>
      {item.rejectReason ? <div className="mt-2 text-[12px] text-rose-200">{t('profile.fields.rejectReason')}: {item.rejectReason}</div> : null}
    </div>
  )
}

function OrderRecordRow({ item }: { item: PolymarketOrderPageItem }) {
  const { t } = useTranslation()
  const status = resolvePolymarketOrderStatus(item.status, item.errorMessage)

  return (
    <div className="border-b border-white/6 px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{formatOrderDisplayId(item)}</div>
          <div className="mt-1 text-[12px] text-ink-soft">{formatMaybeDate(item.createTime)}</div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>
          {status.label}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span>{t('profile.fields.amount')}: <b className="font-semibold text-ink">{formatNumberValue(item.requestAmount)}</b></span>
        <span>{t('profile.fields.price')}: <b className="font-semibold text-ink">{formatNumberValue(item.price)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span className="min-w-0">{t('profile.fields.event')}: <b className="font-semibold text-ink">{getLocalizedOrderTitle(item, 'event')}</b></span>
        <span className="min-w-0">{t('profile.fields.market')}: <b className="font-semibold text-ink">{getLocalizedOrderTitle(item, 'market')}</b></span>
        <span className="min-w-0">{t('profile.fields.outcome')}: <b className="font-semibold text-ink">{getLocalizedOrderTitle(item, 'outcome')}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
        <span>{t('profile.fields.currentOdds')}: <b className="font-semibold text-ink">{formatNumberValue(item.currentOdds)}</b></span>
        <span>{t('profile.fields.estimatedReturn')}: <b className="font-semibold text-ink">{formatNumberValue(item.estimatedReturnAmount)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span>{t('profile.fields.side')}: <b className="font-semibold text-ink">{item.side || '--'}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft">
        <span>{t('profile.fields.commission')}: <b className="font-semibold text-ink">{formatNumberValue(item.commissionAmount)} / {formatPercentValue(item.commissionRate)}</b></span>
      </div>
      {item.updateTime ? (
        <div className="mt-2 text-[12px] text-ink-soft">
          {t('profile.fields.updatedAt')}: <b className="font-semibold text-ink">{formatMaybeDate(item.updateTime)}</b>
        </div>
      ) : null}
    </div>
  )
}

function DirectUserRow({ item }: { item: WalletUserDirectPageItem }) {
  const { t } = useTranslation()
  const userType = resolveDirectUserType(item.userType)
  const status = resolveDirectUserStatus(item.status)

  return (
    <div className="border-b border-white/6 px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{shortenAddress(item.walletAddress)}</div>
          {item.nickname ? <div className="mt-1 text-[12px] text-ink-soft">{item.nickname}</div> : null}
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${userType.tone}`}>{userType.label}</span>
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${status.tone}`}>{status.label}</span>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
        <span>{t('profile.fields.chain')}: <b className="font-semibold text-ink">{item.authType || '--'}</b></span>
        <span>{t('profile.fields.registeredAt')}: <b className="font-semibold text-ink">{formatMaybeDate(item.createTime)}</b></span>
      </div>
    </div>
  )
}

function RewardRecordRow({ item }: { item: WalletRewardPageItem }) {
  const { t } = useTranslation()

  return (
    <div className="border-b border-white/6 px-4 py-3 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-ink">{item.detailNo}</div>
          <div className="mt-1 text-[12px] text-ink-soft">{formatMaybeDate(item.createTime)}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[15px] font-semibold text-brand">+{formatAmount(item.changeAmount, item.coinCode)}</div>
          <div className="mt-1 text-[11px] text-ink-soft">{resolveRewardBizType(item.bizType, item.bizTypeName)}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft">
        <span>{t('profile.fields.coin')}: <b className="font-semibold text-ink">{item.coinCode || '--'}</b></span>
      </div>
    </div>
  )
}

function RelationRewardOverview({
  onOpenDirectUsers,
  onOpenUmbrellaUsers,
  onOpenRewards,
  relationError,
  relationLoading,
  relationStats,
}: {
  onOpenDirectUsers: () => void
  onOpenUmbrellaUsers: () => void
  onOpenRewards: () => void
  relationError?: unknown
  relationLoading: boolean
  relationStats?: {
    directCount?: number
    umbrellaCount?: number
  }
}) {
  const { t } = useTranslation()
  const relationHasError = Boolean(relationError)

  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase text-brand">Relation</div>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">{t('profile.relation.title')}</h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2">
          <RelationMetricAction
            label={t('profile.relation.directCount')}
            onClick={onOpenDirectUsers}
            value={relationLoading ? '...' : relationHasError ? '--' : formatIntegerValue(relationStats?.directCount)}
          />
          <RelationMetricAction
            label={t('profile.relation.umbrellaCount')}
            onClick={onOpenUmbrellaUsers}
            value={relationLoading ? '...' : relationHasError ? '--' : formatIntegerValue(relationStats?.umbrellaCount)}
          />
        </div>

        {relationHasError ? (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            {t('profile.relation.error')}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
        <div className="flex h-full flex-col justify-between gap-6 px-4 py-4 sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase text-brand">Rewards</div>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">{t('profile.rewards.title')}</h2>
            <p className="mt-3 text-[13px] leading-5 text-ink-soft">{t('profile.rewards.description')}</p>
          </div>
          <button
            type="button"
            onClick={onOpenRewards}
            className="inline-flex h-11 w-full items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] px-4 text-[13px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06]"
          >
            {t('profile.rewards.viewRecords')}
          </button>
        </div>
      </div>
    </section>
  )
}

function buildOrderPage(data: Awaited<ReturnType<typeof getPolymarketOrdersPage>> | null, fallbackPage: number) {
  const list = data?.data?.list ?? []
  const page = Number(data?.data?.page ?? fallbackPage)
  const pageSize = Number(data?.data?.pageSize ?? ORDER_HISTORY_PAGE_SIZE)
  const total = Number(data?.data?.total ?? list.length)

  return {
    list,
    total,
    page,
    pageSize,
    hasNext: page * pageSize < total,
  }
}

function OrderHistoryDialog({
  isOpen,
  isSessionReady,
  onClose,
}: {
  isOpen: boolean
  isSessionReady: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const orderQuery = useInfiniteQuery<
    ReturnType<typeof buildOrderPage>,
    Error
  >({
    queryKey: ['polymarket-orders', ORDER_HISTORY_PAGE_SIZE],
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam)
      const data = await getPolymarketOrdersPage({
        pageNum: page,
        pageSize: ORDER_HISTORY_PAGE_SIZE,
        orderByColumn: 'create_time',
        isAsc: 'desc',
      })

      return buildOrderPage(data, page)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: isOpen && isSessionReady,
  })

  const items = orderQuery.data?.pages.flatMap((page) => page.list) ?? []
  const total = orderQuery.data?.pages[0]?.total ?? 0

  return (
    <DialogFrame isOpen={isOpen} maxWidthClass="max-w-3xl" onClose={onClose}>
      <DialogHeader
        eyebrow="Order History"
        title={t('profile.orders.title')}
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">{t('profile.count.items', { count: total })}</span>}
        onClose={onClose}
      />
      <div
        className={`${DIALOG_TALL_LIST_HEIGHT_CLASS} overflow-y-auto`}
        onScroll={(event) => {
          const target = event.currentTarget
          const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 72
          if (isNearBottom && orderQuery.hasNextPage && !orderQuery.isFetchingNextPage) {
            void orderQuery.fetchNextPage()
          }
        }}
      >
        {!isSessionReady ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.orders.loginRequired')}</div>
        ) : orderQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : orderQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            {t('profile.orders.error')}
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.orders.empty')}</div>
        ) : (
          <div>
            {items.map((item) => (
              <OrderRecordRow
                key={`${item.id}-${item.orderNo ?? item.polymarketOrderId ?? 'order'}`}
                item={item}
              />
            ))}
          </div>
        )}

        {orderQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.loadingMore')}</div>
        ) : null}

        {!orderQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.endReached')}</div>
        ) : null}
      </div>
    </DialogFrame>
  )
}

function RelationUsersDialog({
  isOpen,
  isSessionReady,
  listKind,
  onClose,
  userId,
}: {
  isOpen: boolean
  isSessionReady: boolean
  listKind: RelationUsersListKind
  onClose: () => void
  userId?: number
}) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const isSearchSettling = search.trim() !== debouncedSearch
  const isUmbrellaList = listKind === 'umbrella'
  const listCopy = isUmbrellaList
      ? {
        eyebrow: 'Umbrella Users',
        title: t('profile.relation.umbrellaListTitle'),
        empty: t('profile.relation.umbrellaEmpty'),
        error: t('profile.relation.umbrellaError'),
        login: t('profile.relation.umbrellaLoginRequired'),
      }
    : {
        eyebrow: 'Direct Users',
        title: t('profile.relation.directListTitle'),
        empty: t('profile.relation.directEmpty'),
        error: t('profile.relation.directError'),
        login: t('profile.relation.directLoginRequired'),
      }

  const relationUsersQuery = useInfiniteQuery<WalletProfilePage<WalletUserDirectPageItem>, Error>({
    queryKey: ['wallet-user-relation-page', listKind, userId ?? null, debouncedSearch, DIRECT_USER_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      (isUmbrellaList ? getWalletUserUmbrellaPage : getWalletUserDirectPage)({
        userId: userId!,
        page: Number(pageParam),
        pageSize: DIRECT_USER_PAGE_SIZE,
        username: debouncedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: isOpen && isSessionReady && Boolean(userId),
  })

  const items = relationUsersQuery.data?.pages.flatMap((page) => page.list) ?? []
  const total = relationUsersQuery.data?.pages[0]?.total ?? 0

  return (
    <DialogFrame isOpen={isOpen} maxWidthClass="max-w-2xl" onClose={onClose}>
      <DialogHeader
        eyebrow={listCopy.eyebrow}
        title={listCopy.title}
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">{t('profile.count.people', { count: total })}</span>}
        onClose={onClose}
      />
      <div className="border-b border-white/8 px-4 py-3 sm:px-5">
        <label className="block">
          <span className="flex items-center justify-between gap-3 text-[12px] font-medium text-ink-soft">
            <span>{t('profile.relation.walletSearch')}</span>
            {isSearchSettling ? <span className="text-brand">{t('profile.relation.searchSettling')}</span> : null}
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('profile.relation.searchPlaceholder')}
            className="mt-2 h-11 w-full rounded-[15px] border border-white/10 bg-[#101211] px-3 text-[13px] text-ink outline-none placeholder:text-ink-soft/45 focus:border-brand/30"
          />
        </label>
      </div>
      <div
        className={`${DIALOG_SEARCH_LIST_HEIGHT_CLASS} overflow-y-auto`}
        onScroll={(event) => {
          const target = event.currentTarget
          const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 72
          if (isNearBottom && relationUsersQuery.hasNextPage && !relationUsersQuery.isFetchingNextPage) {
            void relationUsersQuery.fetchNextPage()
          }
        }}
      >
        {!isSessionReady ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{listCopy.login}</div>
        ) : !userId ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.account.unavailable')}</div>
        ) : relationUsersQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : relationUsersQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            {listCopy.error}
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{listCopy.empty}</div>
        ) : (
          <div>
            {items.map((item) => (
              <DirectUserRow key={`${item.userId}-${item.walletAddress}`} item={item} />
            ))}
          </div>
        )}

        {relationUsersQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.loadingMore')}</div>
        ) : null}

        {!relationUsersQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.endReached')}</div>
        ) : null}
      </div>
    </DialogFrame>
  )
}

function RewardRecordsDialog({
  isOpen,
  isSessionReady,
  onClose,
}: {
  isOpen: boolean
  isSessionReady: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [rewardType, setRewardType] = useState<WalletRewardBizType | undefined>()

  const rewardQuery = useInfiniteQuery<WalletProfilePage<WalletRewardPageItem>, Error>({
    queryKey: ['wallet-reward-page', rewardType ?? 'all', REWARD_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      getWalletRewardPage({
        page: Number(pageParam),
        pageSize: REWARD_PAGE_SIZE,
        bizTypes: rewardType ? [rewardType] : undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: isOpen && isSessionReady,
  })

  const items = rewardQuery.data?.pages.flatMap((page) => page.list) ?? []
  const total = rewardQuery.data?.pages[0]?.total ?? 0

  return (
    <DialogFrame isOpen={isOpen} maxWidthClass="max-w-2xl" onClose={onClose}>
      <DialogHeader
        eyebrow="Reward History"
        title={t('profile.rewards.title')}
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">{t('profile.count.items', { count: total })}</span>}
        onClose={onClose}
      />
      <HistoryStatusFilter<WalletRewardBizType> options={REWARD_BIZ_TYPE_OPTIONS} value={rewardType} onChange={setRewardType} />
      <div
        className={`${DIALOG_LIST_HEIGHT_CLASS} overflow-y-auto`}
        onScroll={(event) => {
          const target = event.currentTarget
          const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 72
          if (isNearBottom && rewardQuery.hasNextPage && !rewardQuery.isFetchingNextPage) {
            void rewardQuery.fetchNextPage()
          }
        }}
      >
        {!isSessionReady ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.rewards.loginRequired')}</div>
        ) : rewardQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : rewardQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            {t('profile.rewards.error')}
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.rewards.empty')}</div>
        ) : (
          <div>
            {items.map((item) => (
              <RewardRecordRow key={`${item.id}-${item.detailNo}`} item={item} />
            ))}
          </div>
        )}

        {rewardQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.loadingMore')}</div>
        ) : null}

        {!rewardQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.endReached')}</div>
        ) : null}
      </div>
    </DialogFrame>
  )
}

function WalletHistoryDialog({
  isOpen,
  isSessionReady,
  kind,
  onClose,
}: {
  isOpen: boolean
  isSessionReady: boolean
  kind: ActiveHistory
  onClose: () => void
}) {
  const { t } = useTranslation()
  type WalletRecordItem = DepositOrderPageItem | WithdrawOrderPageItem
  const [depositStatusFilter, setDepositStatusFilter] = useState<DepositHistoryStatus | undefined>()
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState<WithdrawHistoryStatus | undefined>()

  const historyQuery = useInfiniteQuery<WalletHistoryPage<WalletRecordItem>, Error>({
    queryKey: [
      'wallet-history',
      kind,
      'BSC',
      depositStatusFilter ?? 'all-deposit',
      withdrawStatusFilter ?? 'all-withdraw',
      WALLET_HISTORY_PAGE_SIZE,
    ],
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam)
      if (kind === 'deposit') {
        return (await getDepositHistory({
          page,
          pageSize: WALLET_HISTORY_PAGE_SIZE,
          chainType: 'BSC',
          status: depositStatusFilter,
        })) as WalletHistoryPage<WalletRecordItem>
      }

      return (await getWithdrawHistory({
        page,
        pageSize: WALLET_HISTORY_PAGE_SIZE,
        chainType: 'BSC',
        status: withdrawStatusFilter,
      })) as WalletHistoryPage<WalletRecordItem>
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled: isOpen && isSessionReady && kind !== null,
  })

  const items = historyQuery.data?.pages.flatMap((page) => page.list) ?? []
  const total = historyQuery.data?.pages[0]?.total ?? 0
  const title = kind === 'deposit' ? t('profile.deposit.historyTitle') : t('profile.withdraw.historyTitle')
  const eyebrow = kind === 'deposit' ? 'Deposit History' : 'Withdraw History'

  return (
    <DialogFrame isOpen={isOpen} maxWidthClass="max-w-2xl" onClose={onClose}>
      <DialogHeader
        eyebrow={eyebrow}
        title={title}
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">{t('profile.count.items', { count: total })}</span>}
        onClose={onClose}
      />
      {kind === 'deposit' ? (
        <HistoryStatusFilter
          options={DEPOSIT_HISTORY_STATUS_OPTIONS}
          value={depositStatusFilter}
          onChange={(value) => setDepositStatusFilter(value)}
        />
      ) : (
        <HistoryStatusFilter
          options={WITHDRAW_HISTORY_STATUS_OPTIONS}
          value={withdrawStatusFilter}
          onChange={(value) => setWithdrawStatusFilter(value)}
        />
      )}
      <div
        className={`${DIALOG_LIST_HEIGHT_CLASS} overflow-y-auto`}
        onScroll={(event) => {
          const target = event.currentTarget
          const isNearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 72
          if (isNearBottom && historyQuery.hasNextPage && !historyQuery.isFetchingNextPage) {
            void historyQuery.fetchNextPage()
          }
        }}
      >
        {!isSessionReady ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.history.loginRequired')}</div>
        ) : historyQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : historyQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            {t('profile.history.error')}
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">{t('profile.history.empty')}</div>
        ) : (
          <div>
            {kind === 'deposit'
              ? (items as DepositOrderPageItem[]).map((item) => <DepositRecordRow key={`${item.id}-${item.orderNo}`} item={item} />)
              : (items as WithdrawOrderPageItem[]).map((item) => <WithdrawRecordRow key={`${item.id}-${item.withdrawNo}`} item={item} />)}
          </div>
        )}

        {historyQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.loadingMore')}</div>
        ) : null}

        {!historyQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">{t('common.endReached')}</div>
        ) : null}
      </div>
    </DialogFrame>
  )
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { open } = useAppKit()
  const { address, isConnected, isSessionForConnectedWallet, startWalletAuth, status: authStatus } = useWalletAuth()
  const session = useWalletAuthStore((state) => state.session)
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [activeHistory, setActiveHistory] = useState<ActiveHistory>(null)
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false)
  const [activeRelationUsers, setActiveRelationUsers] = useState<RelationUsersListKind | null>(null)
  const [isRewardRecordsOpen, setIsRewardRecordsOpen] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isCopyingInviteLink, setIsCopyingInviteLink] = useState(false)

  const handleDepositSuccess = useCallback(() => {
    setDepositAmount('')
    setActiveAction(null)
  }, [])

  const handleWithdrawSuccess = useCallback(() => {
    setWithdrawAmount('')
    setActiveAction(null)
  }, [])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wallet-user-info', session?.token ?? null],
    queryFn: getWalletUserInfo,
    enabled: isSessionForConnectedWallet,
  })

  const {
    data: contractConfigResult,
    isLoading: isContractConfigLoading,
    isError: isContractConfigError,
  } = useQuery({
    queryKey: ['wallet-contract-config', 'BSC'],
    queryFn: () => getWalletContractConfig('BSC'),
    enabled: isSessionForConnectedWallet,
  })

  const walletUser = data?.data
  const contractConfig = contractConfigResult?.data ?? undefined
  const walletUserId = walletUser?.userId
  const primaryAsset =
    walletUser?.assets.find((asset) => asset.chainCode === 'BSC' && asset.coinCode.toUpperCase() === 'USDT') ??
    walletUser?.assets[0]

  const {
    data: relationStatsResult,
    isLoading: isRelationStatsLoading,
    isError: isRelationStatsError,
    error: relationStatsError,
  } = useQuery({
    queryKey: ['wallet-user-relation-stats', walletUserId ?? null, session?.token ?? null],
    queryFn: () => getWalletUserRelationStats(walletUserId!),
    enabled: isSessionForConnectedWallet && Boolean(walletUserId),
  })

  const deposit = useDeposit({
    contractConfig,
    isConnected,
    isSessionReady: isSessionForConnectedWallet,
    onSuccess: handleDepositSuccess,
    walletAddress: address,
    walletUser,
  })
  const withdraw = useWithdraw({
    contractConfig,
    isConnected,
    isSessionReady: isSessionForConnectedWallet,
    onSuccess: handleWithdrawSuccess,
    walletAddress: address,
    walletUser,
  })

  const connectionLabel = !isConnected
    ? t('profile.connection.disconnected')
    : isSessionForConnectedWallet
      ? t('profile.connection.loggedIn')
      : t('profile.connection.pendingLogin')
  const connectionTone = !isConnected
    ? 'border-white/10 bg-white/[0.04] text-ink-soft'
    : isSessionForConnectedWallet
      ? 'border-brand/20 bg-brand/12 text-brand'
      : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  const userTypeLabel = walletUser?.userType === 2 ? t('profile.userTypes.node') : walletUser?.userType === 1 ? t('profile.userTypes.normal') : '--'
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !walletUser?.inviteCode) {
      return ''
    }

    return `${window.location.protocol}//${window.location.host}/?code=${walletUser.inviteCode}`
  }, [walletUser?.inviteCode])
  const withdrawMinAmount = Number(contractConfig?.withdrawMinAmount ?? '')
  const withdrawMaxAmount = Number(contractConfig?.withdrawMaxAmount ?? '')
  const withdrawMinAmountLabel =
    Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0 ? `${contractConfig?.withdrawMinAmount} USDT` : t('profile.limits.unlimited')
  const withdrawMaxAmountLabel =
    Number.isFinite(withdrawMaxAmount) && withdrawMaxAmount > 0 ? `${contractConfig?.withdrawMaxAmount} USDT` : t('profile.limits.unlimited')
  const withdrawFeeLabel = contractConfig?.withdrawFeeValue
    ? contractConfig.withdrawFeeType === 2
      ? `${contractConfig.withdrawFeeValue}%`
      : `${contractConfig.withdrawFeeValue} USDT`
    : '--'

  const requireWalletReady = (next: () => void) => {
    if (!isConnected) {
      open()
      return
    }

    if (!isSessionForConnectedWallet) {
      void startWalletAuth()
      return
    }

    next()
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="grid gap-3 sm:gap-4"
      >
        <section className="rounded-[22px] border border-white/8 bg-panel/95 px-4 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.16)] sm:px-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <IconMark>◎</IconMark>
              <div className="min-w-0">
                <h1 className="text-[22px] font-semibold text-ink sm:text-[26px]">{t('profile.title')}</h1>
                <div className="mt-0.5 truncate text-[12px] text-ink-soft">
                  {walletUser?.walletAddress ? shortenAddress(walletUser.walletAddress) : address ? shortenAddress(address) : t('profile.walletHint')}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${connectionTone}`}>
                {t('profile.connection.walletStatus')}: {connectionLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                {t('profile.fields.network')}: BSC
              </span>
            </div>
          </div>
        </section>

        {!isConnected ? (
          <section className="rounded-[22px] border border-dashed border-white/10 bg-panel/95 px-4 py-8 text-center text-[13px] text-ink-soft">
            {t('profile.connection.disconnectedMessage')}
          </section>
        ) : !isSessionForConnectedWallet ? (
          <section className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-8 text-center text-[13px] text-amber-100">
            {t('profile.connection.pendingLoginMessage')}
          </section>
        ) : isLoading ? (
          <section className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
            <div className="h-72 rounded-[22px] border border-white/8 bg-panel/95 p-4">
              <div className="h-5 w-32 rounded-full bg-white/6" />
              <div className="mt-8 h-12 w-56 rounded-[16px] bg-white/6" />
              <div className="mt-8 grid gap-2 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 rounded-[16px] bg-white/6" />
                ))}
              </div>
            </div>
            <div className="h-72 rounded-[22px] border border-white/8 bg-panel/95 p-4">
              <div className="h-5 w-24 rounded-full bg-white/6" />
              <div className="mt-5 grid gap-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="h-8 rounded-full bg-white/6" />
                ))}
              </div>
            </div>
          </section>
        ) : isError ? (
          <section className="rounded-[22px] border border-rose-500/20 bg-rose-500/10 px-4 py-8 text-center text-[13px] text-rose-200">
            {t('profile.account.error')}
          </section>
        ) : walletUser ? (
          <>
            <section className="grid gap-3 lg:grid-cols-[minmax(0,1.24fr)_minmax(320px,0.76fr)]">
              <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
                <div className="border-b border-white/8 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase text-brand">Balance</div>
                      <div className="mt-1 text-[32px] font-semibold text-ink sm:text-[40px]">
                        {primaryAsset ? formatAmount(primaryAsset.availableBalance, primaryAsset.coinCode) : '--'}
                      </div>
                      <div className="mt-1 text-[12px] text-ink-soft">{t('profile.balance.availableBscUsdt')}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-[16rem]">
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveAction('deposit'))}
                        className="inline-flex h-11 items-center justify-center rounded-[15px] border border-brand/20 bg-brand px-3 text-[13px] font-semibold text-black transition hover:bg-[#19ff53]"
                      >
                        {t('profile.deposit.action')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveAction('withdraw'))}
                        className="inline-flex h-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06]"
                      >
                        {t('profile.withdraw.action')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveHistory('deposit'))}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.03] px-3 text-[12px] font-semibold text-ink-soft transition hover:border-white/16 hover:text-ink"
                      >
                        {t('profile.deposit.historyTitle')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveHistory('withdraw'))}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.03] px-3 text-[12px] font-semibold text-ink-soft transition hover:border-white/16 hover:text-ink"
                      >
                        {t('profile.withdraw.historyTitle')}
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setIsOrderHistoryOpen(true))}
                        className="col-span-2 inline-flex h-10 items-center justify-center rounded-[14px] border border-sky-400/20 bg-sky-400/10 px-3 text-[12px] font-semibold text-sky-100 transition hover:border-sky-300/30 hover:bg-sky-400/14"
                      >
                        {t('profile.orders.title')}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid border-b border-white/8 sm:grid-cols-5">
                  <MetricCell label={t('profile.balance.total')} value={primaryAsset?.totalBalance ?? '--'} />
                  <MetricCell label={t('profile.balance.frozen')} value={primaryAsset?.frozenBalance ?? '--'} />
                  <MetricCell label={t('profile.balance.totalDeposit')} value={primaryAsset?.rechargeTotal ?? '--'} />
                  <MetricCell label={t('profile.balance.totalWithdraw')} value={primaryAsset?.withdrawTotal ?? '--'} />
                  <MetricCell label={t('profile.fields.coin')} value={primaryAsset ? `${primaryAsset.chainCode}-${primaryAsset.coinCode}` : '--'} />
                </div>

                <div className="grid gap-0 sm:grid-cols-2">
                  <div className="border-b border-white/8 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                    <div className="text-[11px] font-semibold uppercase text-ink-soft">{t('profile.deposit.rules')}</div>
                    <div className="mt-2 grid gap-0">
                      <FieldLine label={t('profile.fields.minAmount')} value={contractConfig?.rechargeMinAmount ? `${contractConfig.rechargeMinAmount} USDT` : '--'} />
                      <FieldLine label={t('profile.fields.network')} value={contractConfig?.chainType ?? 'BSC'} />
                    </div>
                  </div>
                  <div className="px-4 py-4 sm:px-5">
                    <div className="text-[11px] font-semibold uppercase text-ink-soft">{t('profile.withdraw.rules')}</div>
                    <div className="mt-2 grid gap-0">
                      <FieldLine label={t('profile.fields.limit')} value={`${withdrawMinAmountLabel} / ${withdrawMaxAmountLabel}`} />
                      <FieldLine label={t('profile.fields.fee')} value={withdrawFeeLabel} />
                      <FieldLine label={t('profile.fields.availableBalance')} value={withdraw.availableBalance ? `${withdraw.availableBalance} USDT` : '--'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
                <div className="border-b border-white/8 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-brand">Identity</div>
                      <h2 className="mt-1 text-[20px] font-semibold text-ink">{t('profile.identity.title')}</h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                      {userTypeLabel}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 sm:px-5">
                  <FieldLine label={t('profile.fields.walletAddress')} value={shortenAddress(walletUser.walletAddress)} />
                  <FieldLine label={t('profile.fields.inviteCode')} value={walletUser.inviteCode || '--'} />
                  <FieldLine label={t('profile.fields.authType')} value={walletUser.authType || '--'} />
                </div>

                <div className="border-t border-white/8 px-4 py-4 sm:px-5">
                  <div className="text-[11px] font-semibold uppercase text-ink-soft">Invite Link</div>
                  <div className="mt-2 min-h-10 break-all rounded-[14px] border border-white/8 bg-black/10 px-3 py-2 text-[12px] leading-5 text-ink-soft">
                    {inviteLink || '--'}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!inviteLink) {
                        toast(t('profile.invite.noLink'))
                        return
                      }

                      try {
                        setIsCopyingInviteLink(true)
                        await navigator.clipboard.writeText(inviteLink)
                        toast.success(t('profile.invite.copied'))
                      } catch {
                        toast(t('profile.invite.copyFailed'))
                      } finally {
                        setIsCopyingInviteLink(false)
                      }
                    }}
                    disabled={isCopyingInviteLink}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[12px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCopyingInviteLink ? t('profile.invite.copying') : t('profile.invite.copy')}
                  </button>
                </div>

                {isContractConfigError ? (
                  <div className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200 sm:px-5">
                    {t('profile.fundsConfig.error')}
                  </div>
                ) : isContractConfigLoading ? (
                  <div className="border-t border-white/8 px-4 py-3 text-[12px] text-ink-soft sm:px-5">{t('profile.fundsConfig.loading')}</div>
                ) : null}
              </div>
            </section>

            <RelationRewardOverview
              onOpenDirectUsers={() => requireWalletReady(() => setActiveRelationUsers('direct'))}
              onOpenUmbrellaUsers={() => requireWalletReady(() => setActiveRelationUsers('umbrella'))}
              onOpenRewards={() => requireWalletReady(() => setIsRewardRecordsOpen(true))}
              relationError={isRelationStatsError ? relationStatsError : undefined}
              relationLoading={isRelationStatsLoading}
              relationStats={relationStatsResult?.data ?? undefined}
            />
          </>
        ) : null}
      </motion.section>

      <DepositActionDialog
        amount={depositAmount}
        authStatus={authStatus}
        deposit={deposit}
        isConnected={isConnected}
        isContractConfigError={isContractConfigError}
        isContractConfigLoading={isContractConfigLoading}
        isOpen={activeAction === 'deposit'}
        isSessionReady={isSessionForConnectedWallet}
        minAmount={contractConfig?.rechargeMinAmount}
        onAmountChange={setDepositAmount}
        onClose={() => setActiveAction(null)}
        onConnect={open}
        onLogin={() => void startWalletAuth()}
        onSubmit={() => void deposit.submitDeposit(depositAmount)}
      />

      <WithdrawActionDialog
        amount={withdrawAmount}
        authStatus={authStatus}
        availableBalance={withdraw.availableBalance}
        feeLabel={withdrawFeeLabel}
        isConnected={isConnected}
        isOpen={activeAction === 'withdraw'}
        isSessionReady={isSessionForConnectedWallet}
        maxAmountLabel={withdrawMaxAmountLabel}
        minAmount={Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0 ? contractConfig?.withdrawMinAmount : undefined}
        minAmountLabel={withdrawMinAmountLabel}
        onAmountChange={setWithdrawAmount}
        onClose={() => setActiveAction(null)}
        onConnect={open}
        onLogin={() => void startWalletAuth()}
        onSubmit={() => void withdraw.submitWithdraw(withdrawAmount)}
        withdraw={withdraw}
      />

      <WalletHistoryDialog
        isOpen={activeHistory !== null}
        isSessionReady={isSessionForConnectedWallet}
        kind={activeHistory}
        onClose={() => setActiveHistory(null)}
      />

      <OrderHistoryDialog
        isOpen={isOrderHistoryOpen}
        isSessionReady={isSessionForConnectedWallet}
        onClose={() => setIsOrderHistoryOpen(false)}
      />

      <RelationUsersDialog
        isOpen={activeRelationUsers !== null}
        isSessionReady={isSessionForConnectedWallet}
        listKind={activeRelationUsers ?? 'direct'}
        onClose={() => setActiveRelationUsers(null)}
        userId={walletUserId}
      />

      <RewardRecordsDialog
        isOpen={isRewardRecordsOpen}
        isSessionReady={isSessionForConnectedWallet}
        onClose={() => setIsRewardRecordsOpen(false)}
      />
    </>
  )
}
