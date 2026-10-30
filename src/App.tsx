import { useState } from 'react'
import { WeChatOpenTip } from './components/WeChatOpenTip'
import { CapturePage } from './pages/CapturePage'
import { HistoryPage } from './pages/HistoryPage'
import { ReplayPage } from './pages/ReplayPage'
import { ResultPage } from './pages/ResultPage'
import type { SessionRecord } from './lib/types'

type Tab = 'capture' | 'history'
type View =
  | { name: 'tab'; tab: Tab }
  | { name: 'result'; session: SessionRecord }
  | { name: 'replay'; session: SessionRecord }

export default function App() {
  const [view, setView] = useState<View>({ name: 'tab', tab: 'capture' })

  const tab = view.name === 'tab' ? view.tab : null

  return (
    <div className="app-shell">
      <WeChatOpenTip />
      <main className="app-main">
        {view.name === 'tab' && view.tab === 'capture' && (
          <CapturePage
            onSaved={(session) => setView({ name: 'result', session })}
          />
        )}
        {view.name === 'tab' && view.tab === 'history' && (
          <HistoryPage
            onOpen={(session) => setView({ name: 'replay', session })}
          />
        )}
        {view.name === 'result' && (
          <ResultPage
            session={view.session}
            onBack={() => setView({ name: 'tab', tab: 'history' })}
            onReplay={() => setView({ name: 'replay', session: view.session })}
          />
        )}
        {view.name === 'replay' && (
          <ReplayPage
            session={view.session}
            onBack={() => setView({ name: 'tab', tab: 'history' })}
          />
        )}
      </main>

      {tab && (
        <nav className="bottom-nav" aria-label="主导航">
          <button
            type="button"
            className={tab === 'capture' ? 'active' : undefined}
            onClick={() => setView({ name: 'tab', tab: 'capture' })}
          >
            捕捉
          </button>
          <button
            type="button"
            className={tab === 'history' ? 'active' : undefined}
            onClick={() => setView({ name: 'tab', tab: 'history' })}
          >
            历史
          </button>
        </nav>
      )}
    </div>
  )
}