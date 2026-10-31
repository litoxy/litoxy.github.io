/**
 * MoveNet 模型自托管缓存层。
 *
 * 背景：tfjs 默认按 model.json 里的相对路径去拉分片，既拿不到下载进度，
 * 也无法缓存（弱网/被墙环境会无限卡在"准备中"）。这里改为：
 *  1. 用 Cache API 把 model.json + 分片缓存到本地（首次显示进度，之后秒开）；
 *  2. 注册自定义 tfjs IOHandler（cachemodel:// 协议）直接从缓存组装 artifacts。
 */
import * as tf from '@tensorflow/tfjs'

const CACHE_NAME = 'formlab-model-v1'
export const MODEL_URL_SCHEME = 'cachemodel://'
export const MODEL_URL = `${MODEL_URL_SCHEME}movenet-singlepose-lightning`

const BASE = import.meta.env.BASE_URL + 'model/movenet-lightning/'
const FILES = [
  { name: 'model.json', size: 168013 },
  { name: 'group1-shard1of2.bin', size: 4194304 },
  { name: 'group1-shard2of2.bin', size: 455912 },
]
const TOTAL_BYTES = FILES.reduce((s, f) => s + f.size, 0)

export type ModelProgress = (loadedBytes: number, totalBytes: number) => void

type MemEntry = { name: string; buf: ArrayBuffer }

// Cache API 不可用时的内存兜底（每次会话内有效）
const memStore = new Map<string, MemEntry>()

let cachedBytes = { loaded: 0 }

async function openCache(): Promise<Cache | null> {
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null // 非安全上下文或旧内核，走内存兜底
  }
}

function cacheKey(name: string): string {
  return BASE + name
}

async function readFromCache(
  cache: Cache | null,
  name: string,
): Promise<ArrayBuffer | null> {
  const mem = memStore.get(name)
  if (mem) return mem.buf
  if (!cache) return null
  try {
    const hit = await cache.match(cacheKey(name))
    if (hit) return await hit.arrayBuffer()
  } catch {
    /* ignore */
  }
  return null
}

async function downloadWithProgress(
  name: string,
  onProgress: ModelProgress,
): Promise<ArrayBuffer> {
  const res = await fetch(cacheKey(name))
  if (!res.ok) throw new Error(`模型文件下载失败（HTTP ${res.status}）`)
  const buf = await res.arrayBuffer()
  cachedBytes.loaded += buf.byteLength
  onProgress(Math.min(cachedBytes.loaded, TOTAL_BYTES), TOTAL_BYTES)
  return buf
}

async function ensureFile(
  cache: Cache | null,
  name: string,
  onProgress: ModelProgress,
): Promise<ArrayBuffer> {
  const hit = await readFromCache(cache, name)
  if (hit) {
    cachedBytes.loaded += hit.byteLength
    onProgress(Math.min(cachedBytes.loaded, TOTAL_BYTES), TOTAL_BYTES)
    return hit
  }
  const buf = await downloadWithProgress(name, onProgress)
  memStore.set(name, { name, buf })
  if (cache) {
    try {
      await cache.put(cacheKey(name), new Response(buf.slice(0)))
    } catch {
      /* 存储满/隐私模式：忽略，本次会话走内存 */
    }
  }
  return buf
}

/** 确保模型文件就绪（有缓存直接命中，否则带进度下载），返回缓存句柄供 handler 读取 */
export async function ensureModelCached(onProgress: ModelProgress): Promise<Cache | null> {
  cachedBytes = { loaded: 0 }
  const cache = await openCache()
  for (const f of FILES) {
    await ensureFile(cache, f.name, onProgress)
  }
  return cache
}

/* ---------- tfjs IOHandler：从缓存组装 ModelArtifacts ---------- */

interface Group {
  paths: string[]
  weights: { name: string; shape: number[]; dtype: string }[]
}

async function loadArtifacts(cache: Cache | null): Promise<{
  modelTopology: unknown
  weightSpecs: { name: string; shape: number[]; dtype: string }[]
  weightData: ArrayBuffer
}> {
  const jsonBuf = await readFromCache(cache, 'model.json')
  if (!jsonBuf) throw new Error('模型尚未缓存')
  const manifest = JSON.parse(new TextDecoder().decode(jsonBuf)) as {
    modelTopology?: unknown
    weightsManifest?: Group[]
  }

  const weightSpecs: Group['weights'] = []
  const buffers: ArrayBuffer[] = []
  for (const group of manifest.weightsManifest ?? []) {
    weightSpecs.push(...group.weights)
    for (const p of group.paths) {
      const buf = await readFromCache(cache, p)
      if (!buf) throw new Error(`权重分片缺失：${p}`)
      buffers.push(buf)
    }
  }

  const total = buffers.reduce((s, b) => s + b.byteLength, 0)
  const weightData = new Uint8Array(total)
  let off = 0
  for (const b of buffers) {
    weightData.set(new Uint8Array(b), off)
    off += b.byteLength
  }

  return {
    modelTopology: manifest.modelTopology ?? manifest,
    weightSpecs,
    weightData: weightData.buffer,
  }
}

let routerRegistered = false

/** 注册 cachemodel:// 加载路由（幂等）。ctx 为 ensureModelCached 返回的缓存句柄 */
export function registerModelRouter(cache: Cache | null): void {
  if (routerRegistered) return
  // tfjs v4：注册路由函数本身，由路由自行按 URL 前缀匹配；运行时支持返回 null 过滤
  const router = (url: string | string[]) => {
    if (typeof url !== 'string' || !url.startsWith(MODEL_URL_SCHEME)) return null
    return { load: () => loadArtifacts(cache) }
  }
  tf.io.registerLoadRouter(router as Parameters<typeof tf.io.registerLoadRouter>[0])
  routerRegistered = true
}
