function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function hasPuppeteer(ctx) {
  return !!ctx?.puppeteer?.render
}

function renderCard(ctx, html) {
  return ctx.puppeteer.render(html)
}

function buildShell(title, subtitle, content) {
  return `
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px;
          background: linear-gradient(135deg, #2f1b3d 0%, #5b2f5f 45%, #7d4e57 100%);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          color: #fff7f5;
        }
        .card {
          width: 760px;
          padding: 28px;
          border-radius: 24px;
          background: linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08));
          border: 1px solid rgba(255,255,255,0.18);
          box-shadow: 0 20px 60px rgba(22, 8, 25, 0.35);
          backdrop-filter: blur(8px);
        }
        .header { margin-bottom: 22px; }
        .title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }
        .subtitle {
          font-size: 16px;
          color: rgba(255,247,245,0.82);
        }
        .section {
          margin-top: 18px;
          padding: 18px 20px;
          border-radius: 18px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }
        .label {
          font-size: 13px;
          color: rgba(255,247,245,0.72);
          margin-bottom: 8px;
        }
        .value {
          font-size: 22px;
          font-weight: 700;
        }
        .muted {
          color: rgba(255,247,245,0.76);
          font-size: 15px;
          line-height: 1.6;
        }
        .progress-track {
          width: 100%;
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.14);
          margin: 10px 0 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #ffd166 0%, #ff8fab 100%);
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
          background: rgba(255,255,255,0.12);
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
          border: 2px solid rgba(255,255,255,0.75);
          background: linear-gradient(135deg, #ffd166 0%, #ff8fab 100%);
          flex: 0 0 auto;
        }
        .footer {
          margin-top: 22px;
          font-size: 13px;
          color: rgba(255,247,245,0.7);
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="title">${escapeHtml(title)}</div>
          <div class="subtitle">${escapeHtml(subtitle)}</div>
        </div>
        ${content}
        <div class="footer">WineFox-Daily · 酒狐悄悄话图片卡片</div>
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

module.exports = {
  hasPuppeteer,
  renderFortuneCard,
  renderAffinityCard,
}
