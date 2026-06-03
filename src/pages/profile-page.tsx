import { useAppKit } from '@reown/appkit/react'
import { toast } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { getWalletUserInfo } from '../features/wallet-auth/api'
import { useWalletAuthStore } from '../features/wallet-auth/auth-store'
import { useWalletAuth } from '../features/wallet-auth/use-wallet-auth'
import { getWalletContractConfig } from '../features/wallet/deposit/api'
import { useDeposit } from '../features/wallet/deposit/use-deposit'
import { useWithdraw } from '../features/wallet/withdraw/use-withdraw'
import { shortenAddress, shortenHash } from '../lib/format'

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

function ProfileDataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[12px] text-ink-soft sm:text-[13px]">{label}</span>
      <span className="text-right text-[13px] font-medium text-ink sm:text-[14px]">{value}</span>
    </div>
  )
}

export function ProfilePage() {
  const { open } = useAppKit()
  const { address, isConnected, isSessionForConnectedWallet, startWalletAuth, status: authStatus } = useWalletAuth()
  const session = useWalletAuthStore((state) => state.session)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [isCopyingInviteLink, setIsCopyingInviteLink] = useState(false)

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wallet-user-info', session?.token ?? null],
    queryFn: getWalletUserInfo,
    enabled: isSessionForConnectedWallet,
  })

  const {
    data: contractConfigResult,
    isLoading: isContractConfigLoading,
    isError: isContractConfigError,
    error: contractConfigError,
  } = useQuery({
    queryKey: ['wallet-contract-config', 'BSC'],
    queryFn: () => getWalletContractConfig('BSC'),
    enabled: isSessionForConnectedWallet,
  })

  const walletUser = data?.data
  const contractConfig = contractConfigResult?.data ?? undefined
  const primaryAsset =
    walletUser?.assets.find((asset) => asset.chainCode === 'BSC' && asset.coinCode.toUpperCase() === 'USDT') ??
    walletUser?.assets[0]

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

  const depositButtonLabel = resolveDepositButtonLabel({
    isConnected,
    isSessionReady: isSessionForConnectedWallet,
    status: deposit.status,
  })
  const depositStatusMeta = resolveDepositStatusMeta(deposit.status)
  const withdrawButtonLabel = resolveWithdrawButtonLabel({
    isConnected,
    isSessionReady: isSessionForConnectedWallet,
    status: withdraw.status,
  })
  const withdrawStatusMeta = resolveWithdrawStatusMeta(withdraw.status)
  const connectionLabel = !isConnected ? '未连接' : isSessionForConnectedWallet ? '已登录' : '待登录'
  const connectionTone = !isConnected
    ? 'border-white/10 bg-white/[0.04] text-ink-soft'
    : isSessionForConnectedWallet
      ? 'border-brand/20 bg-brand/12 text-brand'
      : 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  const inviteLink = useMemo(() => {
    if (typeof window === 'undefined' || !walletUser?.inviteCode) {
      return ''
    }

    return `${window.location.protocol}//${window.location.host}/?code=${walletUser.inviteCode}`
  }, [walletUser?.inviteCode])
  const withdrawMinAmount = Number(contractConfig?.withdrawMinAmount ?? '')
  const withdrawMaxAmount = Number(contractConfig?.withdrawMaxAmount ?? '')

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="grid gap-4 sm:gap-5"
    >
      <section className="overflow-hidden rounded-[26px] border border-white/8 bg-panel/95 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
        <div className="bg-[radial-gradient(circle_at_top_right,rgba(0,255,65,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))] px-4 py-5 sm:px-5 sm:py-6 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[38rem]">
              <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-brand sm:text-[11px]">Profile</div>
              <h1 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink sm:text-[34px]">
                个人中心
              </h1>
              <p className="mt-2 max-w-[34rem] text-[13px] leading-6 text-ink-soft sm:text-[14px]">
                这里集中展示当前钱包身份、BSC-USDT 资产，以及充值和提现入口，保留资金操作所需的信息，其余内容尽量收敛。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:text-[12px] ${connectionTone}`}
              >
                钱包状态: {connectionLabel}
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft sm:text-[12px]">
                网络: BSC
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="rounded-[26px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5 lg:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 sm:text-[12px]">Wallet</div>
              <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ink sm:text-[24px]">钱包与资产</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-ink-soft sm:text-[12px]">
              资产概览
            </div>
          </div>

          {!isConnected ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-[13px] leading-6 text-ink-soft sm:px-5 sm:text-[14px]">
              还没有连接钱包，点击右上角按钮先连接，随后这里会显示当前账户和资产信息。
            </div>
          ) : !isSessionForConnectedWallet ? (
            <div className="mt-5 rounded-[20px] border border-amber-400/20 bg-amber-400/10 px-4 py-5 text-[13px] leading-6 text-amber-100 sm:px-5 sm:text-[14px]">
              钱包已连接，但尚未完成登录。完成签名后，这里会展示真实用户信息，充值接口也才能正常使用。
            </div>
          ) : isLoading ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                <div className="h-4 w-20 rounded-full bg-white/6" />
                <div className="mt-6 h-4 w-full rounded-full bg-white/6" />
                <div className="mt-3 h-4 w-[78%] rounded-full bg-white/6" />
                <div className="mt-3 h-4 w-[62%] rounded-full bg-white/6" />
              </div>
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                <div className="h-4 w-28 rounded-full bg-white/6" />
                <div className="mt-5 h-12 w-40 rounded-[18px] bg-white/6" />
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="h-16 rounded-[16px] bg-white/6" />
                  <div className="h-16 rounded-[16px] bg-white/6" />
                  <div className="h-16 rounded-[16px] bg-white/6" />
                </div>
              </div>
            </div>
          ) : isError ? (
            <div className="mt-5 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-5 text-[13px] leading-6 text-rose-200 sm:px-5 sm:text-[14px]">
              钱包用户信息读取失败: {error instanceof Error ? error.message : '未知错误'}
            </div>
          ) : walletUser ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 sm:text-[12px]">Identity</div>
                <div className="mt-4">
                  <ProfileDataItem label="钱包地址" value={shortenAddress(walletUser.walletAddress)} />
                  <ProfileDataItem label="用户 ID" value={String(walletUser.userId)} />
                  <ProfileDataItem label="邀请码" value={walletUser.inviteCode || '--'} />
                </div>

                {inviteLink ? (
                  <div className="mt-5 rounded-[18px] border border-white/8 bg-black/10 p-3.5 sm:p-4">
                    <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">
                      Invite Link
                    </div>
                    <p className="mt-2 break-all text-[12px] leading-5 text-ink-soft sm:text-[13px]">{inviteLink}</p>
                    <button
                      type="button"
                      onClick={async () => {
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
                      className="mt-3 inline-flex h-10 items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-[12px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isCopyingInviteLink ? '复制中...' : '复制邀请链接'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="rounded-[20px] border border-brand/12 bg-[linear-gradient(180deg,rgba(0,255,65,0.08),rgba(255,255,255,0.02))] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 sm:text-[12px]">Balance</div>
                    <div className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-ink sm:text-[38px]">
                      {primaryAsset ? `${primaryAsset.availableBalance} ${primaryAsset.coinCode}` : '--'}
                    </div>
                  </div>
                  <div className="rounded-full border border-brand/20 bg-brand/12 px-3 py-1.5 text-[11px] font-semibold text-brand sm:text-[12px]">
                    BSC-USDT
                  </div>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-[16px] border border-white/8 bg-black/10 px-3 py-3">
                    <div className="text-[11px] text-ink-soft sm:text-[12px]">累计充值</div>
                    <div className="mt-2 text-[18px] font-semibold text-ink sm:text-[20px]">
                      {primaryAsset?.rechargeTotal ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/10 px-3 py-3">
                    <div className="text-[11px] text-ink-soft sm:text-[12px]">累计提现</div>
                    <div className="mt-2 text-[18px] font-semibold text-ink sm:text-[20px]">
                      {primaryAsset?.withdrawTotal ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-black/10 px-3 py-3">
                    <div className="text-[11px] text-ink-soft sm:text-[12px]">冻结余额</div>
                    <div className="mt-2 text-[18px] font-semibold text-ink sm:text-[20px]">
                      {primaryAsset?.frozenBalance ?? '--'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4">
          <div className="rounded-[26px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 sm:text-[12px]">Recharge</div>
                <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ink sm:text-[24px]">BSC USDT 充值</h2>
              </div>
              <div
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:text-[12px] ${depositStatusMeta.tone}`}
              >
                {depositStatusMeta.label}
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">网络</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">BSC</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">币种</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">USDT</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">最小金额</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">
                    {contractConfig?.rechargeMinAmount ? `${contractConfig.rechargeMinAmount} USDT` : '--'}
                  </div>
                </div>
              </div>

              {isContractConfigLoading ? (
                <p className="mt-4 text-[12px] text-ink-soft sm:text-[13px]">正在加载资金配置...</p>
              ) : null}

              {isContractConfigError ? (
                <div className="mt-4 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200 sm:text-[13px]">
                  资金配置读取失败: {contractConfigError instanceof Error ? contractConfigError.message : '未知错误'}
                </div>
              ) : null}

              {deposit.lastSuccessHash ? (
                <div className="mt-4 rounded-[16px] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-[12px] text-emerald-100 sm:text-[13px]">
                  最近一次充值交易哈希: {shortenHash(deposit.lastSuccessHash)}
                </div>
              ) : null}

              <label className="mt-5 block">
                <span className="block text-[12px] font-medium text-ink-soft sm:text-[13px]">充值金额</span>
                <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
                  <input
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder={contractConfig?.rechargeMinAmount ? `最少 ${contractConfig.rechargeMinAmount}` : '请输入 USDT 数量'}
                    className="h-14 w-full bg-transparent text-[18px] font-medium text-ink outline-none placeholder:text-ink-soft/45 sm:text-[20px]"
                  />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft sm:text-[13px]">
                    USDT
                  </span>
                </div>
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDepositAmount(contractConfig?.rechargeMinAmount ?? '')}
                  className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-3 text-[13px] font-medium text-ink-soft transition hover:border-white/14 hover:bg-white/[0.06] hover:text-ink"
                >
                  填入最小金额
                </button>
                <button
                  type="button"
                  onClick={() => setDepositAmount('100')}
                  className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-3 text-[13px] font-medium text-ink-soft transition hover:border-white/14 hover:bg-white/[0.06] hover:text-ink"
                >
                  快速填入 100
                </button>
              </div>

              <div className="mt-4 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isConnected) {
                      open()
                      return
                    }

                    if (!isSessionForConnectedWallet) {
                      void startWalletAuth()
                      return
                    }

                    void deposit.submitDeposit(depositAmount)
                  }}
                  disabled={authStatus === 'logging_in' || authStatus === 'signing' || deposit.isBusy || Boolean(deposit.providerWarning)}
                  className="inline-flex h-12 items-center justify-center rounded-[16px] border border-brand/20 bg-brand px-4 text-[14px] font-semibold text-black transition hover:bg-[#19ff53] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {depositButtonLabel}
                </button>

                {deposit.hasPendingCallback ? (
                  <button
                    type="button"
                    onClick={() => void deposit.retryCallback()}
                    className="inline-flex h-12 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] px-4 text-[14px] font-semibold text-ink transition hover:border-white/16 hover:bg-white/[0.06]"
                  >
                    重新通知后端入账
                  </button>
                ) : null}

                {deposit.providerWarning ? (
                  <div className="rounded-[16px] border border-amber-400/25 bg-amber-400/10 px-3 py-3 text-[12px] text-amber-100 sm:text-[13px]">
                    {deposit.providerWarning}
                  </div>
                ) : null}

                {(deposit.error || deposit.status === 'error') && deposit.error ? (
                  <div className="rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200 sm:text-[13px]">
                    {deposit.error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5 lg:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft/80 sm:text-[12px]">Withdraw</div>
                <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-ink sm:text-[24px]">BSC USDT 提现</h2>
              </div>
              <div
                className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold sm:text-[12px] ${withdrawStatusMeta.tone}`}
              >
                {withdrawStatusMeta.label}
              </div>
            </div>

            <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">可用余额</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">
                    {withdraw.availableBalance ? `${withdraw.availableBalance} USDT` : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">最小提现</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">
                    {Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0
                      ? `${contractConfig?.withdrawMinAmount} USDT`
                      : '不限'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">最大提现</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">
                    {Number.isFinite(withdrawMaxAmount) && withdrawMaxAmount > 0
                      ? `${contractConfig?.withdrawMaxAmount} USDT`
                      : '不限'}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-ink-soft/80 sm:text-[12px]">手续费</div>
                  <div className="mt-1 text-[16px] font-semibold text-ink sm:text-[18px]">
                    {contractConfig?.withdrawFeeValue
                      ? contractConfig.withdrawFeeType === 2
                        ? `${contractConfig.withdrawFeeValue}%`
                        : `${contractConfig.withdrawFeeValue} USDT`
                      : '--'}
                  </div>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="block text-[12px] font-medium text-ink-soft sm:text-[13px]">提现金额</span>
                <div className="mt-2 flex items-center gap-3 rounded-[18px] border border-white/10 bg-[#101211] px-4">
                  <input
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    inputMode="decimal"
                    placeholder={
                      Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0
                        ? `最少 ${contractConfig?.withdrawMinAmount}`
                        : '请输入 USDT 数量'
                    }
                    className="h-14 w-full bg-transparent text-[18px] font-medium text-ink outline-none placeholder:text-ink-soft/45 sm:text-[20px]"
                  />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-soft sm:text-[13px]">
                    USDT
                  </span>
                </div>
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setWithdrawAmount(
                      Number.isFinite(withdrawMinAmount) && withdrawMinAmount > 0 ? contractConfig?.withdrawMinAmount ?? '' : '',
                    )
                  }
                  className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-3 text-[13px] font-medium text-ink-soft transition hover:border-white/14 hover:bg-white/[0.06] hover:text-ink"
                >
                  填入最小金额
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawAmount(withdraw.availableBalance || '')
                  }}
                  className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-3 text-[13px] font-medium text-ink-soft transition hover:border-white/14 hover:bg-white/[0.06] hover:text-ink"
                >
                  填入全部可用
                </button>
              </div>

              <div className="mt-4 grid gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!isConnected) {
                      open()
                      return
                    }

                    if (!isSessionForConnectedWallet) {
                      void startWalletAuth()
                      return
                    }

                    void withdraw.submitWithdraw(withdrawAmount)
                  }}
                  disabled={authStatus === 'logging_in' || authStatus === 'signing' || withdraw.isBusy}
                  className="inline-flex h-12 items-center justify-center rounded-[16px] border border-brand/20 bg-brand px-4 text-[14px] font-semibold text-black transition hover:bg-[#19ff53] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {withdrawButtonLabel}
                </button>

                {(withdraw.error || withdraw.status === 'error') && withdraw.error ? (
                  <div className="rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] text-rose-200 sm:text-[13px]">
                    {withdraw.error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.section>
  )
}
