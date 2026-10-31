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
 * 各维度的展示值域（覆盖大众 → 精英的大致范围）。
 * 两条轮廓都先把原始数值换算成「水平分」再画：
 *   - 数值越大越好的维度（步频、送髋…）：水平分 = (v - lo) / (hi - lo)
 *   - 数值越小越好的维度（垂直振幅）：反转，振幅越低半径越大
 * 这样雷达每一轴都是「越靠外 = 该维度越接近顶级水平」，
 * 普通跑者不会在某些原始量上「看起来超过」精英，运动员轮廓也
 * 落在其实际水平的位置而非拉满。
 */
const DOMAIN: Record<keyof PostureFeatures, [number, number]> = {
  cadence: [150, 200],
  bodyLean: [3, 12],
  hipExtension: [0.5, 1.0],
  armSwing: [0.3, 0.8],
  kneeFlexion: [0.4, 0.9],
  verticalOscillation: [4, 12],
  symmetry: [0.7, 1.0],
}

const R_MIN = 0.14 // 水平分下限处的半径比例，避免贴圆心

const HIGHER_BETTER = new Map(
  METRIC_META.map((m) => [m.key, m.higherBetter] as const),
)

/** 原始数值 → 水平分（0~1，越大越好），差方向维度自动反转 */
function quality(v: number, [lo, hi]: [number, number], higherIsBetter: boolean): number {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)))
  return Math.max(R_MIN, higherIsBetter ? t : 1 - t)
}

/**
 * 七维跑姿水平对照图。
 * 虚线轮廓 = 参照运动员；实心区域 = 你的水平。
 * 每一轴越靠外水平越高；实心凹进虚线的维度即你的差距所在。
 */
export function RadarChart({ features, reference, referenceName }: Props) {
  const cx = 130
  const cy = 122
  const n = METRIC_META.length
  const R = 94 // 满分（水平分 1）半径
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) =>
    `${(cx + Math.cos(angle(i)) * r).toFixed(1)},${(cy + Math.sin(angle(i)) * r).toFixed(1)}`

  const polyOf = (f: PostureFeatures) =>
    METRIC_META.map((m, i) =>
      pt(i, R * quality(f[m.key], DOMAIN[m.key], HIGHER_BETTER.get(m.key) ?? true)),
    ).join(' ')

  const refPoly = polyOf(reference)
  const userPoly = polyOf(features)

  return (
    <svg
      className="radar"
      viewBox="0 0 260 244"
      role="img"
      aria-label={`七维跑姿水平对照图，参照为${referenceName}`}
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
