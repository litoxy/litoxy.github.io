import { useEffect, useState, type MouseEvent } from 'react'
import { deleteSession, listSessions } from '../lib/db'
import type { SessionRecord } from '../lib/types'

interface Props {
  onOpen: (session: SessionRecord) => void
  onBack: () => void
}

export function HistoryPage({ onOpen, onBack }: Props) {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    setSessions(await listSessions())
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const remove = async (id: string, e: MouseEvent) => {
    e.stopPropagation()
    await deleteSession(id)
    await refresh()
  }

  return (
    <section className="page history">
      <header className="page-head compact">
        <button type="button" className="text-btn" onClick={onBack}>
          返回
        </button>
        <h1>历史记录</h1>
      </header>

      {loading && <p className="muted">读取中…</p>}
      {!loading && sessions.length === 0 && (
        <div className="empty-block">
          <svg className="glyph soft" viewBox="0 0 80 120" aria-hidden>
            <circle cx="40" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
            <path
              d="M40 24 L40 58 M40 34 L22 48 M40 34 L58 48 M40 58 L26 96 M40 58 L54 96"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <p>还没有记录</p>
        </div>
      )}

      <ul className="history-list">
        {sessions.map((s) => (
          <li key={s.sessionId}>
            <button type="button" className="history-row" onClick={() => onOpen(s)}>
              {s.thumbnail ? (
                <img src={s.thumbnail} alt="" width={80} height={60} />
              ) : (
                <span className="history-thumb-empty" aria-hidden />
              )}
              <div className="history-meta">
                <strong>
                  {new Date(s.timestamp).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
                <span>{s.comparisonResult.allMatches?.length ?? 0} 种跑姿对照 · 点击查看差距</span>
              </div>
            </button>
            <button
              type="button"
              className="text-btn danger-text"
              onClick={(e) => void remove(s.sessionId, e)}
              aria-label="删除"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}