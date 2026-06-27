export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/logos/aptama-logo.png"
      alt="Logo APTAMA"
      width={size}
      height={size}
      className={`rounded-lg ${className}`}
      loading="eager"
    />
  )
}
