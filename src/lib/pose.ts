import * as poseDetection from '@tensorflow-models/pose-detection'
import '@tensorflow/tfjs-backend-webgl'
import * as tf from '@tensorflow/tfjs'
import type { Keypoint, KeypointName, SkeletonFrame } from './types'
import { ensureModelCached, registerModelRouter, MODEL_URL } from './modelCache'
import type { ModelProgress } from './modelCache'

let detectorPromise: Promise<poseDetection.PoseDetector> | null = null

// 依次尝试 GPU → CPU，任何环境下都要能落地一个可用后端
async function initBackend(): Promise<void> {
  const candidates = ['webgl', 'cpu'] as const
  for (const b of candidates) {
    try {
      await tf.setBackend(b)
      await tf.ready()
      if (tf.getBackend() === b) return
    } catch {
      /* try next */
    }
  }
  // 最后兜底：即便首选后端未就绪也继续，由 tf 内部选择可用实现
  await tf.ready().catch(() => {})
}

export async function getDetector(onProgress?: ModelProgress) {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      await initBackend()
      // 先把权重拉到本地缓存（带进度），再让 tfjs 从缓存读取
      const cache = await ensureModelCached((l, t) => onProgress?.(l, t))
      registerModelRouter(cache)
      return poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          modelUrl: MODEL_URL, // cachemodel:// 协议，走上面的缓存 handler
        },
      )
    })().catch((e) => {
      // 失败不缓存，下次点击可重试
      detectorPromise = null
      throw e
    })
  }
  return detectorPromise
}

// 测试钩子（Playwright 验证用，不影响生产）
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__flGetDetector = getDetector
}

const NAME_MAP: Record<string, KeypointName> = {
  nose: 'nose',
  left_eye: 'left_eye',
  right_eye: 'right_eye',
  left_ear: 'left_ear',
  right_ear: 'right_ear',
  left_shoulder: 'left_shoulder',
  right_shoulder: 'right_shoulder',
  left_elbow: 'left_elbow',
  right_elbow: 'right_elbow',
  left_wrist: 'left_wrist',
  right_wrist: 'right_wrist',
  left_hip: 'left_hip',
  right_hip: 'right_hip',
  left_knee: 'left_knee',
  right_knee: 'right_knee',
  left_ankle: 'left_ankle',
  right_ankle: 'right_ankle',
}

export async function estimateFrame(
  video: HTMLVideoElement,
  frameIndex: number,
  timestampMs: number,
): Promise<SkeletonFrame | null> {
  const detector = await getDetector()
  const poses = await detector.estimatePoses(video, {
    maxPoses: 1,
    flipHorizontal: false,
  })
  if (!poses.length || !poses[0].keypoints?.length) return null

  const keypoints: Keypoint[] = []
  for (const k of poses[0].keypoints) {
    const name = NAME_MAP[k.name ?? '']
    if (!name) continue
    keypoints.push({
      name,
      x: k.x,
      y: k.y,
      score: k.score ?? 0,
    })
  }
  if (!keypoints.length) return null

  return { frameIndex, timestampMs, keypoints }
}