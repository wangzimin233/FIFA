import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { getWalletUserInfo } from '../features/wallet-auth/api'
import { useWalletAuthStore } from '../features/wallet-auth/auth-store'

const rechargeOptions = [
  { label: '$10', value: '10 USDC' },
  { label: '$25', value: '25 USDC' },
  { label: '$50', value: '50 USDC' },
]

const referralStats = [
  { label: '直推人数', value: '18' },
  { label: '本周新增', value: '3' },
  { label: '活跃人数', value: '11' },
]

export function ProfilePage() {
  const session = useWalletAuthStore((state) => state.session)
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wallet-user-info', session?.token],
    queryFn: getWalletUserInfo,
    enabled: Boolean(session?.token),
  })
  const walletUser = data?.data
  const primaryAsset = walletUser?.assets[0]

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="grid gap-3.5 sm:gap-4"
    >
      <section className="rounded-[22px] border border-white/8 bg-panel/95 px-4 py-4 shadow-[0_14px_30px_rgba(0,0,0,0.16)] sm:px-5 sm:py-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-brand sm:text-[11px]">
          Profile
        </div>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-ink sm:text-[30px]">
          个人中心
        </h1>
        <p className="mt-2 text-[13px] leading-5 text-ink-soft sm:text-[14px]">
          完成钱包签名登录后，这里会直接读取当前钱包用户信息与资产概览。
        </p>
      </section>

      <section className="rounded-[22px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold text-ink sm:text-[19px]">钱包登录状态</h2>
            <p className="mt-1 text-[12px] text-ink-soft sm:text-[13px]">
              使用已保存 token 请求 `/api/wallet/user/info`。
            </p>
          </div>
          <div className="rounded-full border border-brand/20 bg-brand/12 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
            {session?.authType ?? 'Guest'}
          </div>
        </div>

        {!session ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-[12px] text-ink-soft sm:text-[13px]">
            先连接钱包并完成签名登录，随后这里会显示真实用户资料。
          </div>
        ) : isLoading ? (
          <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4 text-[12px] text-ink-soft sm:text-[13px]">
            正在读取钱包用户信息...
          </div>
        ) : isError ? (
          <div className="mt-4 rounded-[18px] border border-rose-500/20 bg-rose-500/10 px-4 py-4 text-[12px] text-rose-200 sm:text-[13px]">
            钱包用户信息读取失败：{error instanceof Error ? error.message : '未知错误'}
          </div>
        ) : walletUser ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
              <div className="grid gap-2 text-[12px] text-ink-soft sm:text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <span>钱包地址</span>
                  <span className="truncate text-right font-medium text-ink">{walletUser.walletAddress}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>用户 ID</span>
                  <span className="font-medium text-ink">{walletUser.userId}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>邀请码</span>
                  <span className="font-medium text-ink">{walletUser.inviteCode || '--'}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>昵称</span>
                  <span className="font-medium text-ink">{walletUser.nickname || '--'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
              <div className="text-[12px] text-ink-soft sm:text-[13px]">可用余额</div>
              <div className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
                {primaryAsset ? `${primaryAsset.availableBalance} ${primaryAsset.coinCode}` : '--'}
              </div>
              <div className="mt-2 text-[12px] text-ink-soft sm:text-[13px]">
                {primaryAsset ? `${primaryAsset.chainCode} / ${primaryAsset.coinName}` : '暂无资产数据'}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-4">
        <section className="rounded-[22px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold text-ink sm:text-[19px]">充值板块</h2>
              <p className="mt-1 text-[12px] text-ink-soft sm:text-[13px]">用于快速进入钱包充值流程。</p>
            </div>
            <div className="rounded-full border border-brand/20 bg-brand/12 px-2.5 py-1 text-[10px] font-semibold text-brand sm:text-[11px]">
              Wallet
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] p-3.5 sm:p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[12px] text-ink-soft sm:text-[13px]">可用余额</div>
                <div className="mt-1 text-[28px] font-semibold tracking-tight text-ink sm:text-[34px]">
                  {primaryAsset ? `${primaryAsset.availableBalance} ${primaryAsset.coinCode}` : '$128.50'}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-[14px] border border-brand/20 bg-brand px-4 text-[11px] font-semibold text-black transition hover:bg-[#19ff53] sm:text-[12px]"
              >
                去充值
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {rechargeOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  className="rounded-[14px] border border-white/8 bg-white/[0.04] px-2.5 py-2.5 text-center transition hover:border-white/14 hover:bg-white/[0.06]"
                >
                  <div className="text-[12px] font-semibold text-ink sm:text-[13px]">{option.label}</div>
                  <div className="mt-0.5 text-[10px] text-ink-soft sm:text-[11px]">{option.value}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[22px] border border-white/8 bg-panel/95 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:p-5">
          <h2 className="text-[17px] font-semibold text-ink sm:text-[19px]">直推人数展示</h2>
          <p className="mt-1 text-[12px] text-ink-soft sm:text-[13px]">展示当前直推转化的核心概览。</p>

          <div className="mt-4 grid gap-2.5">
            {referralStats.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-3"
              >
                <span className="text-[12px] text-ink-soft sm:text-[13px]">{item.label}</span>
                <span className="text-[18px] font-semibold text-ink sm:text-[20px]">{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-[12px] text-ink-soft sm:px-5 sm:py-5 sm:text-[13px]">
        其他待定：后续可继续补充账单记录、邀请码、团队收益等内容。
      </section>
    </motion.section>
  )
}
