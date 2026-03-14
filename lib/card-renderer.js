function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const {
  DEFAULT_CARD_THEME_ID,
  listCardThemes,
  getCardThemeById,
  resolveCardTheme,
} = require('../data/card_themes')

function hasPuppeteer(ctx) {
  return !!ctx?.puppeteer?.render
}

let activeCardThemeId = DEFAULT_CARD_THEME_ID

function getActiveCardThemeInfo() {
  return getCardThemeById(activeCardThemeId) || getCardThemeById(DEFAULT_CARD_THEME_ID)
}

function setCardTheme(themeId) {
  const theme = getCardThemeById(themeId)
  if (!theme) return null
  activeCardThemeId = theme.id
  return theme
}

function buildThemeRootCss(theme) {
  return Object.entries(theme.vars || {})
    .map(([key, value]) => `          ${key}: ${value};`)
    .join('\n')
}

const ITEM_ICON_SPECS = {
  pumpkin_lantern: { kind: 'lantern', a: '#f3a84f', b: '#7f4b22' },
  bracelet: { kind: 'ring', a: '#d38fb6', b: '#7d4869' },
  flower_crown: { kind: 'crown', a: '#8bcf8b', b: '#dca4cf' },
  fox_brooch: { kind: 'pin', a: '#f2b26a', b: '#9c5f2d' },
  ribbon: { kind: 'bow', a: '#e8899d', b: '#90455d' },
  glasses: { kind: 'glasses', a: '#5d7085', b: '#2b3640' },
  fox_bell: { kind: 'bell', a: '#f4cb68', b: '#916116' },
  tea_cape: { kind: 'cape', a: '#c49c7b', b: '#77533b' },
  scarf: { kind: 'scarf', a: '#d96a5b', b: '#8e3d34' },
  hairpin: { kind: 'hairpin', a: '#7fd4e0', b: '#397a8a' },
  moon_necklace: { kind: 'pendant', a: '#d9e4ef', b: '#6f8195' },
  sake_bottle: { kind: 'bottle', a: '#7cc4d4', b: '#356d77' },
  silver_compass: { kind: 'compass', a: '#d7dde8', b: '#6a7487' },
  foxfire_lantern: { kind: 'lantern', a: '#78cce6', b: '#315a73' },
  starcloak: { kind: 'cloak', a: '#6d80d8', b: '#354392' },
  sakura_kimono: { kind: 'kimono', a: '#f6bfd3', b: '#c26d91' },
  fate_thread: { kind: 'thread', a: '#e46b72', b: '#8f3342' },
  void_crown: { kind: 'tiara', a: '#8f84e8', b: '#41358c' },
  aurora_feather: { kind: 'feather', a: '#7ccfc2', b: '#5f8ee0' },
  pumpkin_pie: { kind: 'pie', a: '#f1ab53', b: '#98622e' },
  cake: { kind: 'cake', a: '#f7d7dc', b: '#dd91a2' },
  cat_disc: { kind: 'disc', a: '#93cc7a', b: '#4e7f35' },
  firework: { kind: 'spark', a: '#ffb257', b: '#ff6f61' },
  fate_coin: { kind: 'coin', a: '#efc862', b: '#8f6d14' },
  berry_jelly: { kind: 'jelly', a: '#d2618f', b: '#7f2d4b' },
  herb: { kind: 'leaf', a: '#7dc97f', b: '#356f39' },
  sake_premium: { kind: 'cup', a: '#e8efe8', b: '#879487' },
  lucky_rabbit_foot: { kind: 'foot', a: '#f0e6dc', b: '#8a6f58' },
  enchanted_book: { kind: 'book', a: '#8e79d9', b: '#4a3e8f' },
  time_sandglass: { kind: 'hourglass', a: '#e2c487', b: '#8a6a33' },
  cloud_cookie: { kind: 'cookie', a: '#e6d1b3', b: '#9d7a4f' },
  golden_apple: { kind: 'apple', a: '#f3ca4e', b: '#9b7820' },
  mystery_potion: { kind: 'flask', a: '#78b7ef', b: '#8b6ae2' },
  teleport_pearl: { kind: 'pearl', a: '#73d2c6', b: '#30786e' },
  mystery_bottle: { kind: 'bottle', a: '#c77ce6', b: '#6d3890' },
  starlight_cider: { kind: 'bottle', a: '#f7c785', b: '#b46c2e' },
  dragon_breath: { kind: 'flask', a: '#b276e6', b: '#6a3298' },
  mooncake_box: { kind: 'box', a: '#f2d9ae', b: '#98734a' },
}

function getItemIconSpec(item) {
  const id = typeof item === 'string' ? item : item?.iconId || item?.id
  return ITEM_ICON_SPECS[id] || { kind: 'box', a: '#b7cad8', b: '#647685' }
}

function renderItemIcon(item, size = 52) {
  const spec = getItemIconSpec(item)
  const { kind, a, b } = spec
  const viewBox = '0 0 64 64'
  const defs = `<defs><linearGradient id="grad-${kind}-${a.replace('#', '')}" x1="0" x2="1"><stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/></linearGradient></defs>`
  const fill = `url(#grad-${kind}-${a.replace('#', '')})`
  let shape = ''

  switch (kind) {
    case 'lantern':
      shape = `<rect x="18" y="18" width="28" height="30" rx="8" fill="${fill}"/><rect x="24" y="12" width="16" height="8" rx="3" fill="${b}"/><rect x="25" y="24" width="14" height="14" rx="5" fill="rgba(255,255,255,0.62)"/>`
      break
    case 'ring':
      shape = `<circle cx="32" cy="32" r="16" fill="none" stroke="${a}" stroke-width="8"/><circle cx="32" cy="18" r="6" fill="${b}"/>`
      break
    case 'crown':
      shape = `<path d="M14 44l5-22 13 10 13-10 5 22z" fill="${fill}"/><circle cx="19" cy="22" r="4" fill="${b}"/><circle cx="32" cy="17" r="5" fill="${a}"/><circle cx="45" cy="22" r="4" fill="${b}"/>`
      break
    case 'pin':
      shape = `<circle cx="28" cy="26" r="12" fill="${fill}"/><path d="M39 36l10 10" stroke="${b}" stroke-width="6" stroke-linecap="round"/><path d="M24 23c6 0 10 4 12 8" stroke="rgba(255,255,255,0.5)" stroke-width="4" stroke-linecap="round"/>`
      break
    case 'bow':
      shape = `<path d="M12 32c0-10 12-16 20-10l0 20c-8 6-20 0-20-10z" fill="${a}"/><path d="M52 32c0-10-12-16-20-10l0 20c8 6 20 0 20-10z" fill="${b}"/><rect x="27" y="26" width="10" height="12" rx="4" fill="#f6e8d5"/>`
      break
    case 'glasses':
      shape = `<circle cx="23" cy="34" r="10" fill="none" stroke="${b}" stroke-width="5"/><circle cx="41" cy="34" r="10" fill="none" stroke="${b}" stroke-width="5"/><path d="M13 24l-6-3M51 24l6-3M33 34h-2" stroke="${a}" stroke-width="4" stroke-linecap="round"/>`
      break
    case 'bell':
      shape = `<path d="M20 46c0-13 4-24 12-24s12 11 12 24z" fill="${fill}"/><rect x="25" y="16" width="14" height="8" rx="3" fill="${b}"/><circle cx="32" cy="48" r="4" fill="${b}"/>`
      break
    case 'cape':
      shape = `<path d="M20 16h24l6 34H14z" fill="${fill}"/><circle cx="32" cy="18" r="5" fill="#f7f3ed"/>`
      break
    case 'scarf':
      shape = `<path d="M18 20h28v12H18z" fill="${fill}"/><path d="M20 32h10v18H20zM34 32h10v14H34z" fill="${b}"/>`
      break
    case 'hairpin':
      shape = `<path d="M18 42l24-24" stroke="${b}" stroke-width="5" stroke-linecap="round"/><circle cx="46" cy="18" r="8" fill="${fill}"/>`
      break
    case 'pendant':
      shape = `<path d="M32 10v10" stroke="${b}" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="32" r="14" fill="${fill}"/><path d="M32 22a10 10 0 100 20 8 8 0 110-20z" fill="rgba(255,255,255,0.72)"/>`
      break
    case 'bottle':
      shape = `<rect x="24" y="10" width="16" height="10" rx="3" fill="${b}"/><path d="M20 18h24l-3 32H23z" fill="${fill}"/><rect x="24" y="30" width="16" height="10" rx="4" fill="rgba(255,255,255,0.42)"/>`
      break
    case 'compass':
      shape = `<circle cx="32" cy="32" r="18" fill="${fill}"/><circle cx="32" cy="32" r="5" fill="#f7f3ed"/><path d="M32 18l5 17-5 4-5-4z" fill="${b}"/>`
      break
    case 'cloak':
      shape = `<path d="M16 16l16-6 16 6-4 34H20z" fill="${fill}"/><circle cx="24" cy="24" r="2" fill="#fff"/><circle cx="39" cy="20" r="2.5" fill="#fff"/><circle cx="34" cy="30" r="2" fill="#fff"/>`
      break
    case 'kimono':
      shape = `<path d="M18 16l10 8 4-6 4 6 10-8 4 34H14z" fill="${fill}"/><path d="M24 34c4-3 12-3 16 0" stroke="#fff4" stroke-width="3"/>`
      break
    case 'thread':
      shape = `<path d="M14 22c10-10 26-10 36 0" stroke="${a}" stroke-width="5" fill="none"/><path d="M16 42c12-8 20-8 32 0" stroke="${b}" stroke-width="5" fill="none"/><circle cx="20" cy="42" r="4" fill="${a}"/><circle cx="44" cy="42" r="4" fill="${b}"/>`
      break
    case 'tiara':
      shape = `<path d="M14 42l6-18 12 10 12-10 6 18z" fill="${fill}"/><circle cx="20" cy="24" r="4" fill="#fdf7da"/><circle cx="32" cy="18" r="5" fill="#fdf7da"/><circle cx="44" cy="24" r="4" fill="#fdf7da"/>`
      break
    case 'feather':
      shape = `<path d="M20 46c18-4 28-16 24-28-12 2-24 12-28 28z" fill="${fill}"/><path d="M22 44c8-10 16-18 24-24" stroke="${b}" stroke-width="3" stroke-linecap="round"/>`
      break
    case 'pie':
      shape = `<path d="M12 40a20 20 0 1040 0z" fill="${a}"/><path d="M20 24h24" stroke="${b}" stroke-width="6" stroke-linecap="round"/><path d="M16 40h32" stroke="${b}" stroke-width="4"/>`
      break
    case 'cake':
      shape = `<rect x="18" y="26" width="28" height="20" rx="6" fill="${fill}"/><path d="M18 26c4-5 8 5 12 0s8 5 16 0" fill="#fff0" stroke="#fff8" stroke-width="4"/><rect x="29" y="14" width="6" height="12" rx="2" fill="${b}"/>`
      break
    case 'disc':
      shape = `<circle cx="32" cy="32" r="18" fill="${fill}"/><circle cx="32" cy="32" r="5" fill="#f7f3ed"/><circle cx="42" cy="24" r="3" fill="${b}"/>`
      break
    case 'spark':
      shape = `<path d="M32 10l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" fill="${fill}"/><circle cx="46" cy="18" r="4" fill="${b}"/><circle cx="18" cy="44" r="3" fill="${a}"/>`
      break
    case 'coin':
      shape = `<circle cx="32" cy="32" r="18" fill="${fill}"/><circle cx="32" cy="32" r="12" fill="none" stroke="${b}" stroke-width="3"/><path d="M32 22v20M24 32h16" stroke="${b}" stroke-width="3"/>`
      break
    case 'jelly':
      shape = `<path d="M18 28c0-8 8-14 14-14s14 6 14 14v12c0 6-6 10-14 10s-14-4-14-10z" fill="${fill}"/><path d="M18 32h28" stroke="rgba(255,255,255,0.4)" stroke-width="3"/>`
      break
    case 'leaf':
      shape = `<path d="M16 40c0-16 16-24 32-24 0 16-8 32-24 32-4 0-8-4-8-8z" fill="${fill}"/><path d="M20 42c8-8 16-16 24-22" stroke="${b}" stroke-width="3"/>`
      break
    case 'cup':
      shape = `<path d="M18 22h24v12c0 8-4 14-12 14s-12-6-12-14z" fill="${fill}"/><path d="M42 24h6c4 0 4 10-2 10h-4" stroke="${b}" stroke-width="4" fill="none"/>`
      break
    case 'foot':
      shape = `<path d="M18 42c0-8 6-16 14-16s14 8 14 16z" fill="${fill}"/><circle cx="22" cy="20" r="4" fill="${b}"/><circle cx="30" cy="16" r="4" fill="${b}"/><circle cx="38" cy="17" r="4" fill="${b}"/>`
      break
    case 'book':
      shape = `<path d="M16 18h16c4 0 8 2 8 6v24H22c-4 0-6-2-6-6z" fill="${a}"/><path d="M48 18H32c-4 0-8 2-8 6v24h18c4 0 6-2 6-6z" fill="${b}"/><path d="M32 18v30" stroke="#f7f3ed" stroke-width="3"/>`
      break
    case 'hourglass':
      shape = `<path d="M22 12h20M24 16c0 8 8 10 8 16s-8 8-8 16M40 16c0 8-8 10-8 16s8 8 8 16M22 52h20" stroke="${b}" stroke-width="4" fill="none"/><path d="M26 24h12l-6 8z" fill="${a}"/><path d="M26 42h12l-6-8z" fill="${fill}"/>`
      break
    case 'cookie':
      shape = `<path d="M18 34a14 14 0 1028 0 14 14 0 10-28 0z" fill="${fill}"/><circle cx="26" cy="28" r="2" fill="${b}"/><circle cx="38" cy="30" r="2" fill="${b}"/><circle cx="30" cy="38" r="2" fill="${b}"/>`
      break
    case 'apple':
      shape = `<path d="M32 20c8-10 24 0 18 18-4 12-10 16-18 16s-14-4-18-16c-6-18 10-28 18-18z" fill="${fill}"/><path d="M32 20c-2-6 2-10 8-12" stroke="${b}" stroke-width="4" fill="none"/>`
      break
    case 'flask':
      shape = `<rect x="26" y="10" width="12" height="10" rx="3" fill="${b}"/><path d="M22 18h20l-4 8v16c0 6-4 10-10 10s-10-4-10-10V26z" fill="${fill}"/><path d="M22 34h20" stroke="rgba(255,255,255,0.45)" stroke-width="3"/>`
      break
    case 'pearl':
      shape = `<circle cx="32" cy="32" r="16" fill="${fill}"/><circle cx="27" cy="27" r="5" fill="rgba(255,255,255,0.62)"/>`
      break
    case 'box':
    default:
      shape = `<rect x="16" y="18" width="32" height="28" rx="6" fill="${fill}"/><path d="M16 28h32M32 18v28" stroke="${b}" stroke-width="3"/>`
      break
  }

  return `<svg class="item-icon-svg" viewBox="${viewBox}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${defs}${shape}</svg>`
}

function measureTextUnits(text) {
  const source = String(text || '')
  let units = 0
  for (const char of source) {
    if (/\s/.test(char)) units += 0.4
    else if (/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(char)) units += 1
    else units += 0.58
  }
  return units
}

function estimateHelpGroupWidth(group) {
  const items = Array.isArray(group?.items) ? group.items : []
  const titleUnits = measureTextUnits(group?.title || '')
  let maxUnits = titleUnits * 0.9

  for (const item of items) {
    const labelUnits = measureTextUnits(item?.[0] || '')
    const descUnits = measureTextUnits(item?.[1] || '')
    maxUnits = Math.max(maxUnits, labelUnits * 1.02, descUnits * 0.84)
  }

  const denseBonus = group?.dense ? 8 : 0
  const compactBonus = group?.compact ? -10 : 0
  const baseWidth = 84 + maxUnits * 10.5 + denseBonus + compactBonus
  return Math.max(175, Math.min(285, Math.round(baseWidth)))
}

function buildHelpRows(groups, maxRowWidth = 1080, gap = 10) {
  const safeGroups = Array.isArray(groups) ? groups.map((group) => ({
    ...group,
    renderWidth: estimateHelpGroupWidth(group),
  })) : []

  const rows = []
  let currentRow = []
  let currentWidth = 0

  for (const group of safeGroups) {
    const nextWidth = currentRow.length === 0
      ? group.renderWidth
      : currentWidth + gap + group.renderWidth

    if (currentRow.length > 0 && nextWidth > maxRowWidth) {
      rows.push(currentRow)
      currentRow = [group]
      currentWidth = group.renderWidth
    } else {
      currentRow.push(group)
      currentWidth = nextWidth
    }
  }

  if (currentRow.length > 0) rows.push(currentRow)

  const widestRow = rows.reduce((max, row) => {
    const rowWidth = row.reduce((sum, group, index) => sum + group.renderWidth + (index > 0 ? gap : 0), 0)
    return Math.max(max, rowWidth)
  }, 0)

  return {
    rows,
    cardWidth: Math.max(820, Math.min(1160, widestRow + 36)),
  }
}

function splitLongSegment(text, maxLength) {
  const parts = []
  let remaining = String(text || '').trim()
  while (remaining.length > maxLength) {
    parts.push(remaining.slice(0, maxLength))
    remaining = remaining.slice(maxLength).trimStart()
  }
  if (remaining) parts.push(remaining)
  return parts
}

function paginateStoryText(text) {
  const normalized = String(text || '').trim()
  if (!normalized) {
    return { pageCount: 1, fontSizeLevel: 1, pages: [''] }
  }

  const budgetsByLevel = { 1: 920, 2: 720, 3: 560 }
  for (const level of [1, 2, 3]) {
    const budget = budgetsByLevel[level]
    const rawParagraphs = normalized.split(/\n+/).map(part => part.trim()).filter(Boolean)
    const paragraphs = rawParagraphs.flatMap(part => splitLongSegment(part, budget))
    const pages = []
    let current = ''

    for (const part of paragraphs) {
      const next = current ? `${current}\n\n${part}` : part
      if (next.length <= budget) {
        current = next
        continue
      }
      if (current) pages.push(current)
      current = part
    }
    if (current) pages.push(current)

    if (pages.length <= level) {
      return {
        pageCount: Math.max(1, pages.length),
        fontSizeLevel: level,
        pages,
      }
    }
  }

  const finalBudget = budgetsByLevel[3]
  const hardSegments = splitLongSegment(normalized, finalBudget)
  const pages = hardSegments.slice(0, 3)
  if (hardSegments.length > 3) {
    pages[2] = `${pages[2]}\n\n（内容过长已截断）`
  }

  return {
    pageCount: pages.length,
    fontSizeLevel: 3,
    pages,
  }
}

function renderCard(ctx, html) {
  return ctx.puppeteer.render(html, async (page, next) => {
    const handle = await page.$('.frame')
    return next(handle || undefined)
  })
}

function buildShell(title, subtitle, content, options = {}) {
  const theme = getActiveCardThemeInfo()
  const themeVarsCss = buildThemeRootCss(theme)
  const cardWidth = Number(options.cardWidth) > 0 ? Number(options.cardWidth) : 680
  const cardClass = options.cardClass ? ` ${options.cardClass}` : ''
  return `
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8">
      <style>
        :root {
${themeVarsCss}
        }
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: max-content;
          height: max-content;
          background: transparent;
        }
        body {
          display: inline-block;
          font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
          color: var(--wf-text);
        }
        .frame {
          display: inline-block;
          padding: 12px;
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(255, 255, 255, 0.58), transparent 32%),
            linear-gradient(135deg, var(--wf-frame-a) 0%, var(--wf-frame-b) 48%, var(--wf-frame-c) 100%);
        }
        .card {
          width: 680px;
          padding: 22px;
          border-radius: 22px;
          background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(250,253,255,0.9));
          border: 1px solid var(--wf-card-border);
          box-shadow: 0 16px 38px var(--wf-card-shadow);
        }
        .header { margin-bottom: 18px; }
        .title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          color: var(--wf-title);
        }
        .subtitle {
          font-size: 15px;
          color: var(--wf-subtitle);
        }
        .section {
          margin-top: 14px;
          padding: 16px 18px;
          border-radius: 16px;
          background: var(--wf-section-bg);
          border: 1px solid var(--wf-section-border);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .label {
          font-size: 13px;
          color: var(--wf-label);
          margin-bottom: 8px;
        }
        .value {
          font-size: 22px;
          font-weight: 700;
          color: var(--wf-title);
        }
        .muted {
          color: var(--wf-muted);
          font-size: 15px;
          line-height: 1.6;
        }
        .progress-track {
          width: 100%;
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: var(--wf-track);
          margin: 10px 0 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, var(--wf-accent-a) 0%, var(--wf-accent-b) 100%);
        }
        .pill-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .pill {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 999px;
          background: var(--wf-pill-bg);
          border: 1px solid var(--wf-pill-border);
          color: var(--wf-pill-text);
          font-size: 14px;
          line-height: 1.4;
        }
        .color-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .color-dot {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,0.96);
          background: linear-gradient(135deg, var(--wf-accent-a) 0%, var(--wf-accent-b) 100%);
          flex: 0 0 auto;
        }
        .footer {
          margin-top: 18px;
          font-size: 12px;
          color: var(--wf-label);
          text-align: right;
        }
        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }
        .calendar-weekdays {
          margin-bottom: 10px;
          font-size: 13px;
          color: var(--wf-label);
          text-align: center;
        }
        .calendar-cell {
          min-height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.76);
          border: 1px solid rgba(183, 209, 223, 0.6);
          font-weight: 700;
          color: var(--wf-title);
        }
        .calendar-cell.empty {
          background: transparent;
          border-color: transparent;
        }
        .calendar-cell.checked {
          background: rgba(255, 238, 196, 0.96);
        }
        .calendar-cell.today {
          border-color: rgba(245, 143, 124, 0.88);
        }
        .calendar-cell.today-checked {
          background: linear-gradient(135deg, rgba(255, 238, 196, 0.98), rgba(255, 223, 207, 0.95));
          border-color: rgba(245, 143, 124, 0.9);
        }
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .timeline-item {
          padding-left: 14px;
          border-left: 3px solid rgba(255, 191, 105, 0.7);
        }
        .timeline-date {
          font-size: 13px;
          color: var(--wf-label);
          margin-bottom: 4px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .shop-list,
        .inventory-grid {
          display: grid;
          gap: 12px;
        }
        .shop-list {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
        .inventory-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .shop-item,
        .inventory-item {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.74);
          border: 1px solid rgba(183, 209, 223, 0.64);
        }
        .item-shell {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }
        .item-visual {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(236, 246, 251, 0.92));
          border: 1px solid rgba(183, 209, 223, 0.68);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .item-icon-svg {
          display: block;
          width: 46px;
          height: 46px;
        }
        .item-copy {
          min-width: 0;
        }
        .inventory-item.equipped {
          border-color: rgba(255, 191, 105, 0.92);
          background: rgba(255, 239, 206, 0.92);
        }
        .item-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .shop-item strong {
          font-size: 14px;
          line-height: 1.45;
        }
        .shop-item .muted {
          font-size: 13px;
          line-height: 1.55;
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(229, 243, 252, 0.96);
          border: 1px solid rgba(183, 209, 223, 0.74);
          color: var(--wf-pill-text);
          font-size: 12px;
        }
        .count-badge {
          font-size: 12px;
          color: var(--wf-label);
        }
        .story-body {
          white-space: pre-wrap;
          line-height: 1.85;
          color: var(--wf-text);
        }
        .story-body.story-font-1 {
          font-size: 18px;
        }
        .story-body.story-font-2 {
          font-size: 17px;
        }
        .story-body.story-font-3 {
          font-size: 16px;
        }
        .brewing-hero {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 18px;
          align-items: center;
        }
        .brewing-svg,
        .brewing-mini-svg {
          width: 100%;
          display: block;
        }
        .brewing-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .brewing-summary-card,
        .brewing-recent-item,
        .brewing-pill-card {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.76);
          border: 1px solid rgba(183, 209, 223, 0.64);
        }
        .quality-badge {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(255, 231, 186, 0.98), rgba(255, 219, 205, 0.95));
          border: 1px solid rgba(245, 143, 124, 0.3);
          color: #825842;
          font-size: 12px;
        }
        .story-catalog-item,
        .weather-panel,
        .mood-panel {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.76);
          border: 1px solid rgba(183, 209, 223, 0.64);
        }
        .achievement-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .help-row,
        .achievement-item,
        .ranking-item,
        .collection-item {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(255,255,255,0.76);
          border: 1px solid rgba(183, 209, 223, 0.64);
        }
        .achievement-item.unlocked {
          border-color: rgba(255, 191, 105, 0.9);
          background: rgba(255, 239, 206, 0.92);
        }
        .help-rows {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .help-layout-row {
          display: flex;
          gap: 10px;
          align-items: start;
        }
        .help-group {
          margin-top: 0;
          padding: 12px 14px;
        }
        .help-group.compact {
          padding: 10px 12px;
        }
        .help-group.dense .help-items,
        .help-group.compact .help-items {
          gap: 6px;
        }
        .help-group .label {
          margin-bottom: 8px;
          font-size: 12px;
        }
        .help-items {
          display: grid;
          gap: 8px;
        }
        .help-row {
          padding: 10px 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.82);
          border: 1px solid rgba(183, 209, 223, 0.52);
        }
        .help-group.dense .help-row,
        .help-group.compact .help-row {
          padding: 8px 10px;
        }
        .help-row .item-head {
          margin-bottom: 2px;
        }
        .help-row strong {
          font-size: 13px;
          color: var(--wf-title);
          line-height: 1.35;
        }
        .help-row .muted {
          font-size: 12px;
          line-height: 1.45;
        }
        @media (max-width: 1080px) {
          .shop-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .help-layout-row {
            flex-wrap: wrap;
          }
        }
        @media (max-width: 760px) {
          .shop-list {
            grid-template-columns: 1fr;
          }
          .help-layout-row {
            flex-direction: column;
          }
        }
      </style>
    </head>
    <body>
      <div class="frame">
        <div class="card${cardClass}" style="width: ${cardWidth}px;">
          <div class="header">
            <div class="title">${escapeHtml(title)}</div>
            <div class="subtitle">${escapeHtml(subtitle)}</div>
          </div>
          ${content}
          <div class="footer">WineFox-Daily · 酒狐悄悄话图片卡片</div>
        </div>
      </div>
    </body>
  </html>`
}

function renderFortuneCard(ctx, payload) {
  const userName = escapeHtml(payload.userName || '主人')
  const data = payload.data || {}
  const progressWidth = Math.max(0, Math.min(100, Number(data.luck) || 0))
  const goods = Array.isArray(data.goods) ? data.goods : []
  const bads = Array.isArray(data.bads) ? data.bads : []
  const ticketReward = Number(data.ticketReward || 0)

  const content = `
    <div class="section">
      <div class="label">今日幸运指数</div>
      <div class="value">${escapeHtml(data.luck)}/100</div>
      <div class="progress-track"><div class="progress-fill" style="width: ${progressWidth}%"></div></div>
      <div class="muted">${escapeHtml('★'.repeat(Math.max(1, Math.ceil(progressWidth / 20))))}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">幸运色</div>
        <div class="value color-chip"><span class="color-dot"></span><span>${escapeHtml(data.color)}</span></div>
      </div>
      <div class="section">
        <div class="label">幸运方位</div>
        <div class="value">${escapeHtml(data.direction)}</div>
      </div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">宜</div>
        <div class="pill-list">${goods.map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>
      </div>
      <div class="section">
        <div class="label">忌</div>
        <div class="pill-list">${bads.map(item => `<span class="pill">${escapeHtml(item)}</span>`).join('')}</div>
      </div>
    </div>
    <div class="section">
      <div class="label">酒狐解读</div>
      <div class="muted">${escapeHtml(data.commentText)}</div>
    </div>
    ${ticketReward > 0 ? `<div class="section"><div class="label">今日奖励</div><div class="value">狐狐券 +${escapeHtml(ticketReward)}</div></div>` : ''}
  `

  return renderCard(ctx, buildShell('酒狐占卜', `${userName} 的今日运势`, content))
}

function renderAffinityCard(ctx, payload) {
  const userName = escapeHtml(payload.userName || '主人')
  const status = payload.status || {}
  const level = status.level || {}
  const nextLevel = status.nextLevel || null
  const progressMatch = typeof status.progress === 'string' ? status.progress.match(/(\d+)%/) : null
  const progressWidth = progressMatch ? Number(progressMatch[1]) : (nextLevel ? 0 : 100)

  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">当前等级</div>
        <div class="value">Lv${escapeHtml(level.level)} · ${escapeHtml(level.name)}</div>
      </div>
      <div class="section">
        <div class="label">当前好感</div>
        <div class="value">${escapeHtml(status.points)} 点</div>
      </div>
      <div class="section">
        <div class="label">当前狐狐券</div>
        <div class="value">${escapeHtml(status.tickets || 0)} 张</div>
      </div>
    </div>
    <div class="section">
      <div class="label">升级进度</div>
      <div class="progress-track"><div class="progress-fill" style="width: ${Math.max(0, Math.min(100, progressWidth))}%"></div></div>
      <div class="muted">${escapeHtml(status.progress || '暂无进度信息')}</div>
    </div>
    <div class="section">
      <div class="label">下一等级</div>
      <div class="muted">${nextLevel ? escapeHtml(`${nextLevel.name}（需要 ${nextLevel.minPoints} 点）`) : '已达到当前最高等级'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐好感面板', `${userName} 与酒狐的羁绊状态`, content))
}

function renderCheckinCalendarCard(ctx, payload) {
  const userName = escapeHtml(payload.userName || '主人')
  const data = payload.data || {}
  const weekdays = Array.isArray(data.weekdays) ? data.weekdays : ['一', '二', '三', '四', '五', '六', '日']
  const cells = Array.isArray(data.cells) ? data.cells : []
  const leading = Array.from({ length: Math.max(0, Number(data.startWeekday) || 0) }, () => '<div class="calendar-cell empty"></div>').join('')
  const dayCells = cells.map((cell) => {
    const state = escapeHtml(cell.state || 'normal')
    return `<div class="calendar-cell ${state}"><span>${escapeHtml(cell.day)}</span></div>`
  }).join('')

  const content = `
    <div class="section">
      <div class="label">本月签到概览</div>
      <div class="calendar-weekdays">${weekdays.map(day => `<div>${escapeHtml(day)}</div>`).join('')}</div>
      <div class="calendar-grid">${leading}${dayCells}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">本月已签</div>
        <div class="value">${escapeHtml(data.checkedThisMonth)} 天</div>
      </div>
      <div class="section">
        <div class="label">连续签到</div>
        <div class="value">${escapeHtml(data.streak)} 天</div>
      </div>
    </div>
    <div class="section">
      <div class="label">累计签到</div>
      <div class="value">${escapeHtml(data.totalDays)} 天</div>
      <div class="muted">高亮说明：已签、今天、今天已签会以不同样式显示。</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐签到日历', `${userName} · ${escapeHtml(data.monthLabel || '')}`, content))
}

function renderMemoirCard(ctx, payload) {
  const userName = escapeHtml(payload.userName || '主人')
  const data = payload.data || {}
  const status = data.status || {}
  const level = status.level || {}
  const events = Array.isArray(data.events) ? data.events.slice(0, 10) : []
  const hiddenCount = Array.isArray(data.events) && data.events.length > 10 ? data.events.length - 10 : 0

  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">初次相遇</div>
        <div class="value">${escapeHtml(data.meetDate)}</div>
      </div>
      <div class="section">
        <div class="label">在一起已经</div>
        <div class="value">${escapeHtml(data.daysTogether)} 天</div>
      </div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">总互动次数</div>
        <div class="value">${escapeHtml(data.totalInteractions)} 次</div>
      </div>
      <div class="section">
        <div class="label">当前好感</div>
        <div class="value">Lv${escapeHtml(level.level)} · ${escapeHtml(level.name)} (${escapeHtml(status.points)}点)</div>
      </div>
    </div>
    <div class="section">
      <div class="label">里程碑</div>
      <div class="timeline">${events.map((event) => `<div class="timeline-item"><div class="timeline-date">${escapeHtml(event.date)}</div><div class="muted">${escapeHtml(event.text)}</div></div>`).join('') || '<div class="muted">还没有记录到可展示的里程碑。</div>'}</div>
      ${hiddenCount > 0 ? `<div class="muted">...还有 ${escapeHtml(hiddenCount)} 条记录</div>` : ''}
    </div>
    ${data.closingLine ? `<div class="section"><div class="label">酒狐想说的话</div><div class="muted">${escapeHtml(data.closingLine)}</div></div>` : ''}
  `

  return renderCard(ctx, buildShell('酒狐的回忆录', `${userName} 与酒狐一起走过的时光`, content))
}

function renderAnalyticsCard(ctx, payload) {
  const data = payload.data || {}
  const tiers = Array.isArray(data.tiers) ? data.tiers : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">总参与互动用户</div>
        <div class="value">${escapeHtml(data.totalUsers)} 人</div>
      </div>
      <div class="section">
        <div class="label">今日被动触发次数</div>
        <div class="value">${escapeHtml(data.passiveCount)} 次</div>
      </div>
    </div>
    <div class="section">
      <div class="label">好感度分布</div>
      <div class="stat-grid">${tiers.map((tier) => `<div><div class="item-head"><span>${escapeHtml(tier.name)}</span><span class="count-badge">${escapeHtml(tier.count)}人</span></div><div class="progress-track"><div class="progress-fill" style="width: ${Math.max(0, Math.min(100, Math.round((tier.ratio || 0) * 100)))}%"></div></div></div>`).join('')}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐统计', '互动健康表与好感度分布', content))
}

function renderShopCard(ctx, payload) {
  const data = payload.data || {}
  const equips = Array.isArray(data.equips) ? data.equips : []
  const consumables = Array.isArray(data.consumables) ? data.consumables : []
  const renderItems = (items, title) => `
    <div class="section">
      <div class="label">${escapeHtml(title)}</div>
      <div class="shop-list">${items.map((item) => `<div class="shop-item"><div class="item-shell"><div class="item-visual">${renderItemIcon(item.iconId || item.id)}</div><div class="item-copy"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${item.type === 'equip' ? '装备' : '消耗'}</span></div><div class="muted">价格：${escapeHtml(item.price)} 狐狐券${item.levelRequired ? ` · Lv${escapeHtml(item.levelRequired)}${item.locked ? ' 解锁' : ''}` : ''}</div><div class="muted">${escapeHtml(item.description)}</div></div></div></div>`).join('') || '<div class="muted">暂无商品</div>'}</div>
    </div>
  `

  const content = `${renderItems(equips, '装备区')}${renderItems(consumables, '消耗品区')}<div class="section"><div class="muted">使用「酒狐购买 &lt;物品名&gt;」购买</div></div>`
  return renderCard(ctx, buildShell('酒狐商店', '酒狐为你准备的道具列表', content, { cardWidth: 1320 }))
}

function renderInventoryCard(ctx, payload) {
  const data = payload.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const content = `
    <div class="section">
      <div class="label">背包物品</div>
      <div class="inventory-grid">${items.map((item) => `<div class="inventory-item ${item.equipped ? 'equipped' : ''}"><div class="item-shell"><div class="item-visual">${renderItemIcon(item.iconId || item.id)}</div><div class="item-copy"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${item.type === 'equip' ? '装备' : '消耗'}</span></div><div class="count-badge">数量 x${escapeHtml(item.count)}</div><div class="muted">${item.equipped ? '当前已装备' : '可在背包中操作'}</div></div></div></div>`).join('') || '<div class="muted">背包是空的~</div>'}</div>
    </div>
    <div class="section">
      <div class="muted">装备类：酒狐装备 &lt;物品名&gt;</div>
      <div class="muted">消耗类：酒狐使用 &lt;物品名&gt;</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐背包', '当前持有物品与装备状态', content))
}

function renderEquipResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="item-shell">
        <div class="item-visual">${renderItemIcon(data.itemId || data.itemName)}</div>
        <div class="item-copy">
          <div class="label">装备成功</div>
          <div class="value">${escapeHtml(data.itemName)}</div>
          <div class="muted">${escapeHtml(data.message)}</div>
        </div>
      </div>
    </div>
  `
  return renderCard(ctx, buildShell('装备成功', '酒狐已切换到新的装备状态', content))
}

function renderUseResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="item-shell">
        <div class="item-visual">${renderItemIcon(data.itemId || data.itemName)}</div>
        <div class="item-copy">
          <div class="label">使用成功</div>
          <div class="value">${escapeHtml(data.itemName)}</div>
          <div class="muted">${escapeHtml(data.message)}</div>
          ${data.effect ? `<div class="muted">效果：${escapeHtml(data.effect)}</div>` : ''}
        </div>
      </div>
    </div>
  `
  return renderCard(ctx, buildShell('使用成功', '酒狐收到了你的道具效果', content))
}

function renderHelpCard(ctx, payload) {
  const data = payload.data || {}
  const groups = Array.isArray(data.groups) ? data.groups : []
  const { rows, cardWidth } = buildHelpRows(groups, 1080, 10)
  const content = `<div class="help-rows">${rows.map((row) => `
    <div class="help-layout-row">${row.map((group) => `
      <div class="section help-group${group.compact ? ' compact' : ''}${group.dense ? ' dense' : ''}" style="width:${group.renderWidth}px; flex: 0 0 ${group.renderWidth}px;">
        <div class="label">${escapeHtml(group.title)}</div>
        <div class="help-items">${group.items.map((item) => `<div class="help-row"><div class="item-head"><strong>${escapeHtml(item[0])}</strong></div><div class="muted">${escapeHtml(item[1])}</div></div>`).join('')}</div>
      </div>
    `).join('')}</div>
  `).join('')}</div>` + (data.footer ? `<div class="section"><div class="muted">${escapeHtml(data.footer)}</div></div>` : '')

  return renderCard(ctx, buildShell('酒狐帮助', escapeHtml(data.title || '指令列表'), content, { cardWidth }))
}

function renderCommissionCard(ctx, payload) {
  const data = payload.data || {}
  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">今日完成</div>
        <div class="value">${escapeHtml(data.completedCount || 0)}/${escapeHtml(data.totalCount || tasks.length)}</div>
      </div>
      <div class="section">
        <div class="label">剩余奖励</div>
        <div class="value">${escapeHtml(data.remainingReward || 0)} 狐狐券</div>
      </div>
    </div>
    <div class="section">
      <div class="label">任务板</div>
      <div class="collection-list">${tasks.map((task) => `<div class="collection-item"><div class="item-head"><strong>#${escapeHtml(task.index)} ${escapeHtml(task.desc)}</strong><span class="badge">${escapeHtml(task.statusText)}</span></div><div class="muted">进度 ${escapeHtml(task.progress)}/${escapeHtml(task.target)} · 奖励 ${escapeHtml(task.reward)} 狐狐券</div><div class="progress-track"><div class="progress-fill" style="width: ${Math.max(0, Math.min(100, Math.round((task.target ? task.progress / task.target : 0) * 100)))}%"></div></div></div>`).join('') || '<div class="muted">今天暂时没有委托任务。</div>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐委托', `今日任务板 · ${escapeHtml(data.date || '')}`, content))
}

function renderFavoritesCard(ctx, payload) {
  const data = payload.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">页码</div>
        <div class="value">${escapeHtml(data.page || 1)}/${escapeHtml(data.totalPages || 1)}</div>
      </div>
      <div class="section">
        <div class="label">收藏总数</div>
        <div class="value">${escapeHtml(data.totalCount || 0)} 条</div>
      </div>
    </div>
    <div class="section">
      <div class="label">当前页收藏</div>
      <div class="collection-list">${items.map((item) => `<div class="collection-item"><div class="item-head"><strong>#${escapeHtml(item.index)}</strong><span class="badge">已收藏</span></div><div class="muted">${escapeHtml(item.quote || item.preview || '')}</div></div>`).join('') || '<div class="muted">这一页没有收藏内容。</div>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐收藏夹', '喜欢的悄悄话都被好好收起来了', content))
}

function renderSearchResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">关键词</div>
        <div class="value">${escapeHtml(data.keyword || '')}</div>
      </div>
      <div class="section">
        <div class="label">命中数量</div>
        <div class="value">${escapeHtml(data.resultCount || 0)} 条</div>
      </div>
    </div>
    <div class="section">
      <div class="label">当前展示</div>
      <div class="muted">${escapeHtml(data.quote || '')}</div>
      ${data.category ? `<div class="pill-list"><span class="pill">分类：${escapeHtml(data.category)}</span></div>` : ''}
    </div>
  `

  return renderCard(ctx, buildShell('酒狐搜索', `为你翻到与「${data.keyword || ''}」有关的悄悄话`, content))
}

function renderCategoryListCard(ctx, payload) {
  const data = payload.data || {}
  const categories = Array.isArray(data.categories) ? data.categories : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">分类数量</div>
        <div class="value">${escapeHtml(data.categoryCount || categories.length)} 类</div>
      </div>
      <div class="section">
        <div class="label">语录总数</div>
        <div class="value">${escapeHtml(data.quoteCount || 0)} 条</div>
      </div>
    </div>
    <div class="section">
      <div class="label">分类目录</div>
      <div class="story-catalog-list">${categories.map((item) => `<div class="story-catalog-item"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${escapeHtml(item.count)}条</span></div></div>`).join('') || '<div class="muted">暂时没有分类数据。</div>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐分类', '语录目录索引', content))
}

function renderQuoteStatsCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">语录总数</div>
        <div class="value">${escapeHtml(data.quoteCount || 0)} 条</div>
      </div>
      <div class="section">
        <div class="label">分类数量</div>
        <div class="value">${escapeHtml(data.categoryCount || 0)} 类</div>
      </div>
    </div>
    <div class="section">
      <div class="label">稀有语录</div>
      <div class="value">${escapeHtml(data.rareCount || 0)} 条</div>
      <div class="muted">每一条都是酒狐认真写进笔记本里的悄悄话。</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐总数', '语录库存一览', content))
}

function renderRareCollectionCard(ctx, payload) {
  const data = payload.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">收录进度</div>
        <div class="value">${escapeHtml(data.unlockedCount)}/${escapeHtml(data.total)}</div>
      </div>
      <div class="section">
        <div class="label">图鉴状态</div>
        <div class="value">${data.isEmpty ? '尚未解锁' : '持续收集中'}</div>
      </div>
    </div>
    <div class="section">
      <div class="label">已解锁条目</div>
      <div class="collection-list">${items.map((item) => `<div class="collection-item"><strong>#${escapeHtml(item.index)}</strong><div class="muted">${escapeHtml(item.text)}</div></div>`).join('') || '<div class="muted">尚未解锁任何稀有语录。多跟我互动就有机会发现哦~</div>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐图鉴', '稀有语录收录册', content))
}

function renderRankingCard(ctx, payload) {
  const data = payload.data || {}
  const entries = Array.isArray(data.entries) ? data.entries : []
  const content = `
    <div class="section">
      <div class="label">排行榜</div>
      <div class="ranking-list">${entries.map((entry) => `<div class="ranking-item"><div class="item-head"><strong>#${escapeHtml(entry.rank)} ${escapeHtml(entry.userId)}</strong><span class="badge">${escapeHtml(entry.levelName)}</span></div><div class="muted">好感 ${escapeHtml(entry.points)} 点</div></div>`).join('') || '<div class="muted">还没有人和酒狐互动过呢...</div>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐排行', '好感度排行榜 Top10', content))
}

function renderAchievementCard(ctx, payload) {
  const data = payload.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">已解锁</div>
        <div class="value">${escapeHtml(data.unlockedCount)}/${escapeHtml(data.total)}</div>
      </div>
      <div class="section">
        <div class="label">收集状态</div>
        <div class="value">${data.allUnlocked ? '全部达成' : '继续努力'}</div>
      </div>
    </div>
    <div class="section">
      <div class="label">成就徽章</div>
      <div class="achievement-grid">${items.map((item) => `<div class="achievement-item ${item.unlocked ? 'unlocked' : ''}"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${item.unlocked ? '已解锁' : `+${escapeHtml(item.reward)}好感`}</span></div><div class="muted">${escapeHtml(item.desc)}</div></div>`).join('')}</div>
    </div>
    ${data.allUnlocked ? '<div class="section"><div class="muted">恭喜主人！已经解锁了全部成就！酒狐好骄傲！</div></div>' : ''}
  `

  return renderCard(ctx, buildShell('酒狐成就', '成就徽章收集册', content))
}

function renderCellarCard(ctx, payload) {
  const data = payload.data || {}
  const current = data.current
  const summary = data.summary || {}
  const recent = Array.isArray(data.recent) ? data.recent : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  const heroSvg = current
    ? `<svg class="brewing-svg" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="brewGlow" x1="0" x2="1">
            <stop offset="0%" stop-color="#ffd166" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#ff8fab" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="150" rx="56" ry="16" fill="rgba(0,0,0,0.22)"/>
        <rect x="58" y="18" width="44" height="20" rx="8" fill="rgba(255,247,245,0.82)"/>
        <path d="M48 36h64l-8 94c-1 13-11 24-24 24H80c-13 0-23-11-24-24z" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.36)" stroke-width="3"/>
        <path d="M56 86h48v32c0 10-8 18-18 18H74c-10 0-18-8-18-18z" fill="url(#brewGlow)" opacity="0.9"/>
        <circle cx="116" cy="64" r="8" fill="rgba(255,209,102,0.85)"/>
        <circle cx="128" cy="48" r="5" fill="rgba(255,143,171,0.72)"/>
      </svg>`
    : `<svg class="brewing-svg" viewBox="0 0 160 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="80" cy="150" rx="56" ry="16" fill="rgba(0,0,0,0.22)"/>
        <rect x="32" y="56" width="96" height="68" rx="18" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.25)" stroke-width="3"/>
        <path d="M44 76h72" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>
        <path d="M44 94h58" stroke="rgba(255,255,255,0.18)" stroke-width="3"/>
        <circle cx="118" cy="82" r="10" fill="rgba(255,209,102,0.7)"/>
      </svg>`

  const content = current
    ? `
      <div class="section">
        <div class="label">当前酿造</div>
        <div class="brewing-hero">
          ${heroSvg}
          <div>
            <div class="value">${escapeHtml(current.name)}</div>
            <div class="muted">材料：${escapeHtml(current.materials || '神秘配方')}</div>
            <div class="progress-track"><div class="progress-fill" style="width: ${Math.max(0, Math.min(100, Number(current.progress) || 0))}%"></div></div>
            <div class="muted">${escapeHtml(current.remainingText || '正在酿造中')}</div>
            <div class="pill-list">
              <span class="pill">${current.ready ? '可开瓶' : '发酵中'}</span>
              <span class="quality-badge">预计品质：${escapeHtml(current.expectedQuality || '未知')}</span>
              <span class="pill">预计奖励 +${escapeHtml(current.expectedReward || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    `
    : `
      <div class="section">
        <div class="label">当前酿造</div>
        <div class="brewing-hero">
          ${heroSvg}
          <div>
            <div class="value">酒窖正在等待新的酒香</div>
            <div class="muted">现在还没有正在酿造的酒。主人可以随时回来开启下一轮发酵。</div>
            <div class="pill-list"><span class="pill">空状态</span><span class="pill">适合开始新酿造</span></div>
          </div>
        </div>
      </div>
    `

  const summarySection = `
    <div class="section">
      <div class="label">酒窖摘要</div>
      <div class="brewing-summary-grid">
        <div class="brewing-summary-card"><div class="label">库存</div><div class="value">${escapeHtml(summary.totalStored || 0)}</div><div class="muted">酒窖中已记录的酒品</div></div>
        <div class="brewing-summary-card"><div class="label">可开瓶</div><div class="value">${escapeHtml(summary.readyCount || 0)}</div><div class="muted">当前可直接品尝的数量</div></div>
        <div class="brewing-summary-card"><div class="label">最佳品质</div><div class="value">${escapeHtml(summary.bestQuality || '暂无')}</div><div class="muted">累计酿酒 ${escapeHtml(summary.totalBrewed || 0)} 次</div></div>
      </div>
    </div>
  `

  const recentSection = `
    <div class="section">
      <div class="label">近期代表酒品</div>
      <div class="collection-list">${recent.map((item) => `<div class="brewing-recent-item"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="quality-badge">${escapeHtml(item.quality || '普通')}</span></div><div class="muted">奖励 +${escapeHtml(item.reward || 0)}</div></div>`).join('') || '<div class="muted">最近还没有新的成品记录。</div>'}</div>
    </div>
  `

  const suggestionSection = `
    <div class="section">
      <div class="label">下一步建议</div>
      <div class="pill-list">${suggestions.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join('') || '<span class="pill">酒狐酿酒 &lt;配方名&gt;</span>'}</div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐酒窖', '发酵进度、库存与近期成果一览', content + summarySection + recentSection + suggestionSection))
}

function renderBrewResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="label">酿造启动</div>
      <div class="brewing-hero">
        <svg class="brewing-mini-svg" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="26" y="48" width="108" height="48" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.26)" stroke-width="3"/>
          <path d="M58 20h44l8 28H50z" fill="rgba(255,209,102,0.78)"/>
          <circle cx="118" cy="32" r="8" fill="rgba(255,143,171,0.72)"/>
        </svg>
        <div>
          <div class="value">${escapeHtml(data.brewName || '未知酒品')}</div>
          <div class="muted">材料：${escapeHtml(data.materials || '神秘配方')}</div>
          <div class="pill-list">
            <span class="pill">消耗狐狐券 ${escapeHtml(data.cost || 0)} 张</span>
            <span class="quality-badge">品质范围：${escapeHtml(data.qualityRange || '未知')}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="section"><div class="label">下一步建议</div><div class="pill-list"><span class="pill">${escapeHtml(data.suggestion || '酒狐酒窖')}</span></div></div>
    <div class="section"><div class="label">酒狐想说的话</div><div class="muted">${escapeHtml(data.foxLine || '')}</div></div>
  `

  return renderCard(ctx, buildShell('酿酒成功', '新的酒香已经开始发酵', content))
}

function renderOpenBottleResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="label">开瓶结果</div>
      <div class="brewing-hero">
        <svg class="brewing-mini-svg" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M56 18h48l-6 20H62z" fill="rgba(255,247,245,0.88)"/>
          <path d="M46 40h68l-10 54c-2 10-10 18-20 18H76c-10 0-18-8-20-18z" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.32)" stroke-width="3"/>
          <path d="M56 74h48v18c0 8-6 14-14 14H70c-8 0-14-6-14-14z" fill="rgba(255,143,171,0.82)"/>
          <circle cx="122" cy="30" r="10" fill="rgba(255,209,102,0.86)"/>
        </svg>
        <div>
          <div class="value">${escapeHtml(data.brewName || '未知酒品')}</div>
          <div class="pill-list">
            <span class="quality-badge">${escapeHtml(data.quality || '普通')}</span>
            <span class="pill">好感奖励 +${escapeHtml(data.reward || 0)}</span>
            ${data.ticketReward ? `<span class="pill">狐狐券 +${escapeHtml(data.ticketReward)}</span>` : ''}
            ${data.effect ? `<span class="pill">效果：${escapeHtml(data.effect)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="section"><div class="label">下一步建议</div><div class="pill-list"><span class="pill">${escapeHtml(data.suggestion || '酒狐酿酒')}</span></div></div>
    <div class="section"><div class="label">酒狐想说的话</div><div class="muted">${escapeHtml(data.foxLine || '')}</div></div>
  `

  return renderCard(ctx, buildShell('开瓶成功', '酒香在空气里慢慢散开', content))
}

async function renderStoryCards(ctx, payload) {
  const data = payload.data || {}
  const pagination = paginateStoryText(data.text)
  const pageCount = pagination.pageCount
  const fontClass = `story-font-${pagination.fontSizeLevel}`
  const categoryText = data.category ? `分类：${data.category}` : '随机故事'

  const cards = await Promise.all(pagination.pages.map((pageText, index) => {
    const subtitle = `${categoryText} · 第 ${index + 1}/${pageCount} 页`
    const content = `
      <div class="section">
        <div class="label">酒狐日记</div>
        <div class="story-body ${fontClass}">${escapeHtml(pageText)}</div>
      </div>
      <div class="section">
        <div class="label">阅读提示</div>
        <div class="muted">可使用「酒狐故事 &lt;分类&gt;」阅读指定分类故事</div>
      </div>
    `
    return renderCard(ctx, buildShell('酒狐故事', subtitle, content))
  }))

  return cards.map((card) => {
    if (typeof card === 'string') return card
    if (card && typeof card.toString === 'function') return card.toString()
    return String(card)
  }).join('\n')
}

function renderStoryCatalogCard(ctx, payload) {
  const data = payload.data || {}
  const categories = Array.isArray(data.categories) ? data.categories.slice(0, 12) : []
  const hiddenCount = Array.isArray(data.categories) && data.categories.length > 12 ? data.categories.length - 12 : 0
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">故事总数</div>
        <div class="value">${escapeHtml(data.storyCount || 0)} 篇</div>
      </div>
      <div class="section">
        <div class="label">分类总数</div>
        <div class="value">${escapeHtml(data.categoryCount || 0)} 类</div>
      </div>
    </div>
    <div class="section">
      <div class="label">分类目录</div>
      <div class="story-catalog-list">${categories.map((item) => `<div class="story-catalog-item"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${escapeHtml(item.count)}篇</span></div></div>`).join('') || '<div class="muted">故事本还是空的...</div>'}</div>
      ${hiddenCount > 0 ? `<div class="muted">...还有 ${escapeHtml(hiddenCount)} 个分类，请直接使用指令查看</div>` : ''}
    </div>
    <div class="section"><div class="muted">使用「酒狐故事 &lt;分类名&gt;」阅读指定分类的故事</div></div>
  `

  return renderCard(ctx, buildShell('酒狐故事目录', '狐狸日记分类索引', content))
}

function renderWeatherCard(ctx, payload) {
  const data = payload.data || {}
  const ticketReward = Number(data.ticketReward || 0)
  const content = `
    <div class="section weather-panel">
      <div class="label">当前天气</div>
      <div class="value">${escapeHtml(data.status || '未知')}</div>
      ${data.period ? `<div class="muted">时段：${escapeHtml(data.period)}</div>` : ''}
    </div>
    <div class="section">
      <div class="label">天气播报</div>
      <div class="muted">${escapeHtml(data.body || '')}</div>
    </div>
    ${ticketReward > 0 ? `<div class="section"><div class="label">天气奖励</div><div class="value">狐狐券 +${escapeHtml(ticketReward)}</div></div>` : ''}
    ${data.foxComment ? `<div class="section"><div class="label">酒狐悄悄话</div><div class="muted">${escapeHtml(data.foxComment)}</div></div>` : ''}
  `

  return renderCard(ctx, buildShell(data.title || '酒狐天气', '当前天气播报', content))
}

function renderMoodCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section mood-panel">
      <div class="label">当前心情</div>
      <div class="value">${escapeHtml(data.mood || '普通')}</div>
      ${data.emoji ? `<div class="muted">${escapeHtml(data.emoji)}</div>` : ''}
    </div>
    <div class="section">
      <div class="label">状态描述</div>
      <div class="muted">${escapeHtml(data.body || '')}</div>
    </div>
  `

  return renderCard(ctx, buildShell(data.title || '酒狐心情', '酒狐当前状态', content))
}

function renderCheckinResultCard(ctx, payload) {
  const data = payload.data || {}
  const rows = Array.isArray(data.mainRows) ? data.mainRows : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  const content = `
    <div class="section">
      <div class="label">${escapeHtml(data.tag || '结果')}</div>
      ${rows.map((row) => `
        <div class="shop-item">
          <div class="item-head">
            <strong>${escapeHtml(row.label)}</strong>
            <span class="badge">${escapeHtml(row.value)}</span>
          </div>
          ${row.muted ? `<div class="muted">${escapeHtml(row.muted)}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="section">
      <div class="label">下一步建议</div>
      <div class="pill-list">${suggestions.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('') || '<div class="muted">暂无建议</div>'}</div>
    </div>
    <div class="section">
      <div class="label">酒狐想说的话</div>
      <div class="muted">${escapeHtml(data.foxLine || '')}</div>
    </div>
  `

  return renderCard(ctx, buildShell('签到成功', '今日进度已记录', content))
}

function renderBuyResultCard(ctx, payload) {
  const data = payload.data || {}
  const rows = Array.isArray(data.mainRows) ? data.mainRows : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  const content = `
    ${data.itemId ? `<div class="section"><div class="item-shell"><div class="item-visual">${renderItemIcon(data.itemId)}</div><div class="item-copy"><div class="label">新道具</div><div class="value">${escapeHtml(data.itemName || '')}</div><div class="muted">已经放入背包，可以继续装备或使用。</div></div></div></div>` : ''}
    <div class="section">
      <div class="label">${escapeHtml(data.tag || '商店')}</div>
      ${rows.map((row) => `
        <div class="shop-item">
          <div class="item-head">
            <strong>${escapeHtml(row.label)}</strong>
            <span class="badge">${escapeHtml(row.value)}</span>
          </div>
          ${row.muted ? `<div class="muted">${escapeHtml(row.muted)}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="section">
      <div class="label">下一步建议</div>
      <div class="pill-list">${suggestions.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('') || '<div class="muted">暂无建议</div>'}</div>
    </div>
    <div class="section">
      <div class="label">酒狐想说的话</div>
      <div class="muted">${escapeHtml(data.foxLine || '')}</div>
    </div>
  `

  return renderCard(ctx, buildShell('购买成功', '新的道具已放入背包', content))
}

function renderGiftResultCard(ctx, payload) {
  const data = payload.data || {}
  const rows = Array.isArray(data.mainRows) ? data.mainRows : []
  const suggestions = Array.isArray(data.suggestions) ? data.suggestions : []

  const content = `
    <div class="section">
      <div class="label">${escapeHtml(data.tag || '社交')}</div>
      ${rows.map((row) => `
        <div class="shop-item">
          <div class="item-head">
            <strong>${escapeHtml(row.label)}</strong>
            <span class="badge">${escapeHtml(row.value)}</span>
          </div>
          ${row.muted ? `<div class="muted">${escapeHtml(row.muted)}</div>` : ''}
        </div>
      `).join('')}
    </div>
    <div class="section">
      <div class="label">下一步建议</div>
      <div class="pill-list">${suggestions.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('') || '<div class="muted">暂无建议</div>'}</div>
    </div>
    <div class="section">
      <div class="label">酒狐想说的话</div>
      <div class="muted">${escapeHtml(data.foxLine || '')}</div>
    </div>
  `

  return renderCard(ctx, buildShell('送礼成功', '心意已传达', content))
}

function renderRpsWinResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">主人出拳</div>
        <div class="value">${escapeHtml(data.userChoiceName || '')}</div>
      </div>
      <div class="section">
        <div class="label">酒狐出拳</div>
        <div class="value">${escapeHtml(data.foxChoiceName || '')}</div>
      </div>
    </div>
    <div class="section">
      <div class="label">结果</div>
      <div class="muted">${escapeHtml(data.flavorLine || data.message || '')}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">狐狐券</div>
        <div class="value">+${escapeHtml(data.ticketReward || 0)}</div>
      </div>
      <div class="section">
        <div class="label">好感进度</div>
        <div class="muted">${escapeHtml(data.progressLine || '')}</div>
      </div>
    </div>
  `

  return renderCard(ctx, buildShell('猜拳胜利', '这回是主人赢啦', content))
}

function renderGuessNumberResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="grid">
      <div class="section">
        <div class="label">答案</div>
        <div class="value">${escapeHtml(data.answer || '')}</div>
      </div>
      <div class="section">
        <div class="label">尝试次数</div>
        <div class="value">${escapeHtml(data.attempts || 0)} 次</div>
      </div>
    </div>
    <div class="section">
      <div class="label">结果</div>
      <div class="muted">${escapeHtml(data.summary || data.message || '')}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">狐狐券</div>
        <div class="value">${data.ticketReward > 0 ? `+${escapeHtml(data.ticketReward)}` : '已领满'}</div>
      </div>
      <div class="section">
        <div class="label">好感进度</div>
        <div class="muted">${escapeHtml(data.progressLine || '')}</div>
      </div>
    </div>
  `

  return renderCard(ctx, buildShell(data.success ? '猜数成功' : '猜数结算', data.success ? '这次数字被你抓到了' : '下次一定能猜中', content))
}

function renderDailyQuoteCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="label">今日悄悄话</div>
      <div class="story-body story-font-1">${escapeHtml(data.quote || '')}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">狐狐券</div>
        <div class="value">+${escapeHtml(data.ticketReward || 0)}</div>
      </div>
      <div class="section">
        <div class="label">好感进度</div>
        <div class="muted">${escapeHtml(data.progressLine || '')}</div>
      </div>
    </div>
  `

  return renderCard(ctx, buildShell('每日酒狐', escapeHtml(data.dateLabel || '今日专属语录'), content))
}

function renderOmikujiCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="label">签运</div>
      <div class="value">${escapeHtml(data.rank || '')}</div>
    </div>
    <div class="section">
      <div class="label">签文</div>
      <div class="muted">${escapeHtml(data.text || '')}</div>
    </div>
    <div class="grid">
      <div class="section">
        <div class="label">狐狐券</div>
        <div class="value">+${escapeHtml(data.ticketReward || 0)}</div>
      </div>
      <div class="section">
        <div class="label">好感进度</div>
        <div class="muted">${escapeHtml(data.progressLine || '')}</div>
      </div>
    </div>
  `

  return renderCard(ctx, buildShell('酒狐抽签', '御神签缓缓落下', content))
}

module.exports = {
  hasPuppeteer,
  listCardThemes,
  resolveCardTheme,
  setCardTheme,
  getActiveCardThemeInfo,
  getItemIconSpec,
  renderCommissionCard,
  renderFavoritesCard,
  renderSearchResultCard,
  renderCategoryListCard,
  renderQuoteStatsCard,
  renderFortuneCard,
  renderAffinityCard,
  renderCheckinCalendarCard,
  renderMemoirCard,
  renderAnalyticsCard,
  renderShopCard,
  renderInventoryCard,
  renderEquipResultCard,
  renderUseResultCard,
  renderHelpCard,
  renderRareCollectionCard,
  renderRankingCard,
  renderAchievementCard,
  renderCellarCard,
  renderBrewResultCard,
  renderOpenBottleResultCard,
  renderStoryCards,
  renderStoryCatalogCard,
  renderWeatherCard,
  renderMoodCard,
  renderCheckinResultCard,
  renderBuyResultCard,
  renderGiftResultCard,
  renderRpsWinResultCard,
  renderGuessNumberResultCard,
  renderDailyQuoteCard,
  renderOmikujiCard,
}
