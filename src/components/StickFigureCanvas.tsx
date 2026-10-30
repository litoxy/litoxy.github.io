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

    // 全帧骨骼包围盒（canvas 坐标），留 18% 边距
    // 兼容归一化坐标：若关键点都在 0–1.5 内，视为 1×1 坐标空间
    const rawMax = Math.max(
      ...frames.flatMap((f) => f.keypoints.map((k) => Math.max(k.x, k.y))),
    )
    const sw = rawMax <= 1.5 ? 1 : sourceWidth
    const sh = rawMax <= 1.5 ? 1 : sourceHeight
    const kx = w / (sw || w)
    const ky = h / (sh || h)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const f of frames) {
      for (const k of f.keypoints) {
        if (k.score < 0.25) continue
        const px = k.x * kx
        const py = k.y * ky
        if (px < minX) minX = px
        if (py < minY) minY = py
        if (px > maxX) maxX = px
        if (py > maxY) maxY = py
      }
    }
    let bbox: { x: number; y: number; w: number; h: number } | null = null
    if (maxX > minX && maxY > minY) {
      const padX = (maxX - minX) * 0.18
      const padY = (maxY - minY) * 0.18
      bbox = {
        x: minX - padX,
        y: minY - padY,
        w: maxX - minX + padX * 2,
        h: maxY - minY + padY * 2,
      }
    }

    const paint = (frame: SkeletonFrame, overlay?: SkeletonFrame) => {
      ctx.clearRect(0, 0, w, h)
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0f1712')
      g.addColorStop(1, '#24352c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // 取景：把包围盒放大居中，火柴人撑满画面而不是缩在角落
      ctx.save()
      if (bbox) {
        const zoom = Math.min(w / bbox.w, h / bbox.h, 4)
        ctx.translate((w - bbox.w * zoom) / 2 - bbox.x * zoom, (h - bbox.h * zoom) / 2 - bbox.y * zoom)
        ctx.scale(zoom, zoom)
      }
      if (overlay) {
        drawSkeleton(ctx, overlay, {
          width: w,
          height: h,
          sourceWidth: sw,
          sourceHeight: sh,
          color: overlayColor,
          lineWidth: 2.5,
        })
      }
      drawSkeleton(ctx, frame, {
        width: w,
        height: h,
        sourceWidth: sw,
        sourceHeight: sh,
        color,
        lineWidth: 3,
      })
      ctx.restore()
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