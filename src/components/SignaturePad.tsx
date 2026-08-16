import { useEffect, useRef, useState, useCallback } from 'react'

interface SignaturePadProps {
  onChange: (blob: Blob | null) => void
  height?: number
  disabled?: boolean
}

interface Point {
  x: number
  y: number
  time: number
  width: number
}

const MIN_WIDTH = 1.8
const MAX_WIDTH = 3.6
const STROKE_COLOR = '#0f172a' // Solid dark ink color

export function SignaturePad({ onChange, height = 200, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  // Points tracking for smooth Bézier interpolation
  const pointsRef = useRef<Point[]>([])
  const lastMidPointRef = useRef<{ x: number; y: number } | null>(null)
  const lastWidthRef = useRef<number>((MIN_WIDTH + MAX_WIDTH) / 2)
  const strokeCountRef = useRef(0)

  const getCanvasCoords = useCallback((e: PointerEvent | React.PointerEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }, [])

  const emitBlob = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => onChange(blob), 'image/png')
  }, [onChange])

  const setupContext = useCallback((ctx: CanvasRenderingContext2D, dpr: number) => {
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = STROKE_COLOR
    ctx.fillStyle = STROKE_COLOR
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
  }, [])

  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const dpr = window.devicePixelRatio || 1
    const prev = canvas.width > 0 ? canvas.toDataURL() : null

    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    setupContext(ctx, dpr)

    if (prev) {
      const img = new Image()
      img.onload = () => {
        const currentCtx = canvas.getContext('2d')
        if (currentCtx) {
          currentCtx.drawImage(img, 0, 0, rect.width, rect.height)
        }
      }
      img.src = prev
    }
  }, [setupContext])

  useEffect(() => {
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [resize])

  const calculateWidth = (p1: { x: number; y: number; time: number }, p2: { x: number; y: number; time: number }): number => {
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const timeDelta = Math.max(1, p2.time - p1.time)
    const velocity = dist / timeDelta
    // Faster velocity -> thinner line, slower -> thicker line
    const targetWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, MAX_WIDTH - velocity * 0.7))
    // Smooth transition from previous width
    const smoothed = lastWidthRef.current * 0.6 + targetWidth * 0.4
    lastWidthRef.current = smoothed
    return smoothed
  }

  const drawSegment = (p1: Point, p2: Point) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const midPoint = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    }

    const lastMid = lastMidPointRef.current ?? p1

    ctx.beginPath()
    ctx.lineWidth = (p1.width + p2.width) / 2
    ctx.moveTo(lastMid.x, lastMid.y)
    ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y)
    ctx.stroke()

    lastMidPointRef.current = midPoint
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.setPointerCapture(e.pointerId)
    isDrawing.current = true
    strokeCountRef.current = 0

    const pos = getCanvasCoords(e)
    const initialPoint: Point = {
      x: pos.x,
      y: pos.y,
      time: performance.now(),
      width: (MIN_WIDTH + MAX_WIDTH) / 2,
    }

    pointsRef.current = [initialPoint]
    lastMidPointRef.current = null
    lastWidthRef.current = initialPoint.width
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || disabled) return

    const rawEvent = e.nativeEvent
    // Use coalesced events if available for ultra-smooth 120Hz/240Hz fidelity on mobile
    const events: (PointerEvent | React.PointerEvent)[] =
      'getCoalescedEvents' in rawEvent && typeof rawEvent.getCoalescedEvents === 'function'
        ? rawEvent.getCoalescedEvents()
        : [e]

    for (const ev of events) {
      const pos = getCanvasCoords(ev)
      const now = performance.now()
      const pts = pointsRef.current
      const prevPoint = pts[pts.length - 1]

      if (prevPoint) {
        // Ignore tiny movements (< 1.5px) to reduce noise
        if (Math.hypot(pos.x - prevPoint.x, pos.y - prevPoint.y) < 1.5) {
          continue
        }

        const width = calculateWidth(prevPoint, { x: pos.x, y: pos.y, time: now })
        const currentPoint: Point = {
          x: pos.x,
          y: pos.y,
          time: now,
          width,
        }

        pts.push(currentPoint)
        strokeCountRef.current++

        if (pts.length >= 2) {
          const p1 = pts[pts.length - 2]
          const p2 = pts[pts.length - 1]
          drawSegment(p1, p2)
        }
      }
    }

    if (!hasSignature) setHasSignature(true)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    isDrawing.current = false

    const canvas = canvasRef.current
    if (canvas && e.pointerId) {
      try {
        canvas.releasePointerCapture(e.pointerId)
      } catch {
        // ignore if already released
      }
    }

    const pts = pointsRef.current
    const ctx = canvas?.getContext('2d')

    // Handle tap / dot for letters like 'i' or periods
    if (pts.length <= 2 && ctx && pts.length > 0) {
      const p = pts[0]
      ctx.beginPath()
      ctx.arc(p.x, p.y, (MIN_WIDTH + MAX_WIDTH) / 3.5, 0, Math.PI * 2)
      ctx.fill()
      if (!hasSignature) setHasSignature(true)
    }

    pointsRef.current = []
    lastMidPointRef.current = null

    emitBlob()
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)

    pointsRef.current = []
    lastMidPointRef.current = null
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <div
        className="relative rounded-2xl border-2 border-dashed border-white/20 overflow-hidden bg-white shadow-inner touch-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full cursor-crosshair touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {!hasSignature && (
          <div className="pointer-events-none select-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-400">
            <span className="text-xl">✍️</span>
            <span className="text-xs font-medium">Tanda tangan di sini</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-text-muted">
          Gunakan jari atau stylus untuk tanda tangan yang rapi.
        </span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature || disabled}
          className="text-xs font-medium text-text-muted hover:text-danger transition disabled:opacity-30 active:scale-95"
        >
          🗑️ Bersihkan
        </button>
      </div>
    </div>
  )
}
