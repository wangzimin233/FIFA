import { useAppKit } from '@reown/appkit/react'
import { toast } from '@heroui/react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
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
  label: string
  value?: DepositHistoryStatus
}> = [
  { label: '全部' },
  { label: '已提交', value: 2 },
  { label: '成功', value: 3 },
  { label: '失败', value: 4 },
]

const WITHDRAW_HISTORY_STATUS_OPTIONS: Array<{
  label: string
  value?: WithdrawHistoryStatus
}> = [
  { label: '全部' },
  { label: '待审核', value: 1 },
  { label: '待打款', value: 2 },
  { label: '处理中', value: 3 },
  { label: '成功', value: 4 },
  { label: '驳回', value: 5 },
  { label: '失败', value: 6 },
  { label: '已取消', value: 7 },
]

const REWARD_BIZ_TYPE_OPTIONS: Array<{
  label: string
  value?: WalletRewardBizType
}> = [
  { label: '全部' },
  { label: '直推奖励', value: 11 },
  { label: '节点奖励', value: 12 },
]

function resolveDepositStatusMeta(status: ReturnType<typeof useDeposit>['status']) {
  const labelMap: Record<ReturnType<typeof useDeposit>['status'], string> = {
    idle: '待开始',
    switching_network: '切换网络',
    creating_order: '创建订单',
    approving: '代币授权',
    submitting: '提交充值',
    confirming: '等待确认',
    callback_pending: '通知后端',
    success: '充值成功',
    error: '流程异常',
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
    return '连接钱包'
  }

  if (!isSessionReady) {
    return '完成钱包登录'
  }

  switch (status) {
    case 'switching_network':
      return '切换到 BSC 中...'
    case 'creating_order':
      return '创建订单中...'
    case 'approving':
      return '授权 USDT 中...'
    case 'submitting':
      return '提交充值中...'
    case 'confirming':
      return '链上确认中...'
    case 'callback_pending':
      return '回调处理中...'
    case 'success':
      return '继续充值'
    case 'error':
      return '重新发起充值'
    default:
      return '确认充值'
  }
}

function resolveWithdrawStatusMeta(status: ReturnType<typeof useWithdraw>['status']) {
  const labelMap: Record<ReturnType<typeof useWithdraw>['status'], string> = {
    idle: '待开始',
    applying: '申请提现',
    success: '等待审核',
    error: '流程异常',
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
    return '连接钱包'
  }

  if (!isSessionReady) {
    return '完成钱包登录'
  }

  switch (status) {
    case 'applying':
      return '申请提现中...'
    case 'success':
      return '继续提现'
    case 'error':
      return '重新发起提现'
    default:
      return '确认提现'
  }
}

function resolveDepositRecordStatus(status: number) {
  if (status === 3) {
    return { label: '成功', tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 4) {
    return { label: '失败', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 2) {
    return { label: '已提交', tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 1) {
    return { label: '待支付', tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200' }
  }

  return { label: `状态 ${status}`, tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveWithdrawRecordStatus(status: number) {
  if (status === 4) {
    return { label: '成功', tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 7) {
    return { label: '已取消', tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  if (status === 6) {
    return { label: '失败', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 5) {
    return { label: '驳回', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === 3) {
    return { label: '处理中', tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 2) {
    return { label: '待打款', tone: 'border-brand/20 bg-brand/12 text-brand' }
  }

  if (status === 1) {
    return { label: '待审核', tone: 'border-amber-400/20 bg-amber-400/10 text-amber-200' }
  }

  return { label: `状态 ${status}`, tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolvePolymarketOrderStatus(status?: number, errorMessage?: string) {
  if (errorMessage) {
    return { label: '异常', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  if (status === undefined || status === null) {
    return { label: '--', tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  if (status === 1) {
    return { label: '处理中', tone: 'border-sky-400/20 bg-sky-400/10 text-sky-200' }
  }

  if (status === 2) {
    return { label: '已完成', tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 3) {
    return { label: '失败', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  return { label: `状态 ${status}`, tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveDirectUserType(userType: number) {
  if (userType === 2) {
    return { label: '节点用户', tone: 'border-brand/20 bg-brand/12 text-brand' }
  }

  if (userType === 1) {
    return { label: '普通用户', tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
  }

  return { label: `类型 ${userType}`, tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveDirectUserStatus(status: number) {
  if (status === 1) {
    return { label: '正常', tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' }
  }

  if (status === 2) {
    return { label: '禁用', tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' }
  }

  return { label: `状态 ${status}`, tone: 'border-white/10 bg-white/[0.04] text-ink-soft' }
}

function resolveRewardBizType(bizType: number, bizTypeName?: string) {
  if (bizTypeName) {
    return bizTypeName
  }

  if (bizType === 11) {
    return '直推奖励'
  }

  if (bizType === 12) {
    return '节点奖励'
  }

  return `类型 ${bizType}`
}

function formatMaybeDate(value?: string) {
  if (!value) {
    return '--'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[5.25rem] min-w-0 items-center justify-between gap-3 border-white/6 px-3 py-3 text-left transition hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:border-r sm:last:border-r-0"
      aria-label={`打开${label}列表`}
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
          aria-label="关闭"
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
    label: string
    value?: TStatus
  }>
  value?: TStatus
  onChange: (value?: TStatus) => void
}) {
  const gridClass = options.length > 5 ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5'

  return (
    <div className="border-b border-white/8 px-4 py-3 sm:px-5">
      <div className={`grid gap-2 ${gridClass}`}>
        {options.map((option) => {
          const isActive = value === option.value

          return (
            <button
              key={option.label}
              type="button"
              onClick={() => onChange(option.value)}
              className={[
                'inline-flex h-9 items-center justify-center rounded-[13px] border px-2 text-[12px] font-semibold transition',
                isActive
                  ? 'border-brand/25 bg-brand/12 text-brand'
                  : 'border-white/10 bg-white/[0.03] text-ink-soft hover:border-white/16 hover:text-ink',
              ].join(' ')}
            >
              {option.label}
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
        title="BSC USDT 充值"
        status={<span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>}
        onClose={onClose}
      />
      <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <FieldLine label="网络" value="BSC" />
          <FieldLine label="币种" value="USDT" />
          <FieldLine label="最小充值" value={minAmount ? `${minAmount} USDT` : '--'} />
        </div>

        {isContractConfigLoading ? (
          <p className="mt-4 text-[12px] text-ink-soft">正在加载资金配置...</p>
        ) : null}

        {isContractConfigError ? (
          <div className="mt-4 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200">
            资金配置加载失败，请稍后重试。
          </div>
        ) : null}

        {deposit.lastSuccessHash ? (
          <div className="mt-4 rounded-[16px] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-[12px] text-emerald-100">
            最近一次充值凭证: {shortenHash(deposit.lastSuccessHash)}
          </div>
        ) : null}

        <label className="mt-5 block">
          <span className="block text-[12px] font-medium text-ink-soft">充值金额</span>
          <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              inputMode="decimal"
              placeholder={minAmount ? `最少 ${minAmount}` : '请输入 USDT 数量'}
              className="h-14 w-full bg-transparent text-[19px] font-medium text-ink outline-none placeholder:text-ink-soft/45"
            />
            <span className="text-[12px] font-semibold uppercase text-ink-soft">USDT</span>
          </div>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => onAmountChange(minAmount ?? '')}>填入最小金额</SecondaryButton>
          <SecondaryButton onClick={() => onAmountChange('100')}>快速填入 100</SecondaryButton>
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
            <SecondaryButton onClick={() => void deposit.retryCallback()}>重新通知后端入账</SecondaryButton>
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
        title="BSC USDT 提现"
        status={<span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${statusMeta.tone}`}>{statusMeta.label}</span>}
        onClose={onClose}
      />
      <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-4 py-4 sm:px-5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <FieldLine label="可用余额" value={availableBalance ? `${availableBalance} USDT` : '--'} />
          <FieldLine label="手续费" value={feeLabel} />
          <FieldLine label="最小提现" value={minAmountLabel} />
          <FieldLine label="最大提现" value={maxAmountLabel} />
        </div>

        <label className="mt-5 block">
          <span className="block text-[12px] font-medium text-ink-soft">提现金额</span>
          <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
            <input
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              inputMode="decimal"
              placeholder={minAmount ? `最少 ${minAmount}` : '请输入 USDT 数量'}
              className="h-14 w-full bg-transparent text-[19px] font-medium text-ink outline-none placeholder:text-ink-soft/45"
            />
            <span className="text-[12px] font-semibold uppercase text-ink-soft">USDT</span>
          </div>
        </label>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <SecondaryButton onClick={() => onAmountChange(minAmount ?? '')}>填入最小金额</SecondaryButton>
          <SecondaryButton onClick={() => onAmountChange(availableBalance || '')}>填入全部可用</SecondaryButton>
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
        <span>金额: <b className="font-semibold text-ink">{formatAmount(item.amount, item.coinCode)}</b></span>
        <span>网络: <b className="font-semibold text-ink">{item.chainType}</b></span>
        <span>交易凭证: <b className="font-semibold text-ink">{shortenHash(item.txHash)}</b></span>
      </div>
    </div>
  )
}

function WithdrawRecordRow({ item }: { item: WithdrawOrderPageItem }) {
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
        <span>申请: <b className="font-semibold text-ink">{formatAmount(item.applyAmount, item.coinCode)}</b></span>
        <span>到账: <b className="font-semibold text-ink">{formatAmount(item.actualAmount, item.coinCode)}</b></span>
        <span>手续费: <b className="font-semibold text-ink">{formatAmount(item.feeAmount, item.coinCode)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
        <span>到账地址: <b className="font-semibold text-ink">{shortenAddress(item.toAddress)}</b></span>
        <span>交易凭证: <b className="font-semibold text-ink">{shortenHash(item.txHash)}</b></span>
      </div>
      {item.rejectReason ? <div className="mt-2 text-[12px] text-rose-200">驳回原因: {item.rejectReason}</div> : null}
    </div>
  )
}

function OrderRecordRow({ item }: { item: PolymarketOrderPageItem }) {
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
        <span>金额: <b className="font-semibold text-ink">{formatNumberValue(item.requestAmount)}</b></span>
        <span>价格: <b className="font-semibold text-ink">{formatNumberValue(item.price)}</b></span>
        <span>成交: <b className="font-semibold text-ink">{formatNumberValue(item.filledAmount)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-3">
        <span>方向: <b className="font-semibold text-ink">{item.side || '--'}</b></span>
        <span>数量: <b className="font-semibold text-ink">{formatNumberValue(item.size)}</b></span>
        <span>已成交: <b className="font-semibold text-ink">{formatNumberValue(item.filledSize)}</b></span>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] text-ink-soft">
        <span>佣金: <b className="font-semibold text-ink">{formatNumberValue(item.commissionAmount)} / {formatPercentValue(item.commissionRate)}</b></span>
      </div>
      {item.updateTime ? (
        <div className="mt-2 text-[12px] text-ink-soft">
          更新时间: <b className="font-semibold text-ink">{formatMaybeDate(item.updateTime)}</b>
        </div>
      ) : null}
      {item.errorMessage ? <div className="mt-2 text-[12px] text-rose-200">异常原因: {item.errorMessage}</div> : null}
    </div>
  )
}

function DirectUserRow({ item }: { item: WalletUserDirectPageItem }) {
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
        <span>链: <b className="font-semibold text-ink">{item.authType || '--'}</b></span>
        <span>注册: <b className="font-semibold text-ink">{formatMaybeDate(item.createTime)}</b></span>
      </div>
    </div>
  )
}

function RewardRecordRow({ item }: { item: WalletRewardPageItem }) {
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
      <div className="mt-3 grid gap-2 text-[12px] text-ink-soft sm:grid-cols-2">
        <span>币种: <b className="font-semibold text-ink">{item.coinCode || '--'}</b></span>
        <span>备注: <b className="font-semibold text-ink">{item.remark || '--'}</b></span>
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
  const relationHasError = Boolean(relationError)

  return (
    <section className="grid gap-3 lg:grid-cols-2">
      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
        <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase text-brand">Relation</div>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">邀请关系</h2>
          </div>
        </div>

        <div className="grid sm:grid-cols-2">
          <RelationMetricAction
            label="直推人数"
            onClick={onOpenDirectUsers}
            value={relationLoading ? '...' : relationHasError ? '--' : formatIntegerValue(relationStats?.directCount)}
          />
          <RelationMetricAction
            label="伞下总人数"
            onClick={onOpenUmbrellaUsers}
            value={relationLoading ? '...' : relationHasError ? '--' : formatIntegerValue(relationStats?.umbrellaCount)}
          />
        </div>

        {relationHasError ? (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200">
            邀请数据加载失败，请稍后重试。
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
        <div className="flex h-full flex-col justify-between gap-6 px-4 py-4 sm:px-5">
          <div>
            <div className="text-[11px] font-semibold uppercase text-brand">Rewards</div>
            <h2 className="mt-1 text-[20px] font-semibold text-ink">奖励记录</h2>
            <p className="mt-3 text-[13px] leading-5 text-ink-soft">查看直推奖励和节点奖励的到账明细。</p>
          </div>
          <button
            type="button"
            onClick={onOpenRewards}
            className="inline-flex h-11 w-full items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] px-4 text-[13px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06]"
          >
            查看奖励记录
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
        title="订单记录"
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">共 {total} 条</span>}
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
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">完成钱包登录后可查看订单。</div>
        ) : orderQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-32 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : orderQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            订单加载失败，请稍后重试。
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">暂无订单。</div>
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
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">正在加载更多...</div>
        ) : null}

        {!orderQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">已经到底了</div>
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
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search.trim())
  const isSearchSettling = search.trim() !== debouncedSearch
  const isUmbrellaList = listKind === 'umbrella'
  const listCopy = isUmbrellaList
    ? {
        eyebrow: 'Umbrella Users',
        title: '伞下总人数列表',
        empty: '暂无伞下用户。',
        error: '伞下总人数列表加载失败，请稍后重试。',
        login: '完成钱包登录后可查看伞下用户。',
      }
    : {
        eyebrow: 'Direct Users',
        title: '直推列表',
        empty: '暂无直推用户。',
        error: '直推列表加载失败，请稍后重试。',
        login: '完成钱包登录后可查看直推用户。',
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
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">共 {total} 人</span>}
        onClose={onClose}
      />
      <div className="border-b border-white/8 px-4 py-3 sm:px-5">
        <label className="block">
          <span className="flex items-center justify-between gap-3 text-[12px] font-medium text-ink-soft">
            <span>钱包地址搜索</span>
            {isSearchSettling ? <span className="text-brand">等待输入完成...</span> : null}
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="输入钱包地址片段"
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
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">当前账户信息暂不可用，请稍后重试。</div>
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
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">正在加载更多...</div>
        ) : null}

        {!relationUsersQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">已经到底了</div>
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
        title="奖励记录"
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">共 {total} 条</span>}
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
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">完成钱包登录后可查看奖励记录。</div>
        ) : rewardQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : rewardQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            奖励记录加载失败，请稍后重试。
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">暂无奖励记录。</div>
        ) : (
          <div>
            {items.map((item) => (
              <RewardRecordRow key={`${item.id}-${item.detailNo}`} item={item} />
            ))}
          </div>
        )}

        {rewardQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">正在加载更多...</div>
        ) : null}

        {!rewardQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">已经到底了</div>
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
  const title = kind === 'deposit' ? '充值记录' : '提现记录'
  const eyebrow = kind === 'deposit' ? 'Deposit History' : 'Withdraw History'

  return (
    <DialogFrame isOpen={isOpen} maxWidthClass="max-w-2xl" onClose={onClose}>
      <DialogHeader
        eyebrow={eyebrow}
        title={title}
        status={<span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">共 {total} 条</span>}
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
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">完成钱包登录后可查看记录。</div>
        ) : historyQuery.isLoading ? (
          <div className="grid gap-2 px-4 py-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 rounded-[16px] border border-white/8 bg-white/[0.03]" />
            ))}
          </div>
        ) : historyQuery.isError ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-rose-200">
            记录加载失败，请稍后重试。
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-full place-items-center px-4 py-8 text-center text-[13px] text-ink-soft">暂无记录。</div>
        ) : (
          <div>
            {kind === 'deposit'
              ? (items as DepositOrderPageItem[]).map((item) => <DepositRecordRow key={`${item.id}-${item.orderNo}`} item={item} />)
              : (items as WithdrawOrderPageItem[]).map((item) => <WithdrawRecordRow key={`${item.id}-${item.withdrawNo}`} item={item} />)}
          </div>
        )}

        {historyQuery.isFetchingNextPage ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">正在加载更多...</div>
        ) : null}

        {!historyQuery.hasNextPage && items.length > 0 ? (
          <div className="border-t border-white/6 px-4 py-4 text-center text-[12px] text-ink-soft">已经到底了</div>
        ) : null}
      </div>
    </DialogFrame>
  )
}

export function ProfilePage() {
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
    walletAddress: address,
    walletUser,
  })
  const withdraw = useWithdraw({
    contractConfig,
    isConnected,
    isSessionReady: isSessionForConnectedWallet,
    walletAddress: address,
    walletUser,
  })

  const connectionLabel = !isConnected ? '未连接' : isSessionForConnectedWallet ? '已登录' : '待登录'
  const connectionTone = !isConnected
    ? 'border-white/10 bg-white/[0.04] text-ink-soft'
    : isSessionForConnectedWallet
      ? 'border-brand/20 bg-brand/12 text-brand'
      : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  const userTypeLabel = walletUser?.userType === 2 ? '节点用户' : walletUser?.userType === 1 ? '普通用户' : '--'
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !walletUser?.inviteCode) {
      return ''
    }

    return `${window.location.protocol}//${window.location.host}/?code=${walletUser.inviteCode}`
  }, [walletUser?.inviteCode])
  const withdrawMinAmount = Number(contractConfig?.withdrawMinAmount ?? '')
  const withdrawMaxAmount = Number(contractConfig?.withdrawMaxAmount ?? '')
  const withdrawMinAmountLabel =
    Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0 ? `${contractConfig?.withdrawMinAmount} USDT` : '不限'
  const withdrawMaxAmountLabel =
    Number.isFinite(withdrawMaxAmount) && withdrawMaxAmount > 0 ? `${contractConfig?.withdrawMaxAmount} USDT` : '不限'
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
                <h1 className="text-[22px] font-semibold text-ink sm:text-[26px]">个人中心</h1>
                <div className="mt-0.5 truncate text-[12px] text-ink-soft">
                  {walletUser?.walletAddress ? shortenAddress(walletUser.walletAddress) : address ? shortenAddress(address) : '连接钱包后管理资产'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${connectionTone}`}>
                钱包状态: {connectionLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                网络: BSC
              </span>
            </div>
          </div>
        </section>

        {!isConnected ? (
          <section className="rounded-[22px] border border-dashed border-white/10 bg-panel/95 px-4 py-8 text-center text-[13px] text-ink-soft">
            还没有连接钱包。连接后这里会展示账户、资产、充值、提现与记录入口。
          </section>
        ) : !isSessionForConnectedWallet ? (
          <section className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-8 text-center text-[13px] text-amber-100">
            钱包已连接，完成签名登录后即可查看资产和资金记录。
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
            账户信息加载失败，请稍后重试。
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
                      <div className="mt-1 text-[12px] text-ink-soft">BSC-USDT 可用余额</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:w-[16rem]">
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveAction('deposit'))}
                        className="inline-flex h-11 items-center justify-center rounded-[15px] border border-brand/20 bg-brand px-3 text-[13px] font-semibold text-black transition hover:bg-[#19ff53]"
                      >
                        充值
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveAction('withdraw'))}
                        className="inline-flex h-11 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] px-3 text-[13px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06]"
                      >
                        提现
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveHistory('deposit'))}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.03] px-3 text-[12px] font-semibold text-ink-soft transition hover:border-white/16 hover:text-ink"
                      >
                        充值记录
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setActiveHistory('withdraw'))}
                        className="inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.03] px-3 text-[12px] font-semibold text-ink-soft transition hover:border-white/16 hover:text-ink"
                      >
                        提现记录
                      </button>
                      <button
                        type="button"
                        onClick={() => requireWalletReady(() => setIsOrderHistoryOpen(true))}
                        className="col-span-2 inline-flex h-10 items-center justify-center rounded-[14px] border border-sky-400/20 bg-sky-400/10 px-3 text-[12px] font-semibold text-sky-100 transition hover:border-sky-300/30 hover:bg-sky-400/14"
                      >
                        订单记录
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid border-b border-white/8 sm:grid-cols-5">
                  <MetricCell label="总余额" value={primaryAsset?.totalBalance ?? '--'} />
                  <MetricCell label="冻结余额" value={primaryAsset?.frozenBalance ?? '--'} />
                  <MetricCell label="累计充值" value={primaryAsset?.rechargeTotal ?? '--'} />
                  <MetricCell label="累计提现" value={primaryAsset?.withdrawTotal ?? '--'} />
                  <MetricCell label="币种" value={primaryAsset ? `${primaryAsset.chainCode}-${primaryAsset.coinCode}` : '--'} />
                </div>

                <div className="grid gap-0 sm:grid-cols-2">
                  <div className="border-b border-white/8 px-4 py-4 sm:border-b-0 sm:border-r sm:px-5">
                    <div className="text-[11px] font-semibold uppercase text-ink-soft">充值规则</div>
                    <div className="mt-2 grid gap-0">
                      <FieldLine label="最小金额" value={contractConfig?.rechargeMinAmount ? `${contractConfig.rechargeMinAmount} USDT` : '--'} />
                      <FieldLine label="网络" value={contractConfig?.chainType ?? 'BSC'} />
                    </div>
                  </div>
                  <div className="px-4 py-4 sm:px-5">
                    <div className="text-[11px] font-semibold uppercase text-ink-soft">提现规则</div>
                    <div className="mt-2 grid gap-0">
                      <FieldLine label="限额" value={`${withdrawMinAmountLabel} / ${withdrawMaxAmountLabel}`} />
                      <FieldLine label="手续费" value={withdrawFeeLabel} />
                      <FieldLine label="可用余额" value={withdraw.availableBalance ? `${withdraw.availableBalance} USDT` : '--'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-white/8 bg-panel/95 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
                <div className="border-b border-white/8 px-4 py-4 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-brand">Identity</div>
                      <h2 className="mt-1 text-[20px] font-semibold text-ink">账户身份</h2>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                      {userTypeLabel}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-3 sm:px-5">
                  <FieldLine label="钱包地址" value={shortenAddress(walletUser.walletAddress)} />
                  <FieldLine label="邀请码" value={walletUser.inviteCode || '--'} />
                  <FieldLine label="登录方式" value={walletUser.authType || '--'} />
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
                        toast('暂无邀请链接')
                        return
                      }

                      try {
                        setIsCopyingInviteLink(true)
                        await navigator.clipboard.writeText(inviteLink)
                        toast.success('邀请链接已复制')
                      } catch {
                        toast('复制失败，请手动复制')
                      } finally {
                        setIsCopyingInviteLink(false)
                      }
                    }}
                    disabled={isCopyingInviteLink}
                    className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[12px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCopyingInviteLink ? '复制中...' : '复制邀请链接'}
                  </button>
                </div>

                {isContractConfigError ? (
                  <div className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-3 text-[12px] text-rose-200 sm:px-5">
                    资金配置加载失败，请稍后重试。
                  </div>
                ) : isContractConfigLoading ? (
                  <div className="border-t border-white/8 px-4 py-3 text-[12px] text-ink-soft sm:px-5">正在加载资金配置...</div>
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
