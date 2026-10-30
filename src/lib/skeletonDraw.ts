import type { Keypoint, SkeletonFrame } from './types'

/** Stick-figure edges used for replay (head → limbs). */
export const BONES: [string, string][] = [
  ['left_shoulder', 'right_shoulder'],
  ['left_shoulder', 'left_elbow'],
  ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'],
  ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'],
  ['right_shoulder', 'right_hip'],
  ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'],
  ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'],
  ['right_knee', 'right_ankle'],
]

function find(kps: Keypoint[], name: string, min = 0.25) {
  return kps.find((k) => k.name === name && k.score >= min)
}

export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  frame: SkeletonFrame,
  opts: {
    color?: string
    lineWidth?: number
    mirror?: boolean
    width: number
    height: number
    /** Source video/canvas size if keypoints are in pixel space */
    sourceWidth?: number
    sourceHeight?: number
  },
) {
  const {
    color = '#C4A35A',
    lineWidth = 3,
    mirror = false,
    width,
    height,
    sourceWidth = width,
    sourceHeight = height,
  } = opts

  const sx = width / sourceWidth
  const sy = height / sourceHeight

  const map = (k: Keypoint) => {
    const x = k.x * sx
    return {
      x: mirror ? width - x : x,
      y: k.y * sy,
    }
  }

  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = lineWidth

  for (const [a, b] of BONES) {
    const ka = find(frame.keypoints, a)
    const kb = find(frame.keypoints, b)
    if (!ka || !kb) continue
    const pa = map(ka)
    const pb = map(kb)
    ctx.beginPath()
    ctx.moveTo(pa.x, pa.y)
    ctx.lineTo(pb.x, pb.y)
    ctx.stroke()
  }

  // Head from nose / ears
  const nose = find(frame.keypoints, 'nose')
  const ls = find(frame.keypoints, 'left_shoulder')
  const rs = find(frame.keypoints, 'right_shoulder')
  if (nose && ls && rs) {
    const p = map(nose)
    const shoulderW = Math.hypot(
      (ls.x - rs.x) * sx,
      (ls.y - rs.y) * sy,
    )
    const r = Math.max(8, shoulderW * 0.22)
    ctx.beginPath()
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Joint dots
  const joints = [
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ]
  for (const name of joints) {
    const k = find(frame.keypoints, name)
    if (!k) continue
    const p = map(k)
    ctx.beginPath()
    ctx.arc(p.x, p.y, lineWidth * 1.2, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

/** Rasterize one skeleton frame to a small JPEG data URL for history thumbnails. */
export function skeletonThumbnail(
  frame: SkeletonFrame,
  sourceWidth: number,
  sourceHeight: number,
  size: { w: number; h: number } = { w: 160, h: 120 },
): string {
  const canvas = document.createElement('canvas')
  canvas.width = size.w
  canvas.height = size.h
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, size.w, size.h)
  g.addColorStop(0, '#0f1712')
  g.addColorStop(1, '#24352c')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size.w, size.h)
  drawSkeleton(ctx, frame, {
    width: size.w,
    height: size.h,
    sourceWidth,
    sourceHeight,
    color: '#E8C872',
    lineWidth: 2,
  })
  return canvas.toDataURL('image/jpeg', 0.72)
}