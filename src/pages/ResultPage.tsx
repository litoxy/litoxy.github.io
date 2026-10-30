import { useState } from 'react'
import { RadarChart } from '../components/RadarChart'
import { StickFigureCanvas } from '../components/StickFigureCanvas'
import { buildAdvice } from '../lib/advice'
import type { ComparisonResult, SessionRecord } from '../lib/types'

interface Props {
  session: SessionRecord
  onBack: () => void
  onReplay: () => void
}

export function ResultPage({ session, onBack, onReplay }: Props) {
  const { comparisonResult: c } = session
  const [selectedId, setSelectedId] = useState(c.bestMatchId)
  const selected =
    c.allMatches.find((m) => m.id === selectedId) ?? c.allMatches[0]

  // 维度列表与改进建议随所选参考跑者联动
  const scoped: ComparisonResult = {
    bestMatchId: selected.id,
    bestMatchName: selected.name,
    similarity: selected.similarity,
    perMetric: selected.perMetric,
    allMatches: c.allMatches,
  }
  const advice = buildAdvice(session.features, scoped)
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
        <p className="match-score">{selected.similarity}</p>
        <p className="match-copy">
          与 {selected.name} 的跑姿相似度
        </p>
      </div>

      <div className="runner-tabs" role="tablist" aria-label="参考跑者对比">
        {c.allMatches.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === selectedId}
            className={`runner-tab ${m.id === selectedId ? 'active' : ''}`}
            onClick={() => setSelectedId(m.id)}
          >
            <span className="rt-name">{m.name}</span>
            <span className="rt-sim">{m.similarity}%</span>
          </button>
        ))}
      </div>

      <div className="radar-wrap">
        <RadarChart perMetric={selected.perMetric} referenceName={selected.name} />
        <p className="radar-caption">
          虚线为 {selected.name} 基准轮廓，黄铜区域是你的得分——<strong>凹陷处就是差距所在</strong>
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
          <p className="advice-title">改进建议 · 对标 {selected.name}</p>
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
          {good.map((a) => a.label).join('、')}已接近 {selected.name} 的水平，继续保持 👍
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
