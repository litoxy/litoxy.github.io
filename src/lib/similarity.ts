import { goldenRunners } from '../data/goldenRunners'
import type { ComparisonResult, PostureFeatures } from './types'

const WEIGHTS: Record<keyof PostureFeatures, number> = {
  cadence: 1.2,
  bodyLean: 1,
  hipExtension: 1.1,
  armSwing: 0.9,
  kneeFlexion: 1,
  verticalOscillation: 1,
  symmetry: 1.3,
}

const SCALES: Record<keyof PostureFeatures, number> = {
  cadence: 40,
  bodyLean: 12,
  hipExtension: 0.4,
  armSwing: 0.5,
  kneeFlexion: 0.4,
  verticalOscillation: 8,
  symmetry: 0.3,
}

function metricScore(
  user: number,
  golden: number,
  scale: number,
): number {
  const diff = Math.abs(user - golden) / scale
  return Math.max(0, 1 - diff)
}

export function compareToGolden(features: PostureFeatures): ComparisonResult {
  let best = goldenRunners[0]
  let bestSim = -1
  let bestPer = {} as Record<keyof PostureFeatures, number>

  for (const runner of goldenRunners) {
    let weighted = 0
    let totalW = 0
    const perMetric = {} as Record<keyof PostureFeatures, number>

    for (const key of Object.keys(WEIGHTS) as (keyof PostureFeatures)[]) {
      const s = metricScore(
        features[key],
        runner.featureVector[key],
        SCALES[key],
      )
      perMetric[key] = Math.round(s * 100)
      weighted += s * WEIGHTS[key]
      totalW += WEIGHTS[key]
    }

    const sim = Math.round((weighted / totalW) * 100)
    if (sim > bestSim) {
      bestSim = sim
      best = runner
      bestPer = perMetric
    }
  }

  return {
    bestMatchId: best.id,
    bestMatchName: best.name,
    similarity: bestSim,
    perMetric: bestPer,
  }
}