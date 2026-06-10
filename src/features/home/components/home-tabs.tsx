import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { homeTabs } from '../home-data'

export function HomeTabs() {
  const { t } = useTranslation()

  return (
    <div className="inline-flex rounded-[18px] border border-white/8 bg-white/4 p-1">
      {homeTabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/${tab.key}`}
          className={({ isActive }) =>
            [
              'min-w-[92px] rounded-[14px] px-4 py-2.5 text-center text-[13px] font-semibold transition sm:min-w-[104px] sm:px-5 sm:py-3 sm:text-[14px]',
              isActive
                ? 'bg-brand text-black shadow-[0_12px_28px_rgba(0,255,65,0.18)]'
                : 'text-ink-soft hover:text-ink',
            ].join(' ')
          }
        >
          {t(`home.tabs.${tab.key}`)}
        </NavLink>
      ))}
    </div>
  )
}
