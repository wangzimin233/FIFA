import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { marketCards } from '../home-data'

function ProbabilityRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - value / 100)

  return (
    <svg viewBox="0 0 120 120" className="h-16 w-16 shrink-0 sm:h-18 sm:w-18 lg:h-20 lg:w-20">
      <circle cx="60" cy="60" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r="42"
        fill="none"
        stroke="rgba(74,222,128,0.95)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="fill-[#f7fff1] text-[18px] font-semibold sm:text-[20px] lg:text-[22px]">
        {value}%
      </text>
      <text x="60" y="82" textAnchor="middle" className="fill-[#8e9488] text-[11px] font-semibold sm:text-[12px] lg:text-[13px]">
        是
      </text>
    </svg>
  )
}

export function MarketGrid() {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-4">
      {marketCards.map((card, index) => (
        <motion.article
          key={card.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03, duration: 0.22 }}
          className={[
            'rounded-[18px] border border-white/8 bg-panel px-3 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.14)] sm:px-3.5 sm:py-3.5',
          ].join(' ')}
        >
          {card.kind === 'list' ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/markets/${card.id}`)}
                className="flex w-full items-start justify-between gap-2.5 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[17px]">
                    {card.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[13px] font-semibold leading-tight text-ink sm:text-[14px]">
                      {card.title}
                    </h3>
                    {card.detailCount ? (
                      <p className="mt-0.5 text-[10px] text-ink-soft sm:text-[11px]">
                        详情中还有 {card.detailCount} 个候选项
                      </p>
                    ) : null}
                  </div>
                </div>
              </button>

              <div className="mt-5 grid gap-3">
                {card.candidates.slice(0, 2).map((candidate) => {
                  return (
                    <button
                      key={candidate.name}
                      type="button"
                      onClick={() =>
                        navigate(`/markets/${card.id}`, {
                          state: { preselectedCandidateName: candidate.name },
                        })
                      }
                      className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1.5 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-semibold text-ink sm:text-[14px]">
                          {candidate.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-ink-soft sm:text-[11px]">
                          {candidate.probability}%
                        </div>
                      </div>
                      <button
                        type="button"
                        className="flex h-8 w-[46px] items-center justify-center rounded-[11px] bg-emerald-500/18 px-0 text-center text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/30 sm:h-[34px] sm:w-[50px] sm:text-[12px]"
                      >
                        是.
                      </button>
                      <div className="flex h-8 w-[46px] items-center justify-center rounded-[11px] bg-rose-500/14 px-0 text-center text-[11px] font-semibold text-rose-300 sm:h-[34px] sm:w-[50px] sm:text-[12px]">
                        否.
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex items-center justify-between text-ink-soft">
                <span className="text-[11px] sm:text-[12px]">{card.volumeLabel}</span>
                <button type="button" className="text-[15px] sm:text-[17px]">
                  ⌑
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate(`/markets/${card.id}`)}
                className="flex w-full items-start justify-between gap-2.5 text-left"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white text-[17px]">
                    {card.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="h-[3rem] overflow-hidden text-[14px] font-semibold leading-snug text-ink [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] sm:h-[3.3rem] sm:text-[15px]">
                      {card.title}
                    </h3>
                  </div>
                </div>
                <ProbabilityRing value={card.probability} />
              </button>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className="rounded-[13px] bg-emerald-500/20 px-3 py-2.5 text-center text-[14px] font-semibold text-emerald-300 transition hover:bg-emerald-500/30 sm:text-[15px]"
                >
                  是
                </button>
                <div className="rounded-[13px] bg-rose-500/14 px-3 py-2.5 text-center text-[14px] font-semibold text-rose-300 sm:text-[15px]">
                  否
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-ink-soft">
                <span className="text-[11px] sm:text-[12px]">{card.volumeLabel}</span>
                <button type="button" className="text-[15px] sm:text-[17px]">
                  ⌑
                </button>
              </div>
            </>
          )}
        </motion.article>
      ))}

      <div className="flex justify-center pt-0.5 md:col-span-2 lg:col-span-4">
        <button
          type="button"
          className="rounded-full border border-white/8 bg-white/3 px-4.5 py-2 text-[12px] font-medium text-ink-soft transition hover:border-brand/20 hover:text-ink sm:px-5 sm:text-[13px]"
        >
          显示更多盘口
        </button>
      </div>
    </div>
  )
}
