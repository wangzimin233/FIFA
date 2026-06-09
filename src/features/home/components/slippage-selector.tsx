import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { getSlippageOptions } from '../api/get-slippage-options'
import { useOrderStore } from '../order-store'

function formatSlippage(value: number) {
  return `${Math.round(value * 10000) / 100}%`
}

export function SlippageSelector({ mobile = false }: { mobile?: boolean }) {
  const { t } = useTranslation()
  const { slippage, setSlippage } = useOrderStore()
  const { data: options = [], isError, isLoading } = useQuery({
    queryKey: ['world-cup-slippage-options'],
    queryFn: getSlippageOptions,
    staleTime: 1000 * 60 * 10,
  })
  const normalizedOptions = useMemo(
    () => Array.from(new Set(options)).sort((left, right) => left - right),
    [options],
  )

  useEffect(() => {
    const defaultOption = normalizedOptions[0]
    if (defaultOption === undefined) {
      return
    }

    if (slippage === null || !normalizedOptions.includes(slippage)) {
      setSlippage(defaultOption)
    }
  }, [normalizedOptions, setSlippage, slippage])

  const statusText = isLoading
    ? t('orderPanel.slippageLoading')
    : isError || normalizedOptions.length === 0
      ? t('orderPanel.slippageUnavailable')
      : null

  return (
    <div className={mobile ? 'mt-5' : 'mt-3.5'}>
      <div className={mobile ? 'mb-2.5 flex items-center justify-center' : 'mb-2 flex items-center justify-between'}>
        <span className={mobile ? 'text-[13px] font-semibold text-ink-soft' : 'text-[11px] font-semibold text-ink-soft'}>
          {t('orderPanel.slippageLabel')}
        </span>
        {!mobile && slippage !== null ? (
          <span className="text-[11px] font-semibold text-brand">{formatSlippage(slippage)}</span>
        ) : null}
      </div>

      {statusText ? (
        <div className={mobile
          ? 'mx-auto flex h-11 max-w-[320px] items-center justify-center rounded-[14px] border border-white/8 bg-white/4 px-3 text-[13px] font-medium text-ink-soft'
          : 'flex h-9 items-center justify-center rounded-[12px] border border-white/8 bg-white/4 px-3 text-[11px] font-medium text-ink-soft'
        }>
          {statusText}
        </div>
      ) : (
        <div className={mobile ? 'mx-auto grid max-w-[320px] grid-cols-3 gap-2' : 'grid grid-cols-3 gap-2'}>
          {normalizedOptions.map((option) => {
            const isSelected = slippage === option

            return (
              <button
                key={option}
                type="button"
                onClick={() => setSlippage(option)}
                className={[
                  mobile
                    ? 'h-11 rounded-[14px] text-[14px] font-semibold'
                    : 'h-9 rounded-[12px] text-[11px] font-semibold',
                  'border transition',
                  isSelected
                    ? 'border-brand/40 bg-brand/15 text-brand'
                    : 'border-white/8 bg-white/4 text-ink-soft hover:border-brand/25 hover:text-ink',
                ].join(' ')}
              >
                {formatSlippage(option)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
