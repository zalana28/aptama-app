import { useEffect, useRef, useState, useCallback } from 'react'

interface SignaturePadProps {
  onChange: (blob: Blob | null) => void
  height?: number
  disabled?: boolean
}

export function SignaturePad({ onChange, height = 200, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  function getPos(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const emitBlob = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => onChange(blob), 'image/png')
  }, [onChange])

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return
    const dpr = window.devicePixelRatio || 1
    const prev = canvas.width > 0 ? canvas.toDataURL() : null
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#1f2937'
    if (prev) {
      const img = new Image()
      img.onload = () => {
        const ctx2 = canvas.getContext('2d')!
        ctx2.drawImage(img, 0, 0, rect.width, rect.height)
      }
      img.src = prev
    }
  }, [])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  function start(e: React.PointerEvent) {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function move(e: React.PointerEvent) {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasSignature) setHasSignature(true)
  }

  function end() {
    if (!drawing.current) return
    drawing.current = false
    emitBlob()
  }

  function clear() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-xl border-2 border-dashed border-white/20 overflow-hidden touch-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full bg-white cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
        />
        {!hasSignature && (
          <span className="pointer-events-none select-none absolute inset-0 grid place-items-center text-sm text-gray-400">
            ✍️ Tanda tangan di sini
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature || disabled}
          className="text-xs text-text-muted hover:text-danger transition disabled:opacity-40"
        >
          🗑️ Bersihkan
        </button>
      </div>
    </div>
  )
}
