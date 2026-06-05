import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'

export function HomeBanner() {
  const { t } = useTranslation()

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="relative overflow-hidden rounded-[24px] border border-white/8 bg-panel px-4 py-4.5 shadow-[0_20px_48px_rgba(0,0,0,0.18)] sm:px-5 sm:py-5"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,255,65,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.08),transparent_30%)]" />
      <div className="relative max-w-3xl">
        <h1 className="max-w-2xl text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">
          {t('home.banner.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-5 text-ink-soft sm:text-[13px] sm:leading-5.5">
          {t('home.banner.description')}
        </p>
      </div>
    </motion.section>
  )
}
