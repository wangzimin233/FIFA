import { useAppKit } from '@reown/appkit/react'
import { AnimatePresence } from 'motion/react'
import { motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom'
import { GlobeIcon } from '../components/icons'
import {
  loadInviteCodeFromSession,
  saveInviteCodeToSession,
} from '../features/wallet-auth/storage'
import { useWalletAuth } from '../features/wallet-auth/use-wallet-auth'

const languageOptions = [
  { code: 'zh', labelKey: 'language.options.zh' },
  { code: 'en', labelKey: 'language.options.en' },
] as const

function UserGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 sm:h-6.5 sm:w-6.5">
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
  const { t } = useTranslation()
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
              {t('layout.invite.eyebrow')}
            </div>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-ink">
              {t('layout.invite.title')}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-ink-soft">
              {t('layout.invite.description')}
            </p>

            <label className="mt-4 block">
              <span className="mb-2 block text-[12px] font-medium text-ink-soft">
                {t('layout.invite.codeLabel')}
              </span>
              <input
                value={inviteCode}
                onChange={(event) => {
                  setInviteCode(event.target.value.toUpperCase())
                  if (validationMessage) {
                    setValidationMessage('')
                  }
                }}
                placeholder={t('layout.invite.placeholder')}
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
                {t('layout.invite.skip')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const normalizedInviteCode = inviteCode.trim().toUpperCase()
                  if (!normalizedInviteCode) {
                    setValidationMessage(t('layout.invite.validationRequired'))
                    return
                  }

                  onConfirm(normalizedInviteCode)
                }}
                disabled={isSubmitting}
                className="inline-flex h-11 items-center justify-center rounded-[16px] border border-brand/20 bg-brand text-[13px] font-semibold text-black transition hover:bg-[#19ff53] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? t('layout.invite.submitting') : t('layout.invite.continue')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function LanguageSwitcher() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const currentLanguage = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'zh'
  const currentLanguageLabel = t(`language.options.${currentLanguage}`)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  const selectLanguage = (language: (typeof languageOptions)[number]['code']) => {
    const search = new URLSearchParams(location.search)
    search.set('lng', language)
    void i18n.changeLanguage(language)
    navigate(
      {
        pathname: location.pathname,
        search: `?${search.toString()}`,
      },
      { replace: true },
    )
    setIsOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('language.label')}
        className={[
          'inline-flex h-9 items-center justify-center gap-1.5 rounded-[15px] border px-2.5 text-[11px] font-semibold transition sm:h-10 sm:px-3',
          isOpen
            ? 'border-brand/30 bg-brand/12 text-brand shadow-[0_10px_24px_rgba(0,255,65,0.12)]'
            : 'border-white/10 bg-white/[0.04] text-ink-soft hover:border-white/16 hover:text-ink',
        ].join(' ')}
      >
        <GlobeIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">{currentLanguageLabel}</span>
        <span aria-hidden="true" className="hidden text-[10px] leading-none text-current/75 sm:inline">
          ▾
        </span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className="absolute right-0 top-[calc(100%+8px)] z-[70] w-40 overflow-hidden rounded-[18px] border border-white/10 bg-[#171918] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.42)]"
            role="listbox"
            aria-label={t('language.label')}
          >
            {languageOptions.map((option) => {
              const isSelected = option.code === currentLanguage

              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => selectLanguage(option.code)}
                  role="option"
                  aria-selected={isSelected}
                  className={[
                    'flex h-10 w-full items-center justify-between rounded-[13px] px-3 text-left text-[12px] font-semibold transition',
                    isSelected
                      ? 'bg-brand/12 text-brand'
                      : 'text-ink-soft hover:bg-white/[0.05] hover:text-ink',
                  ].join(' ')}
                >
                  <span>{t(option.labelKey)}</span>
                  {isSelected ? <span className="text-[13px] leading-none">✓</span> : null}
                </button>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function RootLayout() {
  const location = useLocation()
  const { t } = useTranslation()
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
            <LanguageSwitcher />

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
              aria-label={t('profile.title')}
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
      <ScrollRestoration />
    </div>
  )
}
