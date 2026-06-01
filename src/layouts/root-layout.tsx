import { useAppKit } from '@reown/appkit/react'
import { motion } from 'motion/react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAccount } from 'wagmi'

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

export function RootLayout() {
  const location = useLocation()
  const { open } = useAppKit()
  const { address, isConnected } = useAccount()

  const walletLabel = isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '连接钱包'

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
                FIFA
              </div>
              <div className="mt-0.5 truncate text-[10px] font-semibold text-ink sm:text-[12px]">
                World Cup 2026
              </div>
            </div>
          </NavLink>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => open()}
              className="inline-flex h-9 items-center justify-center rounded-[15px] border border-brand/20 bg-brand px-3 text-[10px] font-semibold text-black shadow-[0_10px_24px_rgba(0,255,65,0.2)] transition hover:bg-[#19ff53] sm:h-10 sm:px-4 sm:text-[11px]"
            >
              {walletLabel}
            </button>

            <NavLink
              to="/profile"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[15px] border border-white/10 bg-white/[0.04] text-ink-soft transition hover:border-white/16 hover:text-ink sm:h-10 sm:w-10"
              aria-label="个人中心"
            >
              <UserGlyph />
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-2.5 pb-2.5 pt-[72px] sm:px-4 sm:pb-4 sm:pt-[84px] lg:px-5">

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
    </div>
  )
}
