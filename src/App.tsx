import { useEffect, useState } from 'react'
import { WeChatOpenTip } from './components/WeChatOpenTip'
import { CapturePage } from './pages/CapturePage'
import { HistoryPage } from './pages/HistoryPage'
import { ReplayPage } from './pages/ReplayPage'
import { ResultPage } from './pages/ResultPage'
import { getSession } from './lib/db'
import { go, parseHash, ROUTES, type Route } from './lib/router'
import type { SessionRecord } from './lib/types'

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash())
  const [session, setSession] = useState<SessionRecord | null>(null)
  const [missing, setMissing] = useState(false)

  // hash 变化 -> 更新路由
  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  // 需要读取会话的路由：从 IndexedDB 取（刷新后仍可恢复）
  useEffect(() => {
    if (route.name !== 'result' && route.name !== 'replay') {
      setSession(null)
      setMissing(false)
      return
    }
    let alive = true
    setMissing(false)
    void getSession(route.id).then((s) => {
      if (!alive) return
      if (s) setSession(s)
      else setMissing(true)
    })
    return () => {
      alive = false
    }
  }, [route])

  const toCapture = () => go(ROUTES.capture)
  const needSession = route.name === 'result' || route.name === 'replay'

  return (
    <div className="app-shell">
      <WeChatOpenTip />
      <main className="app-main">
        {route.name === 'capture' && (
          <CapturePage
            onSaved={(s) => {
              setSession(s)
              go(ROUTES.result(s.sessionId))
            }}
            onOpenHistory={() => go(ROUTES.history)}
          />
        )}

        {route.name === 'history' && (
          <HistoryPage
            onBack={toCapture}
            onOpen={(s) => go(ROUTES.result(s.sessionId))}
          />
        )}

        {needSession && missing && (
          <section className="page">
            <header className="page-head compact">
              <button type="button" className="text-btn" onClick={toCapture}>
                返回
              </button>
            </header>
            <p className="muted">这条记录已不存在（可能已被删除）。</p>
          </section>
        )}

        {route.name === 'result' && session && (
          <ResultPage
            session={session}
            onBack={toCapture}
          />
        )}

        {route.name === 'replay' && session && (
          <ReplayPage
            session={session}
            onBack={() => go(ROUTES.result(session.sessionId))}
          />
        )}
      </main>
    </div>
  )
}
