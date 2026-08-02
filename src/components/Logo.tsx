const LOGO_SRCSET = [
  '/logos/aptama-logo-96.png 96w',
  '/logos/aptama-logo-128.png 128w',
  '/logos/aptama-logo-192.png 192w',
  '/logos/aptama-logo-256.png 256w',
].join(', ')

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logos/aptama-logo-192.png"
      srcSet={LOGO_SRCSET}
      sizes={`${size}px`}
      alt="Logo APTAMA"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      loading="eager"
    />
  )
}
