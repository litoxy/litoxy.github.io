import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { extractFeatures, midStrideFrameIndex } from '../lib/features'
import { compareToGolden } from '../lib/similarity'
import { saveSession } from '../lib/db'
import { estimateFrame, getDetector } from '../lib/pose'
import { drawSkeleton, skeletonThumbnail } from '../lib/skeletonDraw'
import { looksLikeVideoFile, seekVideo, waitVideoEvent } from '../lib/media'
import type { SessionRecord, SkeletonFrame } from '../lib/types'
import run1 from '../assets/examples/run-1.jpg'
import run2 from '../assets/examples/run-2.jpg'
import run3 from '../assets/examples/run-3.jpg'
import badBack from '../assets/examples/bad-back.jpg'
import badCrop from '../assets/examples/bad-crop.jpg'

const EXAMPLES = [
  { src: run1, alt: '侧身跑姿示例一' },
  { src: run2, alt: '侧身跑姿示例二' },
  { src: run3, alt: '侧身跑姿示例三' },
]

interface Props {
  onSaved: (session: SessionRecord) => void
}

type Mode = 'file' | 'live'
type Phase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'recording'
  | 'analyzing'
  | 'error'

const TARGET_FPS = 12
const MAX_SECONDS = 8
const FILE_MAX_SECONDS = 12
const FILE_SAMPLE_FPS = 10

export function CapturePage({ onSaved }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const framesRef = useRef<SkeletonFrame[]>([])
  const rafRef = useRef(0)
  const lastSampleRef = useRef(0)
  const recordStartRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const finishingRef = useRef(false)
  const loopRef = useRef<() => void>(() => {})
  const objectUrlRef = useRef<string | null>(null)
  const inferBusyRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)
  const aliveRef = useRef(true)

  const [mode, setMode] = useState<Mode>('file')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [progress, setProgress] = useState(0)

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p
    setPhase(p)
  }

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  const stopStream = useCallback(() => {
    const v = videoRef.current
    const stream = v?.srcObject as MediaStream | null
    stream?.getTracks().forEach((t) => t.stop())
    if (v) {
      v.srcObject = null
      v.removeAttribute('src')
      v.load()
    }
    clearObjectUrl()
  }, [])

  const abortWork = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cancelAnimationFrame(rafRef.current)
    inferBusyRef.current = false
  }, [])

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      abortWork()
      stopStream()
    }
  }, [abortWork, stopStream])

  const buildAndSave = useCallback(
    async (frames: SkeletonFrame[], w: number, h: number) => {
      if (frames.length < 6) {
        throw new Error('有效骨架太少，换一段侧身跑姿再试')
      }
      const features = extractFeatures(frames)
      const comparisonResult = compareToGolden(features)
      const mid = midStrideFrameIndex(frames)
      const thumbnail = skeletonThumbnail(frames[mid], w, h)
      const session: SessionRecord = {
        sessionId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        durationMs: frames[frames.length - 1].timestampMs,
        thumbnail,
        sourceWidth: w,
        sourceHeight: h,
        features,
        comparisonResult,
        skeletonFrames: frames,
      }
      await saveSession(session)
      return session
    },
    [],
  )

  const finishRecording = useCallback(async () => {
    if (finishingRef.current) return
    finishingRef.current = true
    cancelAnimationFrame(rafRef.current)
    setPhaseBoth('analyzing')

    const video = videoRef.current
    const frames = framesRef.current.slice()
    const w = video?.videoWidth || 640
    const h = video?.videoHeight || 480

    try {
      if (frames.length < 6) {
        finishingRef.current = false
        setPhaseBoth('ready')
        setError('太短了，再录 3–8 秒')
        loopRef.current()
        return
      }
      const session = await buildAndSave(frames, w, h)
      stopStream()
      if (aliveRef.current) onSaved(session)
    } catch (e) {
      finishingRef.current = false
      setPhaseBoth('ready')
      setError(e instanceof Error ? e.message : '分析失败')
      loopRef.current()
    }
  }, [buildAndSave, onSaved, stopStream])

  const loopPreview = useCallback(() => {
    const tick = async (t: number) => {
      const video = videoRef.current
      const canvas = overlayRef.current
      if (!video || !canvas || video.readyState < 2) {
        if (phaseRef.current === 'ready' || phaseRef.current === 'recording') {
          rafRef.current = requestAnimationFrame(tick)
        }
        return
      }

      const due = t - lastSampleRef.current >= 1000 / TARGET_FPS
      if (due && !inferBusyRef.current) {
        lastSampleRef.current = t
        inferBusyRef.current = true
        try {
          const frame = await estimateFrame(
            video,
            framesRef.current.length,
            performance.now(),
          )
          if (!aliveRef.current) return
          const ctx = canvas.getContext('2d')
          if (ctx) {
            canvas.width = video.videoWidth || 640
            canvas.height = video.videoHeight || 480
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (frame) {
              if (phaseRef.current === 'recording') {
                framesRef.current.push({
                  ...frame,
                  timestampMs: performance.now() - recordStartRef.current,
                })
              }
              drawSkeleton(ctx, frame, {
                width: canvas.width,
                height: canvas.height,
                sourceWidth: canvas.width,
                sourceHeight: canvas.height,
                color: '#E8C872',
                lineWidth: 3,
              })
            }
          }
        } finally {
          inferBusyRef.current = false
        }
      }

      if (phaseRef.current === 'recording') {
        const sec = (performance.now() - recordStartRef.current) / 1000
        setElapsed(sec)
        if (sec >= MAX_SECONDS) {
          void finishRecording()
          return
        }
      }

      if (phaseRef.current === 'ready' || phaseRef.current === 'recording') {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [finishRecording])

  useEffect(() => {
    loopRef.current = loopPreview
  }, [loopPreview])

  const busy =
    phase === 'loading' || phase === 'analyzing' || phase === 'recording'

  const switchMode = (next: Mode) => {
    if (busy) return
    if (next === mode && phase === 'idle') return
    abortWork()
    stopStream()
    framesRef.current = []
    finishingRef.current = false
    setError('')
    setProgress(0)
    setElapsed(0)
    setMode(next)
    setPhaseBoth('idle')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const startCamera = async () => {
    setError('')
    setPhaseBoth('loading')
    finishingRef.current = false
    try {
      await getDetector()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((t) => t.stop())
        setPhaseBoth('idle')
        setError('相机组件未就绪')
        return
      }
      clearObjectUrl()
      video.srcObject = stream
      await video.play()
      setPhaseBoth('ready')
      loopPreview()
    } catch (e) {
      setPhaseBoth('error')
      setError(
        e instanceof Error ? e.message : '打不开相机，请允许权限后重试',
      )
    }
  }

  const startRecording = () => {
    framesRef.current = []
    recordStartRef.current = performance.now()
    setElapsed(0)
    finishingRef.current = false
    setPhaseBoth('recording')
    loopPreview()
  }

  const analyzeFile = async (file: File) => {
    const video = videoRef.current
    const canvas = overlayRef.current
    if (!video || !canvas) {
      setPhaseBoth('idle')
      setError('播放器未就绪，请重试')
      return
    }

    abortWork()
    const ac = new AbortController()
    abortRef.current = ac
    const signal = ac.signal

    setError('')
    setProgress(0)
    setPhaseBoth('loading')
    finishingRef.current = true

    stopStream()
    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    video.srcObject = null
    video.src = url
    video.muted = true
    video.playsInline = true

    try {
      await getDetector()
      if (signal.aborted) return
      video.load()
      const loaded = await waitVideoEvent(video, 'loadeddata', 8000)
      if (!loaded) throw new Error('视频无法加载')
      if (signal.aborted) return
      if (!Number.isFinite(video.duration) || video.duration <= 0) {
        throw new Error('读不到视频时长')
      }

      setPhaseBoth('analyzing')
      const durationSec = Math.min(video.duration, FILE_MAX_SECONDS)
      const step = 1 / FILE_SAMPLE_FPS
      const frames: SkeletonFrame[] = []
      const w = video.videoWidth || 640
      const h = video.videoHeight || 480
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      let t = 0
      let index = 0
      while (t <= durationSec + 1e-6) {
        if (signal.aborted) return
        await seekVideo(video, t, 2500)
        if (signal.aborted) return
        const frame = await estimateFrame(video, index, t * 1000)
        if (frame) {
          frames.push(frame)
          if (ctx) {
            ctx.clearRect(0, 0, w, h)
            drawSkeleton(ctx, frame, {
              width: w,
              height: h,
              sourceWidth: w,
              sourceHeight: h,
              color: '#E8C872',
              lineWidth: 3,
            })
          }
        }
        index++
        if (aliveRef.current) {
          setProgress(Math.min(99, Math.round((t / durationSec) * 100)))
        }
        t += step
      }

      if (signal.aborted) return

      // Never persist the original video
      clearObjectUrl()
      video.removeAttribute('src')
      video.load()

      const session = await buildAndSave(frames, w, h)
      if (signal.aborted || !aliveRef.current) return
      setProgress(100)
      abortRef.current = null
      onSaved(session)
    } catch (e) {
      if (signal.aborted) return
      clearObjectUrl()
      video.removeAttribute('src')
      video.load()
      finishingRef.current = false
      setPhaseBoth('idle')
      setProgress(0)
      setError(e instanceof Error ? e.message : '分析失败')
      abortRef.current = null
    }
  }

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!looksLikeVideoFile(file)) {
      setError('请选择视频文件')
      return
    }
    void analyzeFile(file)
  }

  return (
    <section className="page capture">
      <header className="page-head compact">
        <p className="brand">Form Lab</p>
        <div className="mode-switch" role="tablist" aria-label="输入方式">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'file'}
            className={mode === 'file' ? 'active' : undefined}
            disabled={busy}
            onClick={() => switchMode('file')}
          >
            选视频
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'live'}
            className={mode === 'live' ? 'active' : undefined}
            disabled={busy}
            onClick={() => switchMode('live')}
          >
            直接录制
          </button>
        </div>
      </header>

      <div
        className={`stage ${phase !== 'idle' ? 'live' : ''}`}
        onClick={() => {
          if (mode === 'file' && phase === 'idle') fileInputRef.current?.click()
        }}
      >
        <video ref={videoRef} playsInline muted className="stage-video" />
        <canvas ref={overlayRef} className="stage-overlay" />
        {phase === 'idle' && (
          <div className="stage-empty">
            <svg className="glyph pulse" viewBox="0 0 80 120" aria-hidden>
              <circle
                cx="40"
                cy="14"
                r="8"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M40 24 L40 58 M40 34 L22 48 M40 34 L58 48 M40 58 L26 96 M40 58 L54 96"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            {mode === 'file' && <p className="stage-hint">点这里选视频</p>}
          </div>
        )}
        {phase === 'recording' && (
          <div className="rec-badge" aria-live="polite">
            {elapsed.toFixed(1)}s
          </div>
        )}
        {phase === 'analyzing' && mode === 'file' && (
          <div className="rec-badge soft" aria-live="polite">
            {progress}%
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="sr-only"
        onChange={onPickFile}
      />

      {error && <p className="error-line">{error}</p>}

      {phase === 'idle' && (
        <div className="capture-guide" aria-label="拍摄示例与要点">
          <div className="example-strip">
            {EXAMPLES.map((ex) => (
              <figure key={ex.src} className="example-item">
                <img src={ex.src} alt={ex.alt} loading="lazy" />
                <figcaption>侧身 · 全身入镜</figcaption>
              </figure>
            ))}
          </div>

          <details className="guide-details">
            <summary>拍摄要点</summary>
            <ul className="guide-do">
              <li>
                <span className="do-mark">✓</span>从<strong>侧面</strong>拍，能看清前后摆腿
              </li>
              <li>
                <span className="do-mark">✓</span>
                <strong>全身</strong>入镜，脚和头都不被裁掉
              </li>
              <li>
                <span className="do-mark">✓</span>匀速跑 <strong>3–8 秒</strong>，别加速也别暂停
              </li>
            </ul>
            <p className="guide-title">别这样拍</p>
            <div className="guide-dont">
              <figure>
                <img src={badBack} alt="反面示例：背影拍摄" loading="lazy" />
                <figcaption>背面拍摄</figcaption>
              </figure>
              <figure>
                <img src={badCrop} alt="反面示例：身体被裁掉" loading="lazy" />
                <figcaption>身体被裁掉</figcaption>
              </figure>
            </div>
            <p className="guide-credit">示例图片来自 Unsplash（免费授权）</p>
          </details>
        </div>
      )}

      <div className="actions">
        {mode === 'file' && (phase === 'idle' || phase === 'error') && (
          <button
            type="button"
            className="btn primary"
            onClick={() => fileInputRef.current?.click()}
          >
            选择视频
          </button>
        )}
        {mode === 'live' && (phase === 'idle' || phase === 'error') && (
          <button
            type="button"
            className="btn primary"
            onClick={() => void startCamera()}
          >
            打开相机
          </button>
        )}
        {phase === 'loading' && (
          <button type="button" className="btn primary" disabled>
            准备中…
          </button>
        )}
        {mode === 'live' && phase === 'ready' && (
          <button type="button" className="btn primary" onClick={startRecording}>
            开始录制
          </button>
        )}
        {mode === 'live' && phase === 'recording' && (
          <button
            type="button"
            className="btn danger"
            onClick={() => void finishRecording()}
          >
            完成
          </button>
        )}
        {phase === 'analyzing' && (
          <button type="button" className="btn primary" disabled>
            分析中…
          </button>
        )}
      </div>
    </section>
  )
}