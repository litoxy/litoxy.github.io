import type { PostureFeatures } from '../lib/types'

const AXES = [
  { key: 'cadence', label: '步频' },
  { key: 'bodyLean', label: '前倾' },
  { key: 'hipExtension', label: '送髋' },
  { key: 'armSwing', label: '摆臂' },
  { key: 'kneeFlexion', label: '屈膝' },
  { key: 'verticalOscillation', label: '振幅' },
  { key: 'symmetry', label: '对称' },
] as const

interface Props {
  /** 用户相对所选参考跑者的逐维得分（0–100） */
  perMetric: Record<keyof PostureFeatures, number>
  referenceName: string
}

/** 七维跑姿雷达图：虚线外圈为参考跑者基准（满分轮廓），填充区域为用户得分，凹陷处即差距 */
export function RadarChart({ perMetric, referenceName }: Props) {
  const cx = 130
  const cy = 124
  const R = 86
  const n = AXES.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, r: number) =>
    `${(cx + Math.cos(angle(i)) * r).toFixed(1)},${(cy + Math.sin(angle(i)) * r).toFixed(1)}`
  const polygon = (radius: (i: number) => number) =>
    AXES.map((_, i) => pt(i, radius(i))).join(' ')

  const userPoints = AXES.map((a, i) => {
    const v = Math.max(0, Math.min(100, perMetric[a.key] ?? 0)) / 100
    // 保底 6%，避免 0 分顶点完全塌进圆心难以辨识
    return pt(i, R * Math.max(0.06, v))
  }).join(' ')

  return (
    <svg
      className="radar"
      viewBox="0 0 260 248"
      role="img"
      aria-label={`七维跑姿雷达图，对比${referenceName}`}
    >
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <polygon key={r} className="radar-grid" points={polygon(() => R * r)} />
      ))}
      {AXES.map((_, i) => (
        <line
          key={i}
          className="radar-spoke"
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(angle(i)) * R}
          y2={cy + Math.sin(angle(i)) * R}
        />
      ))}
      <polygon className="radar-ref" points={polygon(() => R)} />
      <polygon className="radar-user" points={userPoints} />
      {AXES.map((a, i) => {
        const lx = cx + Math.cos(angle(i)) * (R + 17)
        const ly = cy + Math.sin(angle(i)) * (R + 17)
        return (
          <text
            key={a.key}
            className="radar-label"
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {a.label}
          </text>
        )
      })}
    </svg>
  )
}
