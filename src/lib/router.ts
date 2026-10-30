/**
 * 极简 hash 路由：刷新不丢页面（GitHub Pages 无需服务端 rewrite）。
 *   #/            首页（采集）
 *   #/history     历史记录
 *   #/result/:id  结果页
 *   #/replay/:id  回放
 */
export type Route =
  | { name: 'capture' }
  | { name: 'history' }
  | { name: 'result'; id: string }
  | { name: 'replay'; id: string }

export function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [seg, id] = raw.split('/')
  if (seg === 'history') return { name: 'history' }
  if (seg === 'result' && id) return { name: 'result', id: decodeURIComponent(id) }
  if (seg === 'replay' && id) return { name: 'replay', id: decodeURIComponent(id) }
  return { name: 'capture' }
}

export function go(route: string) {
  window.location.hash = route
}

export const ROUTES = {
  capture: '#/',
  history: '#/history',
  result: (id: string) => `#/result/${encodeURIComponent(id)}`,
  replay: (id: string) => `#/replay/${encodeURIComponent(id)}`,
}
