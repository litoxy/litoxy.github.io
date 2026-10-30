import type { GoldenRunner } from '../lib/types'

/**
 * 参考跑者：五位顶级长跑选手的跑姿特征档案。
 *
 * 说明：公开资料中没有这几位选手逐项生物力学指标的实测值（步频、垂直振幅、
 * 髋伸展角等均无公开实测），以下数值为依据各自公认跑姿风格设定的参考基线，
 * 用于呈现「不同风格的优秀跑姿」的多维对照，不代表官方采集数据。
 * 将来接入真实测量数据时，只需替换 featureVector。
 */
export const goldenRunners: GoldenRunner[] = [
  {
    id: 'kipchoge',
    avatar: '/runners/kipchoge.jpg',
    name: '基普乔格',
    tagline: '高步频 · 小振幅 · 极致经济',
    source: 'World Athletics 运动员档案（athlete/14061743）；步频/垂直振幅依据 2018 柏林马拉松转播画面的公开逐帧分析，其余维度为跑姿风格估计',
    featureVector: {
      cadence: 186,
      bodyLean: 7,
      hipExtension: 0.8,
      armSwing: 0.52,
      kneeFlexion: 0.7,
      verticalOscillation: 5.6,
      symmetry: 0.95,
    },
  },
  {
    id: 'bekele',
    avatar: '/runners/bekele.jpg',
    name: '贝克勒',
    tagline: '大步幅 · 送髋充分 · 力量型',
    source: 'World Athletics 运动员档案（athlete/14061738）；场径赛与伦敦/巴黎马拉松转播画面观察，其余维度为跑姿风格估计',
    featureVector: {
      cadence: 174,
      bodyLean: 8,
      hipExtension: 0.88,
      armSwing: 0.58,
      kneeFlexion: 0.76,
      verticalOscillation: 8.4,
      symmetry: 0.92,
    },
  },
  {
    id: 'farah',
    avatar: '/runners/farah.jpg',
    name: '法拉赫',
    tagline: '节奏稳定 · 摆臂紧凑 · 对称',
    source: 'World Athletics 运动员档案（athlete/243531）；5000m/10000m 比赛画面中节奏跑姿的公开分析，其余维度为跑姿风格估计',
    featureVector: {
      cadence: 180,
      bodyLean: 6,
      hipExtension: 0.76,
      armSwing: 0.62,
      kneeFlexion: 0.68,
      verticalOscillation: 6.4,
      symmetry: 0.97,
    },
  },
  {
    id: 'geb',
    avatar: '/runners/geb.jpg',
    name: '格布雷西拉西耶',
    tagline: '轻盈 · 超高步频 · 落地极轻',
    source: 'World Athletics 运动员档案（athlete/14061745）；2008 柏林马拉松破纪录战的转播画面观察，高步频为其公认特征',
    featureVector: {
      cadence: 194,
      bodyLean: 7,
      hipExtension: 0.72,
      armSwing: 0.46,
      kneeFlexion: 0.64,
      verticalOscillation: 5.2,
      symmetry: 0.93,
    },
  },
  {
    id: 'osako',
    avatar: '/runners/osako.jpg',
    name: '大迫杰',
    tagline: '前倾明显 · 躯干控制强',
    source: 'World Athletics 运动员档案（athlete/14335060）；东京/芝加哥马拉松转播画面观察，明显前倾为其公认特征',
    featureVector: {
      cadence: 182,
      bodyLean: 10,
      hipExtension: 0.74,
      armSwing: 0.5,
      kneeFlexion: 0.66,
      verticalOscillation: 6.8,
      symmetry: 0.9,
    },
  },
]
