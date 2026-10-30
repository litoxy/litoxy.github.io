import type { GoldenRunner } from '../lib/types'

/** Pre-generated reference profiles — no runtime training. */
export const goldenRunners: GoldenRunner[] = [
  {
    id: 'runner_a',
    name: 'Runner A',
    tagline: 'Elite marathon form',
    featureVector: {
      cadence: 180,
      bodyLean: 8,
      hipExtension: 0.82,
      armSwing: 0.55,
      kneeFlexion: 0.72,
      verticalOscillation: 6.5,
      symmetry: 0.94,
    },
  },
  {
    id: 'runner_b',
    name: 'Runner B',
    tagline: 'Efficient recreational',
    featureVector: {
      cadence: 168,
      bodyLean: 6,
      hipExtension: 0.74,
      armSwing: 0.48,
      kneeFlexion: 0.65,
      verticalOscillation: 8.2,
      symmetry: 0.88,
    },
  },
  {
    id: 'runner_c',
    name: 'Runner C',
    tagline: 'High cadence stride',
    featureVector: {
      cadence: 192,
      bodyLean: 7,
      hipExtension: 0.7,
      armSwing: 0.42,
      kneeFlexion: 0.68,
      verticalOscillation: 5.8,
      symmetry: 0.91,
    },
  },
]
