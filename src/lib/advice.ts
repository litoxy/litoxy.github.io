import { goldenRunners } from '../data/goldenRunners'
import type { ComparisonResult, PostureFeatures } from './types'

interface MetricMeta {
  key: keyof PostureFeatures
  label: string
  unit: string
  format: (v: number) => string
}

const METRICS: MetricMeta[] = [
  {
    key: 'cadence',
    label: '步频',
    unit: 'spm',
    format: (v) => `${Math.round(v)} spm`,
  },
  {
    key: 'bodyLean',
    label: '躯干前倾',
    unit: '°',
    format: (v) => `${v.toFixed(1)}°`,
  },
  {
    key: 'hipExtension',
    label: '送髋',
    unit: '',
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'armSwing',
    label: '摆臂',
    unit: '',
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'kneeFlexion',
    label: '屈膝',
    unit: '',
    format: (v) => `${Math.round(v * 100)}%`,
  },
  {
    key: 'verticalOscillation',
    label: '垂直振幅',
    unit: 'cm',
    format: (v) => `${v.toFixed(1)} cm`,
  },
  {
    key: 'symmetry',
    label: '左右对称',
    unit: '',
    format: (v) => `${Math.round(v * 100)}%`,
  },
]

function adviceFor(
  meta: MetricMeta,
  user: number,
  ref: number,
): string {
  const lower = user < ref
  switch (meta.key) {
    case 'cadence':
      return lower
        ? `步频为 ${meta.format(user)}，低于参考的 ${meta.format(ref)}。可先尝试小幅提高约 5 spm，保持落地点在身体下方，不要为提频而跨步。`
        : `步频为 ${meta.format(user)}，高于参考的 ${meta.format(ref)}。若动作放松则无需刻意降低，可结合步幅与上下振幅一起观察。`
    case 'bodyLean':
      return `躯干前倾为 ${meta.format(user)}，参考为 ${meta.format(ref)}。建议从脚踝带动整体轻微前倾，避免只弯腰或挺腰，通常以 3–8° 作为练习参考。`
    case 'hipExtension':
      return lower
        ? `送髋指标为 ${meta.format(user)}，低于参考的 ${meta.format(ref)}。保持骨盆稳定，让支撑腿自然向后伸展；不要通过加大跨步来"送髋"。`
        : `送髋指标为 ${meta.format(user)}，高于参考的 ${meta.format(ref)}。注意避免腰部后仰或过度跨步，以躯干稳定为前提。`
    case 'armSwing':
      return lower
        ? `摆臂幅度为 ${meta.format(user)}，低于参考的 ${meta.format(ref)}。肘部约呈 90°，前后摆动带动节奏，避免左右横摆。`
        : `摆臂幅度为 ${meta.format(user)}，高于参考的 ${meta.format(ref)}。适当收小幅度，让摆臂服务于步频而非带动身体晃动。`
    case 'kneeFlexion':
      return lower
        ? `屈膝缓冲为 ${meta.format(user)}，低于参考的 ${meta.format(ref)}。落地时让膝盖保持微曲以吸收冲击，避免直腿着地。`
        : `屈膝缓冲为 ${meta.format(user)}，高于参考的 ${meta.format(ref)}。注意落地点靠近身体正下方，减少过度屈膝带来的额外负担。`
    case 'verticalOscillation':
      return lower
        ? `垂直振幅为 ${meta.format(user)}，优于参考的 ${meta.format(ref)}，跑得非常经济，继续保持。`
        : `垂直振幅为 ${meta.format(user)}，高于参考的 ${meta.format(ref)}。想象头顶有低矮的天花板，减少每步的上下弹跳，把力气更多用在向前。`
    case 'symmetry':
      return `左右对称性为 ${meta.format(user)}，参考为 ${meta.format(ref)}。若偏差明显，可在慢跑中留意两侧摆臂与落地的差异，必要时做单侧力量训练。`
  }
}

export interface MetricAdvice {
  key: keyof PostureFeatures
  label: string
  similarity: number
  userFormatted: string
  refFormatted: string
  text: string
  level: 'good' | 'fair' | 'weak'
}

/** 按相似度从低到高给出指标建议，最需要改进的排最前 */
export function buildAdvice(
  features: PostureFeatures,
  comparison: ComparisonResult,
): MetricAdvice[] {
  const ref = goldenRunners.find((r) => r.id === comparison.bestMatchId)
  if (!ref) return []

  return METRICS.map((meta) => {
    const user = features[meta.key]
    const reference = ref.featureVector[meta.key]
    const similarity = comparison.perMetric[meta.key] ?? 0
    const level: MetricAdvice['level'] =
      similarity >= 85 ? 'good' : similarity >= 65 ? 'fair' : 'weak'
    return {
      key: meta.key,
      label: meta.label,
      similarity,
      userFormatted: meta.format(user),
      refFormatted: meta.format(reference),
      text: adviceFor(meta, user, reference),
      level,
    }
  }).sort((a, b) => a.similarity - b.similarity)
}
