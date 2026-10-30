import { StickFigureCanvas } from '../components/StickFigureCanvas'
import type { SessionRecord } from '../lib/types'

const METRIC_LABELS: Record<string, string> = {
  cadence: '步频',
  bodyLean: '前倾',
  hipExtension: '送髋',
  armSwing: '摆臂',
  kneeFlexion: '屈膝',
  verticalOscillation: '振幅',
  symmetry: '对称',
}

interface Props {
  session: SessionRecord
  onBack: () => void
  onReplay: () => void
}

export function ResultPage({ session, onBack, onReplay }: Props) {
  const { comparisonResult: c, features } = session

  return (
    <section className="page result">
      <header className="page-head compact">
        <button type="button" className="text-btn" onClick={onBack}>
          返回
        </button>
      </header>

      <div className="match-block">
        <p className="match-score">{c.similarity}</p>
        <p className="match-copy">{c.bestMatchName}</p>
      </div>

      <StickFigureCanvas
        frames={session.skeletonFrames}
        sourceWidth={session.sourceWidth}
        sourceHeight={session.sourceHeight}
        className="replay-canvas"
        playing
      />

      <ul className="metric-list">
        {(Object.keys(METRIC_LABELS) as (keyof typeof features)[]).map((key) => (
          <li key={key}>
            <span>{METRIC_LABELS[key]}</span>
            <span className="metric-val">
              {typeof features[key] === 'number' && key === 'cadence'
                ? `${features[key]}`
                : features[key]}
            </span>
            <span className="metric-sim">{c.perMetric[key]}%</span>
          </li>
        ))}
      </ul>

      <div className="actions">
        <button type="button" className="btn primary" onClick={onReplay}>
          回放
        </button>
      </div>
    </section>
  )
}