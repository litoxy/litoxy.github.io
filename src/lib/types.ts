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
  featureVector: PostureFeatures
}