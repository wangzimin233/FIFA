import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function GlobeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z" />
      <path d="M3 12h18" />
      <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" />
    </svg>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="m12 3l8 4.5L12 12L4 7.5L12 3Z" />
      <path d="m4 12.5l8 4.5l8-4.5" />
      <path d="m4 17l8 4l8-4" />
    </svg>
  )
}

export function PulseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M3 12h4l2.5-5L14 17l2.5-5H21" />
    </svg>
  )
}

export function WalletIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M19 9h-4a2 2 0 1 0 0 4h4" />
      <path d="M6.5 5v14" />
    </svg>
  )
}

export function CopyIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M5 15.5V6.8A1.8 1.8 0 0 1 6.8 5H15.5" />
    </svg>
  )
}
