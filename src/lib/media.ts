/** Wait for a video event with timeout; resolves false on timeout. */
export function waitVideoEvent(
  el: HTMLVideoElement,
  event: string,
  timeoutMs = 2500,
): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      el.removeEventListener(event, onOk)
      el.removeEventListener('error', onFail)
      clearTimeout(timer)
      resolve(ok)
    }
    const onOk = () => finish(true)
    const onFail = () => finish(false)
    const timer = window.setTimeout(() => finish(false), timeoutMs)
    el.addEventListener(event, onOk, { once: true })
    el.addEventListener('error', onFail, { once: true })
  })
}

/** Seek with timeout; skip event wait if already at target. */
export async function seekVideo(
  el: HTMLVideoElement,
  timeSec: number,
  timeoutMs = 2500,
): Promise<void> {
  const target = Math.min(
    Math.max(0, timeSec),
    Number.isFinite(el.duration) ? el.duration : timeSec,
  )
  if (Math.abs(el.currentTime - target) < 0.001 && el.readyState >= 2) {
    return
  }
  el.currentTime = target
  const ok = await waitVideoEvent(el, 'seeked', timeoutMs)
  if (!ok && Math.abs(el.currentTime - target) > 0.05) {
    throw new Error('视频跳帧超时')
  }
}

export function looksLikeVideoFile(file: File): boolean {
  if (file.type.startsWith('video/')) return true
  return /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(file.name)
}