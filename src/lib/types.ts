export type KeypointName =
  | 'nose'
  | 'left_eye'
  | 'right_eye'
  | 'left_ear'
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle'

export interface Keypoint {
  name: KeypointName
  x: number
  y: number
  score: number
}

export interface SkeletonFrame {
  frameIndex: number
  timestampMs: number
  keypoints: Keypoint[]
}

export interface PostureFeatures {
  cadence: number
  bodyLean: number
  hipExtension: number
  armSwing: number
  kneeFlexion: number
  verticalOscillation: number
  symmetry: number
}

export interface RunnerMatch {
  id: string
  name: string
  similarity: number
  perMetric: Record<keyof PostureFeatures, number>
}

export interface ComparisonResult {
  bestMatchId: string
  bestMatchName: string
  similarity: number
  perMetric: Record<keyof PostureFeatures, number>
  /** 与所有参考跑者的匹配结果（按相似度降序） */
  allMatches: RunnerMatch[]
}

/** 单个维度的差异行（差异语义，而非相似度） */
export interface DeltaRow {
  key: keyof PostureFeatures
  label: string
  short: string
  user: number
  reference: number
  /** 有符号差值：正 = 你高于参照，负 = 你低于参照 */
  delta: number
  /** 相对参照值的百分比偏差（绝对值） */
  deltaPct: number
  /** 归一化差异强度 0–1 */
  magnitude: number
  direction: 'higher' | 'lower' | 'equal'
  /** 该差异方向是否对跑姿有利 */
  better: boolean
  level: 'close' | 'fair' | 'far'
  userFormatted: string
  refFormatted: string
}

/** 与某位参考跑者的完整差异 */
export interface RunnerDiff {
  runnerId: string
  runnerName: string
  /** 整体差异分 0–100，越大差距越明显 */
  divergence: number
  rows: DeltaRow[]
}

export interface SessionRecord {
  sessionId: string
  timestamp: string
  durationMs: number
  thumbnail: string
  sourceWidth: number
  sourceHeight: number
  features: PostureFeatures
  comparisonResult: ComparisonResult
  skeletonFrames: SkeletonFrame[]
}

export interface GoldenRunner {
  id: string
  name: string
  tagline: string
  avatar?: string
  /** 该跑姿特征档案的依据/来源说明（展示给用户） */
  source?: string
  featureVector: PostureFeatures
}
