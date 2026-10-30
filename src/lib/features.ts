import type { Keypoint, PostureFeatures, SkeletonFrame } from './types'

function kp(frame: SkeletonFrame, name: string): Keypoint | undefined {
  return frame.keypoints.find((k) => k.name === name && k.score > 0.3)
}

function mid(a: Keypoint, b: Keypoint) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angleDeg(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
) {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (mag < 1e-6) return 0
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI
}

function torsoLen(frame: SkeletonFrame): number {
  const ls = kp(frame, 'left_shoulder')
  const rs = kp(frame, 'right_shoulder')
  const lh = kp(frame, 'left_hip')
  const rh = kp(frame, 'right_hip')
  if (!ls || !rs || !lh || !rh) return 0
  return dist(mid(ls, rs), mid(lh, rh))
}

function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/** Count local minima in a 1D series (e.g. ankle height peaks = foot contacts). */
function countMinima(ys: number[]): number {
  let n = 0
  for (let i = 1; i < ys.length - 1; i++) {
    if (ys[i] < ys[i - 1] && ys[i] < ys[i + 1]) n++
  }
  return n
}

/** Estimate posture features; distances normalized by median torso length. */
export function extractFeatures(frames: SkeletonFrame[]): PostureFeatures {
  if (frames.length < 4) {
    return {
      cadence: 0,
      bodyLean: 0,
      hipExtension: 0.5,
      armSwing: 0.4,
      kneeFlexion: 0.5,
      verticalOscillation: 0,
      symmetry: 0.8,
    }
  }

  const durationSec = Math.max(
    0.5,
    (frames[frames.length - 1].timestampMs - frames[0].timestampMs) / 1000,
  )

  const scale =
    median(frames.map(torsoLen).filter((v) => v > 1)) || 100

  // Separate left/right ankle minima ≈ foot strikes; cadence = strikes/min
  const leftAnkleY: number[] = []
  const rightAnkleY: number[] = []
  for (const f of frames) {
    const la = kp(f, 'left_ankle')
    const ra = kp(f, 'right_ankle')
    if (la) leftAnkleY.push(la.y)
    if (ra) rightAnkleY.push(ra.y)
  }
  const strikes =
    countMinima(leftAnkleY) + countMinima(rightAnkleY)
  const rawCadence = (strikes / durationSec) * 60
  // Only clamp when we actually detected motion; else report 0
  const cadence =
    strikes < 2
      ? 0
      : Math.round(Math.min(220, Math.max(120, rawCadence)))

  const leans: number[] = []
  const hipYs: number[] = []
  const armAmps: number[] = []
  const leftKnee: number[] = []
  const rightKnee: number[] = []
  const leftWristX: number[] = []
  const rightWristX: number[] = []

  for (const f of frames) {
    const ls = kp(f, 'left_shoulder')
    const rs = kp(f, 'right_shoulder')
    const lh = kp(f, 'left_hip')
    const rh = kp(f, 'right_hip')
    const lk = kp(f, 'left_knee')
    const rk = kp(f, 'right_knee')
    const la = kp(f, 'left_ankle')
    const ra = kp(f, 'right_ankle')
    const lw = kp(f, 'left_wrist')
    const rw = kp(f, 'right_wrist')
    const le = kp(f, 'left_elbow')
    const re = kp(f, 'right_elbow')

    if (ls && rs && lh && rh) {
      const shoulder = mid(ls, rs)
      const hip = mid(lh, rh)
      const dx = shoulder.x - hip.x
      const dy = hip.y - shoulder.y
      leans.push((Math.atan2(dx, dy) * 180) / Math.PI)
      hipYs.push(hip.y)
    }

    if (lh && lk && la) leftKnee.push(180 - angleDeg(lh, lk, la))
    if (rh && rk && ra) rightKnee.push(180 - angleDeg(rh, rk, ra))
    if (ls && le && lw && lh) {
      armAmps.push(dist(ls, lw) / Math.max(1, dist(ls, lh)))
    }
    if (rs && re && rw && rh) {
      armAmps.push(dist(rs, rw) / Math.max(1, dist(rs, rh)))
    }
    if (lw) leftWristX.push(lw.x)
    if (rw) rightWristX.push(rw.x)
  }

  const avg = (xs: number[]) =>
    xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : 0
  const range = (xs: number[]) =>
    xs.length ? Math.max(...xs) - Math.min(...xs) : 0

  const bodyLean = Math.abs(avg(leans))
  // Hip bounce as fraction of torso → rough cm-like scale (~torso≈50cm)
  const verticalOscillation =
    Math.round((range(hipYs) / scale) * 50 * 10) / 10

  const allKnee = [...leftKnee, ...rightKnee]
  const kneeFlexion = allKnee.length
    ? Math.min(1, Math.max(0.2, avg(allKnee.map((d) => d / 120))))
    : 0.5

  const hipExtension = Math.min(
    1,
    Math.max(
      0.35,
      0.55 + kneeFlexion * 0.25 - Math.min(0.25, verticalOscillation / 40),
    ),
  )

  const wristSwing = (range(leftWristX) + range(rightWristX)) / (2 * scale)
  const armSwing = Math.min(
    1,
    Math.max(0.15, avg(armAmps) * 0.45 + wristSwing * 0.35),
  )

  const leftMean = avg(leftKnee)
  const rightMean = avg(rightKnee)
  const symmetry =
    leftKnee.length && rightKnee.length
      ? Math.min(1, Math.max(0, 1 - Math.abs(leftMean - rightMean) / 40))
      : 0.8

  return {
    cadence,
    bodyLean: Math.round(bodyLean * 10) / 10,
    hipExtension: Math.round(hipExtension * 100) / 100,
    armSwing: Math.round(armSwing * 100) / 100,
    kneeFlexion: Math.round(kneeFlexion * 100) / 100,
    verticalOscillation,
    symmetry: Math.round(symmetry * 100) / 100,
  }
}

export function midStrideFrameIndex(frames: SkeletonFrame[]): number {
  if (!frames.length) return 0
  return Math.floor(frames.length / 2)
}