import { StickFigureCanvas } from '../components/StickFigureCanvas'
import type { SessionRecord } from '../lib/types'

interface Props {
  session: SessionRecord
  onBack: () => void
}

export function ReplayPage({ session, onBack }: Props) {
  return (
    <section className="page replay">
      <header className="page-head compact">
        <button type="button" className="text-btn" onClick={onBack}>
          返回
        </button>
        <p className="replay-meta">
          {session.comparisonResult.bestMatchName} {session.comparisonResult.similarity}%
        </p>
      </header>

      <StickFigureCanvas
        frames={session.skeletonFrames}
        sourceWidth={session.sourceWidth}
        sourceHeight={session.sourceHeight}
        className="replay-canvas tall"
        playing
        fps={14}
      />
    </section>
  )
}