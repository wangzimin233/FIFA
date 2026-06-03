import { useAppKit } from '@reown/appkit/react'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  loadInviteCodeFromSession,
  saveInviteCodeToSession,
} from '../features/wallet-auth/storage'
import { useWalletAuth } from '../features/wallet-auth/use-wallet-auth'

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4.5 w-4.5 sm:h-5 sm:w-5">
      <path
        d="M12 12.25a3.75 3.75 0 1 0 0-7.5a3.75 3.75 0 0 0 0 7.5Zm0 2c-3.85 0-7 2.14-7 4.75c0 .41.34.75.75.75h12.5c.41 0 .75-.34.75-.75c0-2.61-3.15-4.75-7-4.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function InviteCodeDialog({
  error,
  initialInviteCode,
  isOpen,
  isSubmitting,
  onConfirm,
  onSkip,
}: {
  error: string | null
  initialInviteCode?: string
  isOpen: boolean
  isSubmitting: boolean
  onConfirm: (inviteCode: string) => void
  onSkip: () => void
}) {
  const [inviteCode, setInviteCode] = useState(() => initialInviteCode ?? '')
  const [validationMessage, setValidationMessage] = useState('')

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/60 px-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#171918] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-brand">
              Invite
            </div>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-ink">补充邀请码</h2>
            <p className="mt-2 text-[13px] leading-6 text-ink-soft">
              当前钱包还未注册。邀请码可以填写，也可以直接跳过；跳过后将不传这个参数。
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-[12px] font-medium text-ink-soft">邀请码（可选）</span>
              <input
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase())
                  if (validationMessage) {
                    setValidationMessage('')
                  }
                }}
                placeholder="例如 ROOT01"
                className="h-11 w-full rounded-[16px] border border-white/10 bg-white/[0.04] px-3 text-[14px] text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-brand/30"
              />
            </label>

            {validationMessage ? <p className="mt-3 text-[12px] text-amber-200">{validationMessage}</p> : null}
            {!validationMessage && error ? <p className="mt-3 text-[12px] text-rose-300">{error}</p> : null}

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onSkip}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[13px] font-semibold text-ink-soft transition hover:border-white/16 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                跳过
              </button>
              <button
                type="button"
                onClick={() => {
                  const normalizedInviteCode = inviteCode.trim().toUpperCase()
                  if (!normalizedInviteCode) {
                    setValidationMessage('请输入邀请码后继续注册，或点击跳过。')
                    return
                  }

                  onConfirm(normalizedInviteCode)
                }}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-[16px] border border-brand/20 bg-brand text-[13px] font-semibold text-black transition hover:bg-[#19ff53] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '注册中...' : '继续注册'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function RootLayout() {
  const location = useLocation()
  const { open } = useAppKit()
  const {
    error,
    isConnected,
    isInviteCodeRequired,
    isSessionForConnectedWallet,
    completeRegistration,
    resetWalletAuth,
    startWalletAuth,
    status,
    walletButtonLabel,
  } = useWalletAuth()
  const inviteCodeFromQuery = useMemo(() => {
    const queryValue = new URLSearchParams(location.search).get('code')?.trim().toUpperCase()
    return queryValue || ''
  }, [location.search])
  const persistedInviteCode = useMemo(() => {
    if (inviteCodeFromQuery) {
      return inviteCodeFromQuery
    }

    return loadInviteCodeFromSession()
  }, [inviteCodeFromQuery])

  const isWalletBusy =
    status === 'logging_out' ||
    status === 'signing' ||
    status === 'logging_in' ||
    status === 'registering'

  useEffect(() => {
    if (inviteCodeFromQuery) {
      saveInviteCodeToSession(inviteCodeFromQuery)
    }
  }, [inviteCodeFromQuery])

  return (
    <div className="relative min-h-screen isolate">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[#121212]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,65,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(215,235,197,0.09),transparent_22%)]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[rgba(16,18,17,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[62px] w-full max-w-7xl items-center justify-between px-2.5 sm:h-[68px] sm:px-4 lg:px-5">
          <NavLink
            to="/"
            end
            className="inline-flex min-w-0 items-center rounded-[16px] border border-white/8 bg-white/[0.03] px-3 py-1.5 text-ink transition hover:border-white/14 hover:bg-white/[0.05] sm:px-4 sm:py-2"
          >
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.26em] text-brand sm:text-[11px]">
                GOPRE
              </div>
              <div className="mt-0.5 truncate text-[10px] font-semibold text-ink sm:text-[12px]">
                World Cup 2026
              </div>
            </div>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (!isConnected) {
                  resetWalletAuth()
                  open()
                  return
                }

                if (!isSessionForConnectedWallet && !isWalletBusy) {
                  void startWalletAuth()
                  return
                }

                open()
              }}
              disabled={isWalletBusy}
              className="inline-flex h-9 items-center justify-center rounded-[15px] border border-brand/20 bg-brand px-3 text-[10px] font-semibold text-black shadow-[0_10px_24px_rgba(0,255,65,0.2)] transition hover:bg-[#19ff53] sm:h-10 sm:px-4 sm:text-[11px]"
            >
              {walletButtonLabel}
            </button>

            <NavLink
              to="/profile"
              className={({ isActive }) =>
                [
                  'inline-flex h-9 w-9 items-center justify-center rounded-[15px] border text-ink-soft transition sm:h-10 sm:w-10',
                  isActive
                    ? 'border-brand/30 bg-brand/12 text-brand'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/16 hover:text-ink',
                ].join(' ')
              }
              aria-label="个人中心"
            >
              <UserGlyph />
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-2.5 pb-2.5 pt-[72px] sm:px-4 sm:pb-4 sm:pt-[84px] lg:px-5">
        {error ? (
          <div className="mb-2 rounded-[16px] border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200 sm:text-[13px]">
            {error}
          </div>
        ) : null}

        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="flex-1"
        >
          <Outlet />
        </motion.main>
      </div>

      <InviteCodeDialog
        key={`${isInviteCodeRequired ? 'open' : 'closed'}-${persistedInviteCode}`}
        error={error}
        initialInviteCode={persistedInviteCode}
        isOpen={isInviteCodeRequired}
        isSubmitting={status === 'registering'}
        onConfirm={(inviteCode) => {
          void completeRegistration(inviteCode)
        }}
        onSkip={() => {
          void completeRegistration()
        }}
      />
    </div>
  )
}
