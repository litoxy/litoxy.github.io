import { useEffect, useRef } from 'react'
import { drawSkeleton } from '../lib/skeletonDraw'
import type { SkeletonFrame } from '../lib/types'

interface Props {
  frames: SkeletonFrame[]
  playing?: boolean
  fps?: number
  color?: string
  sourceWidth: number
  sourceHeight: number
  className?: string
  overlayFrames?: SkeletonFrame[]
  overlayColor?: string
}

export function StickFigureCanvas({
  frames,
  playing = true,
  fps = 15,
  color = '#C4A35A',
  sourceWidth,
  sourceHeight,
  className,
  overlayFrames,
  overlayColor = 'rgba(61, 126, 166, 0.55)',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const idxRef = useRef(0)

  useEffect(() => {
    idxRef.current = 0
    const canvas = canvasRef.current
    if (!canvas || !frames.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Letterbox to source aspect inside fixed CSS box
    const maxW = 360
    const maxH = 480
    const aspect =
      sourceWidth > 0 && sourceHeight > 0
        ? sourceWidth / sourceHeight
        : 3 / 4
    let w = maxW
    let h = Math.round(w / aspect)
    if (h > maxH) {
      h = maxH
      w = Math.round(h * aspect)
    }
    canvas.width = w
    canvas.height = h

    let raf = 0
    let last = 0
    const interval = 1000 / fps

    const paint = (frame: SkeletonFrame, overlay?: SkeletonFrame) => {
      ctx.clearRect(0, 0, w, h)
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0f1712')
      g.addColorStop(1, '#24352c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      if (overlay) {
        drawSkeleton(ctx, overlay, {
          width: w,
          height: h,
          sourceWidth,
          sourceHeight,
          color: overlayColor,
          lineWidth: 2.5,
        })
      }
      drawSkeleton(ctx, frame, {
        width: w,
        height: h,
        sourceWidth,
        sourceHeight,
        color,
        lineWidth: 3,
      })
    }

    paint(frames[0], overlayFrames?.[0])

    if (!playing) return

    const tick = (t: number) => {
      if (t - last >= interval) {
        last = t
        idxRef.current = (idxRef.current + 1) % frames.length
        const i = idxRef.current
        paint(
          frames[i],
          overlayFrames?.[Math.min(i, (overlayFrames?.length ?? 1) - 1)],
        )
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    frames,
    playing,
    fps,
    color,
    sourceWidth,
    sourceHeight,
    overlayFrames,
    overlayColor,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-label="Skeleton replay"
    />
  )
}