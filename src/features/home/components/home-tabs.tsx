import { NavLink } from 'react-router-dom'
import { homeTabs } from '../home-data'

export function HomeTabs() {
  return (
    <div className="inline-flex rounded-[16px] border border-white/8 bg-white/4 p-0.75">
      {homeTabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={`/${tab.key}`}
          className={({ isActive }) =>
            [
              'min-w-[74px] rounded-[12px] px-3 py-1.75 text-center text-[11px] font-semibold transition sm:min-w-[82px] sm:px-3.5 sm:py-2 sm:text-[12px]',
              isActive
                ? 'bg-brand text-black shadow-[0_12px_28px_rgba(0,255,65,0.18)]'
                : 'text-ink-soft hover:text-ink',
            ].join(' ')
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  )
}
