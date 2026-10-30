import { goldenRunners } from '../data/goldenRunners'
import type { GoldenRunner, PostureFeatures, RunnerDiff, DeltaRow } from './types'

/** 各维度的展示元数据：标签、单位、格式化、差异归一尺度 */
export const METRIC_META: {
  key: keyof PostureFeatures
  label: string
  short: string
  format: (v: number) => string
  scale: number
  /** 该维度数值越大是否越好（影响「落后/超出」措辞） */
  higherBetter: boolean
}[] = [
  { key: 'cadence', label: '步频', short: '步频', format: (v) => `${Math.round(v)} spm`, scale: 40, higherBetter: true },
  { key: 'bodyLean', label: '躯干前倾', short: '前倾', format: (v) => `${v.toFixed(1)}°`, scale: 12, higherBetter: true },
  { key: 'hipExtension', label: '送髋', short: '送髋', format: (v) => `${Math.round(v * 100)}%`, scale: 0.4, higherBetter: true },
  { key: 'armSwing', label: '摆臂', short: '摆臂', format: (v) => `${Math.round(v * 100)}%`, scale: 0.5, higherBetter: true },
  { key: 'kneeFlexion', label: '屈膝缓冲', short: '屈膝', format: (v) => `${Math.round(v * 100)}%`, scale: 0.4, higherBetter: true },
  { key: 'verticalOscillation', label: '垂直振幅', short: '振幅', format: (v) => `${v.toFixed(1)} cm`, scale: 8, higherBetter: false },
  { key: 'symmetry', label: '左右对称', short: '对称', format: (v) => `${Math.round(v * 100)}%`, scale: 0.3, higherBetter: true },
]

/** 差异归一：|实际差| / 尺度，0 = 完全一致，1 = 差满一个尺度 */
function normalizeDelta(
  user: number,
  ref: number,
  scale: number,
): number {
  return Math.min(1, Math.abs(user - ref) / scale)
}

/** 逐维度差异：正数表示你高于参照，负数表示低于参照 */
function buildRows(user: PostureFeatures, ref: GoldenRunner): DeltaRow[] {
  return METRIC_META.map((m) => {
    const u = user[m.key]
    const r = ref.featureVector[m.key]
    const delta = u - r
    const magnitude = normalizeDelta(u, r, m.scale)
    // 「好/差」以该项是否越大越好判断
    const better = m.higherBetter ? delta >= 0 : delta <= 0
    const level = magnitude <= 0.15 ? 'close' : magnitude <= 0.5 ? 'fair' : 'far'
    return {
      key: m.key,
      label: m.label,
      short: m.short,
      user: u,
      reference: r,
      delta,
      // 百分比偏差封顶 100%，避免参照值很小时数字爆表
      deltaPct: r !== 0 ? Math.min(100, Math.round((Math.abs(delta) / Math.abs(r)) * 100)) : 0,
      magnitude,
      direction: delta > 0 ? 'higher' : delta < 0 ? 'lower' : 'equal',
      better,
      level,
      userFormatted: m.format(u),
      refFormatted: m.format(r),
    }
  })
}

/** 与单个参考跑者的差异对比（不含「相似度」概念） */
export function diffAgainst(user: PostureFeatures, runner: GoldenRunner): RunnerDiff {
  const rows = buildRows(user, runner)
  // 整体差异分：各维度归一差异的加权平均，0 = 高度一致，100 = 全面背离
  const divergence = Math.round(
    (rows.reduce((s, r) => s + r.magnitude, 0) / rows.length) * 100,
  )
  return { runnerId: runner.id, runnerName: runner.name, rows, divergence }
}

/** 与所有参考跑者的差异，按差异从小到大（最接近 -> 最远）排列 */
export function diffAgainstAll(user: PostureFeatures): RunnerDiff[] {
  return goldenRunners
    .map((r) => diffAgainst(user, r))
    .sort((a, b) => a.divergence - b.divergence)
}
