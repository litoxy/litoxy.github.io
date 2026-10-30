import { METRIC_META } from '../lib/comparison'
import type { PostureFeatures } from '../lib/types'

interface Props {
  /** 用户实际数值 */
  features: PostureFeatures
  /** 参照运动员的数值 */
  reference: PostureFeatures
  referenceName: string
}

/**
 * 各维度的雷达显示域（绝对值域）。
 * 两名跑者都按同一值域映射，轮廓反映真实数值大小：
 * 运动员的雷达不是拉满的六边形，而是在各维落到其实际水平的位置。
 */
const DOMAIN: Record<keyof PostureFeatures, [number, number]> = {
  cadence: [150, 200],
  bodyLean: [2, 14],
  hipExtension: [0.5, 1.0],
  armSwing: [0.3, 0.8],
  kneeFlexion: [0.4, 0.9],
  verticalOscillation: [4, 12],
  symmetry: [0.7, 1.0],
}

const R_MIN = 0.14 // 值域下限处的半径比例，避免贴圆心

function norm(v: number, [lo, hi]: [number, number]): number {
  return Math.max(R_MIN, Math.min(1, (v - lo) / (hi - lo)))
}

/**
 * 七维跑姿对照图。
 * 虚线轮廓 = 参照运动员（按同一绝对值域映射）；
 * 实心区域 = 你的实际轮廓。两形重叠处即为持平，凹凸即差距。
 */
export function RadarChart({ features, reference, referenceName }: Props) {
  const cx = 130
  const cy = 122
  const n = METRIC_META.length
  const R = 94 // 值域上限半径（撑满画布，减少四周留白）
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) =>
    `${(cx + Math.cos(angle(i)) * r).toFixed(1)},${(cy + Math.sin(angle(i)) * r).toFixed(1)}`

  const refPoly = METRIC_META.map((m, i) =>
    pt(i, R * norm(reference[m.key], DOMAIN[m.key])),
  ).join(' ')

  const userPoly = METRIC_META.map((m, i) =>
    pt(i, R * norm(features[m.key], DOMAIN[m.key])),
  ).join(' ')

  return (
    <svg
      className="radar"
      viewBox="0 0 260 244"
      role="img"
      aria-label={`七维跑姿对照图，参照为${referenceName}`}
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon
          key={r}
          className="radar-grid"
          points={METRIC_META.map((_, i) => pt(i, R * r)).join(' ')}
        />
      ))}
      {METRIC_META.map((_, i) => (
        <line
          key={i}
          className="radar-spoke"
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(angle(i)) * R}
          y2={cy + Math.sin(angle(i)) * R}
        />
      ))}
      <polygon className="radar-ref" points={refPoly} />
      <polygon className="radar-user" points={userPoly} />
      {METRIC_META.map((m, i) => {
        const lx = cx + Math.cos(angle(i)) * (R + 17)
        const ly = cy + Math.sin(angle(i)) * (R + 17)
        return (
          <text
            key={m.key}
            className="radar-label"
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {m.short}
          </text>
        )
      })}
    </svg>
  )
}
