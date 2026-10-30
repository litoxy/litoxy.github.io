import { useState } from 'react'
import { WeChatOpenTip } from './components/WeChatOpenTip'
import { CapturePage } from './pages/CapturePage'
import { ReplayPage } from './pages/ReplayPage'
import { ResultPage } from './pages/ResultPage'
import type { SessionRecord } from './lib/types'

type View =
  | { name: 'capture' }
  | { name: 'result'; session: SessionRecord }
  | { name: 'replay'; session: SessionRecord }

export default function App() {
  const [view, setView] = useState<View>({ name: 'capture' })

  return (
    <div className="app-shell">
      <WeChatOpenTip />
      <main className="app-main">
        {view.name === 'capture' && (
          <CapturePage
            onSaved={(session) => setView({ name: 'result', session })}
          />
        )}
        {view.name === 'result' && (
          <ResultPage
            session={view.session}
            onBack={() => setView({ name: 'capture' })}
            onReplay={() => setView({ name: 'replay', session: view.session })}
          />
        )}
        {view.name === 'replay' && (
          <ReplayPage
            session={view.session}
            onBack={() => setView({ name: 'capture' })}
          />
        )}
      </main>
    </div>
  )
}
