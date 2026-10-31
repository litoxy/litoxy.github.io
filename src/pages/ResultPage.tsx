import { useState } from 'react'
import { RadarChart } from '../components/RadarChart'
import { StickFigureCanvas } from '../components/StickFigureCanvas'
import { goldenRunners } from '../data/goldenRunners'
import { diffAgainstAll, METRIC_META } from '../lib/comparison'
import type { DeltaRow, SessionRecord } from '../lib/types'

interface Props {
  session: SessionRecord
  onBack: () => void
}

function deltaText(row: DeltaRow): string {
  if (row.direction === 'equal') return '持平'
  const sign = row.direction === 'higher' ? '+' : '−'
  return `${sign}${row.deltaPct}%`
}

export function ResultPage({ session, onBack }: Props) {
  const diffs = diffAgainstAll(session.features)
  const [activeIdx, setActiveIdx] = useState(0)
  const active = diffs[activeIdx]
  const runner = goldenRunners.find((r) => r.id === active.runnerId)!

  // 差距最大的三个维度
  const worst = [...active.rows].sort((a, b) => b.magnitude - a.magnitude).slice(0, 3)

  return (
    <section className="page result">
      <header className="page-head compact">
        <button type="button" className="text-btn" onClick={onBack}>
          返回
        </button>
      </header>

      <p className="result-lede">
        你的跑姿与 <strong>{diffs.length}</strong> 种优秀跑姿的逐维差距
      </p>

      <div className="runner-tabs" role="tablist" aria-label="切换参照跑姿">
        {diffs.map((d, i) => {
          const r = goldenRunners.find((x) => x.id === d.runnerId)!
          return (
            <button
              key={d.runnerId}
              type="button"
              role="tab"
              aria-selected={i === activeIdx}
              className={`runner-tab ${i === activeIdx ? 'active' : ''}`}
              onClick={() => setActiveIdx(i)}
            >
              {r.avatar && <img className="rt-avatar" src={r.avatar} alt={r.name} loading="lazy" />}
              <span className="rt-name">{r.name}</span>
              <span className="rt-tag">{r.tagline}</span>
            </button>
          )
        })}
      </div>

      <div className="radar-wrap">
        <div className="radar-head">
          <span className="radar-title">相对 {runner.name} 的轮廓</span>
          <span className="radar-div">差异 {active.divergence}</span>
        </div>
        <RadarChart
          key={runner.id}
          features={session.features}
          reference={runner.featureVector}
          referenceName={runner.name}
        />
        <p className="radar-caption">
          每一轴越靠外代表该维度越接近顶级水平。虚线 = {runner.name} · 实心 = 你。<strong>实心凹进虚线的地方，就是差距所在</strong>
        </p>
        {runner.source && <p className="radar-source">数据来源：{runner.source}</p>}
      </div>

      <ul className="delta-list">
        {active.rows.map((row) => (
          <li key={row.key} className={`delta-row ${row.level}`}>
            <div className="delta-top">
              <span className="delta-label">{row.label}</span>
              <span className={`delta-val ${row.direction}`}>{deltaText(row)}</span>
            </div>
            <div className="delta-bar">
              <span className="delta-mid" />
              <span
                className={`delta-fill ${row.direction} ${row.better ? 'pos' : 'neg'}`}
                style={{ width: `${Math.round(row.magnitude * 48)}%` }}
              />
            </div>
            <div className="delta-nums">
              <span>你 {row.userFormatted}</span>
              <span>{runner.name} {row.refFormatted}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="advice-block">
        <p className="advice-title">与 {runner.name} 差距最大的三维</p>
        <ul className="advice-list">
          {worst.map((row) => {
            const meta = METRIC_META.find((m) => m.key === row.key)!
            return (
              <li key={row.key}>
                <strong>{row.label}</strong>
                <p>
                  你是 {row.userFormatted}，{runner.name} 是 {row.refFormatted}，
                  {row.direction === 'lower' ? '低' : '高'}了 {deltaText(row)}。
                  {row.better
                    ? '这一维度你就在标杆之上，保持即可。'
                    : meta.higherBetter
                      ? '建议朝提高的方向小幅渐进，先把这维拉近一半差距。'
                      : '建议朝降低的方向调整，减少不必要的上下弹跳。'}
                </p>
              </li>
            )
          })}
        </ul>
      </div>

      <StickFigureCanvas
        frames={session.skeletonFrames}
        sourceWidth={session.sourceWidth}
        sourceHeight={session.sourceHeight}
        className="replay-canvas"
        playing
      />
    </section>
  )
}
