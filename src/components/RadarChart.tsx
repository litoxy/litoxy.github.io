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
 * 七维跑姿对照图。
 * 虚线外圈 = 参照运动员的轮廓（各自缩放到自身半径，作为该维度基准）；
 * 实心区域 = 你的实际轮廓，相对基准按比例缩放：内凹 = 落后，外凸 = 超出。
 */
export function RadarChart({ features, reference, referenceName }: Props) {
  const cx = 130
  const cy = 124
  const n = METRIC_META.length
  const R = 82 // 基准半径
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) =>
    `${(cx + Math.cos(angle(i)) * r).toFixed(1)},${(cy + Math.sin(angle(i)) * r).toFixed(1)}`

  const refPoly = METRIC_META.map((_, i) => pt(i, R)).join(' ')

  // 你的轮廓：以参照为基准，按比例映射到 0.18R–1.35R 区间
  const userPoly = METRIC_META.map((m, i) => {
    const refVal = Math.abs(reference[m.key]) || 1
    const ratio = features[m.key] / refVal
    const mapped = Math.max(0.18, Math.min(1.35, ratio))
    return pt(i, R * mapped)
  }).join(' ')

  return (
    <svg
      className="radar"
      viewBox="0 0 260 250"
      role="img"
      aria-label={`七维跑姿对照图，基准为${referenceName}`}
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
        const lx = cx + Math.cos(angle(i)) * (R + 19)
        const ly = cy + Math.sin(angle(i)) * (R + 19)
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
