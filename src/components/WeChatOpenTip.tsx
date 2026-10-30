import { useState } from 'react'
import { isIOS, isWeChatBrowser } from '../lib/env'

export function WeChatOpenTip() {
  const [dismissed, setDismissed] = useState(false)
  if (!isWeChatBrowser() || dismissed) return null

  return (
    <div className="wx-gate" role="dialog" aria-modal="true" aria-labelledby="wx-gate-title">
      <div className="wx-gate-arrow" aria-hidden>
        <svg viewBox="0 0 64 80" width="48" height="60">
          <path
            d="M32 68 V18 M32 18 l-12 12 M32 18 l12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="wx-gate-card">
        <p className="brand">Formline</p>
        <h2 id="wx-gate-title">请在浏览器中打开</h2>
        <p className="wx-gate-copy">
          {isIOS()
            ? '点右上角 ···，选择「在 Safari 中打开」'
            : '点右上角 ···，选择「在浏览器打开」'}
        </p>
        <p className="wx-gate-note">微信内无法稳定使用相机与本地记录</p>
        <button
          type="button"
          className="text-btn wx-gate-dismiss"
          onClick={() => setDismissed(true)}
        >
          仍要继续
        </button>
      </div>
    </div>
  )
}