import { StickFigureCanvas } from '../components/StickFigureCanvas'
import { buildAdvice } from '../lib/advice'
import type { SessionRecord } from '../lib/types'

interface Props {
  session: SessionRecord
  onBack: () => void
  onReplay: () => void
}

export function ResultPage({ session, onBack, onReplay }: Props) {
  const { comparisonResult: c } = session
  const advice = buildAdvice(session.features, c)
  const weakest = advice.filter((a) => a.level !== 'good').slice(0, 3)
  const good = advice.filter((a) => a.level === 'good')

  return (
    <section className="page result">
      <header className="page-head compact">
        <button type="button" className="text-btn" onClick={onBack}>
          返回
        </button>
      </header>

      <div className="match-block">
        <p className="match-score">{c.similarity}</p>
        <p className="match-copy">
          最接近参考跑者 · {c.bestMatchName}
        </p>
      </div>

      <StickFigureCanvas
        frames={session.skeletonFrames}
        sourceWidth={session.sourceWidth}
        sourceHeight={session.sourceHeight}
        className="replay-canvas"
        playing
      />

      <ul className="metric-list">
        {advice.map((a) => (
          <li key={a.key} className={`metric-item ${a.level}`}>
            <span>{a.label}</span>
            <span className="metric-val">{a.userFormatted}</span>
            <span className="metric-sim">{a.similarity}%</span>
          </li>
        ))}
      </ul>

      {weakest.length > 0 && (
        <div className="advice-block">
          <p className="advice-title">改进建议</p>
          <ul className="advice-list">
            {weakest.map((a) => (
              <li key={a.key}>
                <strong>{a.label}</strong>
                <p>{a.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {good.length > 0 && (
        <p className="advice-good-line">
          {good.map((a) => a.label).join('、')}已接近参考水平，继续保持 👍
        </p>
      )}

      <div className="actions">
        <button type="button" className="btn primary" onClick={onReplay}>
          回放
        </button>
      </div>
    </section>
  )
}
