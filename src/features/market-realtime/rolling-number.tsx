import { useEffect, useRef, useState } from 'react'

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

type DigitRollerProps = {
  digit: string
}

function DigitRoller({ digit }: DigitRollerProps) {
  const index = DIGITS.indexOf(digit)
  const previousIndexRef = useRef(index)
  const [currentIndex, setCurrentIndex] = useState(index)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (index === previousIndexRef.current) {
      return
    }

    previousIndexRef.current = index
    setAnimated(true)
    setCurrentIndex(index)
  }, [index])

  if (index < 0) {
    return <span>{digit}</span>
  }

  return (
    <span className="inline-block h-[1em] overflow-hidden align-bottom leading-none">
      <span
        className="flex flex-col will-change-transform"
        style={{
          transform: `translateY(-${currentIndex}em)`,
          transition: animated ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        }}
        onTransitionEnd={() => setAnimated(false)}
      >
        {DIGITS.map((item) => (
          <span key={item} className="block h-[1em] leading-none">
            {item}
          </span>
        ))}
      </span>
    </span>
  )
}

export function RollingNumber({
  value,
  className,
}: {
  value: string | number
  className?: string
}) {
  const displayValue = String(value)

  return (
    <span className={['inline-flex items-baseline tabular-nums', className].filter(Boolean).join(' ')}>
      {displayValue.split('').map((char, index) =>
        DIGITS.includes(char) ? (
          <DigitRoller key={index} digit={char} />
        ) : (
          <span key={index}>{char}</span>
        ),
      )}
    </span>
  )
}
