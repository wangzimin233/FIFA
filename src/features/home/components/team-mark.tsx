type TeamMarkProps = {
  alt: string
  emoji: string
  logo?: string
  className?: string
  imageClassName?: string
  fallbackClassName?: string
}

export function TeamMark({
  alt,
  emoji,
  logo,
  className = '',
  imageClassName = '',
  fallbackClassName = '',
}: TeamMarkProps) {
  if (logo) {
    return (
      <img
        src={logo}
        alt={alt}
        className={className || imageClassName}
      />
    )
  }

  return <span className={fallbackClassName || className}>{emoji}</span>
}
