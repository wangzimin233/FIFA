import { motion } from 'motion/react'
import { HomeBanner } from '../features/home/components/home-banner'
import { HomeTabs } from '../features/home/components/home-tabs'
import { MarketGrid } from '../features/home/components/market-grid'
import { MatchList } from '../features/home/components/match-list'
import { MobileOrderDrawer } from '../features/home/components/mobile-order-drawer'
import { OrderPanel } from '../features/home/components/order-panel'
import type { HomeTab } from '../features/home/home-data'

export function DashboardPage({ tab }: { tab: HomeTab }) {
  return (
    <div className="grid gap-3.5 sm:gap-4">
      <HomeBanner />

      <div className="flex items-center">
        <HomeTabs />
      </div>

      {tab === 'matches' ? (
        <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.4fr)_300px] lg:gap-4">
          <MatchList />
          <div className="hidden lg:sticky lg:top-[84px] lg:block lg:self-start">
            <OrderPanel />
          </div>
          <MobileOrderDrawer />
        </div>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="grid gap-3.5"
        >
          <MarketGrid />
        </motion.section>
      )}
    </div>
  )
}
