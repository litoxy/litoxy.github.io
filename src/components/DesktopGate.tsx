import { useState } from 'react'

/**
 * 桌面端（鼠标 + 宽屏）检测。
 * 核心依据 pointer: coarse —— 手机/平板触屏为 coarse，桌面鼠标为 fine。
 */
function isDesktop(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const wide = window.matchMedia('(min-width: 900px)').matches
  return !coarse && wide
}

/**
 * 电脑端提示：本工具的采集流程依赖手机相机，
 * 桌面浏览器打开时提示移步手机，仍允许「仅在电脑上浏览」。
 */
export function DesktopGate() {
  const [dismissed, setDismissed] = useState(false)
  if (!isDesktop() || dismissed) return null

  return (
    <div className="wx-gate desktop-gate" role="dialog" aria-modal="true" aria-labelledby="dt-gate-title">
      <div className="wx-gate-card">
        <p className="brand">Form Lab</p>
        <h2 id="dt-gate-title">请在手机上打开</h2>
        <p className="wx-gate-copy">
          Form Lab 需要调用手机相机拍摄或上传跑姿视频，
          电脑端浏览器不支持完整流程。
        </p>
        <p className="wx-gate-note">
          用手机扫描或直接在手机浏览器打开本页面即可开始
        </p>
        <button
          type="button"
          className="text-btn wx-gate-dismiss"
          onClick={() => setDismissed(true)}
        >
          仍要在电脑上浏览
        </button>
      </div>
    </div>
  )
}
