/**
 * 图片卡片主题定义
 * 每个主题通过 CSS 变量驱动统一外观
 */

const BASE_VARS = {
  '--wf-frame-a': '#f7f2d9',
  '--wf-frame-b': '#dff2ff',
  '--wf-frame-c': '#fff2e6',
  '--wf-card-bg': 'rgba(255, 255, 255, 0.9)',
  '--wf-card-border': 'rgba(152, 183, 201, 0.38)',
  '--wf-card-shadow': 'rgba(119, 146, 166, 0.2)',
  '--wf-section-bg': 'rgba(243, 250, 255, 0.96)',
  '--wf-section-border': 'rgba(183, 209, 223, 0.52)',
  '--wf-text': '#2a4354',
  '--wf-title': '#213949',
  '--wf-subtitle': '#657b8d',
  '--wf-label': '#718796',
  '--wf-muted': '#58707f',
  '--wf-track': '#dce9f0',
  '--wf-pill-bg': 'rgba(230, 243, 250, 0.95)',
  '--wf-pill-border': 'rgba(183, 209, 223, 0.74)',
  '--wf-pill-text': '#466071',
  '--wf-accent-a': '#ffbf69',
  '--wf-accent-b': '#f58f7c',
}

function createTheme(definition) {
  return {
    ...definition,
    vars: {
      ...BASE_VARS,
      ...(definition.vars || {}),
    },
  }
}

const CARD_THEMES = [
  createTheme({
    id: 'cream-paper',
    name: '奶油纸张',
    aliases: ['奶油', '纸张', 'paper', 'cream'],
    description: '米白纸张感，柔和暖光，适合大多数卡片。',
    vars: {
      '--wf-frame-a': '#f9f1da',
      '--wf-frame-b': '#eaf4ef',
      '--wf-frame-c': '#fff6e9',
      '--wf-card-bg': 'rgba(255, 253, 248, 0.94)',
      '--wf-card-border': 'rgba(198, 188, 165, 0.48)',
      '--wf-card-shadow': 'rgba(170, 155, 124, 0.16)',
      '--wf-section-bg': 'rgba(255, 251, 243, 0.94)',
      '--wf-section-border': 'rgba(221, 208, 183, 0.56)',
      '--wf-text': '#53473a',
      '--wf-title': '#43372d',
      '--wf-subtitle': '#867565',
      '--wf-label': '#8d7b68',
      '--wf-muted': '#6f604f',
      '--wf-track': '#ece2d1',
      '--wf-pill-bg': 'rgba(251, 244, 230, 0.98)',
      '--wf-pill-border': 'rgba(221, 208, 183, 0.8)',
      '--wf-pill-text': '#6f604f',
      '--wf-accent-a': '#f1b774',
      '--wf-accent-b': '#d98e6d',
    },
  }),
  createTheme({
    id: 'sky-glass',
    name: '晴天玻璃',
    aliases: ['晴天', '玻璃', 'sky', 'glass', 'blue'],
    description: '偏浅蓝和薄荷白，像晴天窗边的玻璃卡片。',
    vars: {
      '--wf-frame-a': '#eef8ff',
      '--wf-frame-b': '#dff4ff',
      '--wf-frame-c': '#f6fbff',
      '--wf-card-bg': 'rgba(255, 255, 255, 0.88)',
      '--wf-card-border': 'rgba(163, 203, 227, 0.52)',
      '--wf-card-shadow': 'rgba(135, 177, 204, 0.18)',
      '--wf-section-bg': 'rgba(245, 251, 255, 0.92)',
      '--wf-section-border': 'rgba(191, 219, 235, 0.68)',
      '--wf-text': '#27475b',
      '--wf-title': '#1d3a4d',
      '--wf-subtitle': '#638195',
      '--wf-label': '#6f8d9f',
      '--wf-muted': '#557387',
      '--wf-track': '#d9eaf4',
      '--wf-pill-bg': 'rgba(235, 247, 255, 0.98)',
      '--wf-pill-border': 'rgba(191, 219, 235, 0.82)',
      '--wf-pill-text': '#47677a',
      '--wf-accent-a': '#74c2f5',
      '--wf-accent-b': '#7fd6c2',
    },
  }),
  createTheme({
    id: 'morning-cafe',
    name: '晨光咖啡馆',
    aliases: ['晨光', '咖啡馆', 'cafe', 'coffee', 'warm'],
    description: '偏暖米色和杏橙色，像清晨窗边的咖啡馆纸卡。',
    vars: {
      '--wf-frame-a': '#fff3e6',
      '--wf-frame-b': '#ffe7d6',
      '--wf-frame-c': '#fff8f0',
      '--wf-card-bg': 'rgba(255, 252, 247, 0.94)',
      '--wf-card-border': 'rgba(220, 184, 152, 0.48)',
      '--wf-card-shadow': 'rgba(193, 146, 104, 0.16)',
      '--wf-section-bg': 'rgba(255, 247, 239, 0.94)',
      '--wf-section-border': 'rgba(233, 200, 170, 0.64)',
      '--wf-text': '#5a4134',
      '--wf-title': '#4b3328',
      '--wf-subtitle': '#8d6a55',
      '--wf-label': '#9b775e',
      '--wf-muted': '#795c49',
      '--wf-track': '#f2dcc9',
      '--wf-pill-bg': 'rgba(255, 241, 229, 0.98)',
      '--wf-pill-border': 'rgba(233, 200, 170, 0.84)',
      '--wf-pill-text': '#795c49',
      '--wf-accent-a': '#f3b26b',
      '--wf-accent-b': '#e18a5d',
    },
  }),
]

const DEFAULT_CARD_THEME_ID = 'cream-paper'

function normalizeThemeInput(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function listCardThemes() {
  return CARD_THEMES.slice()
}

function getCardThemeById(themeId) {
  const normalized = normalizeThemeInput(themeId)
  return CARD_THEMES.find(theme => normalizeThemeInput(theme.id) === normalized) || null
}

function resolveCardTheme(input) {
  const normalized = normalizeThemeInput(input)
  if (!normalized) return null

  return CARD_THEMES.find((theme) => {
    if (normalizeThemeInput(theme.id) === normalized) return true
    if (normalizeThemeInput(theme.name) === normalized) return true
    return Array.isArray(theme.aliases) && theme.aliases.some(alias => normalizeThemeInput(alias) === normalized)
  }) || null
}

module.exports = {
  DEFAULT_CARD_THEME_ID,
  listCardThemes,
  getCardThemeById,
  resolveCardTheme,
}
