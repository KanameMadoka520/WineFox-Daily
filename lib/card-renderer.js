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
        .calendar-weekdays,
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
        }
        .calendar-weekdays {
          margin-bottom: 10px;
          font-size: 13px;
          color: rgba(255,247,245,0.72);
          text-align: center;
        }
        .calendar-cell {
          min-height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
          font-weight: 700;
        }
        .calendar-cell.empty {
          background: transparent;
          border-color: transparent;
        }
        .calendar-cell.checked {
          background: rgba(255, 209, 102, 0.18);
        }
        .calendar-cell.today {
          border-color: rgba(255, 143, 171, 0.85);
        }
        .calendar-cell.today-checked {
          background: linear-gradient(135deg, rgba(255, 209, 102, 0.35), rgba(255, 143, 171, 0.28));
          border-color: rgba(255, 255, 255, 0.8);
        }
        .timeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .timeline-item {
          padding-left: 14px;
          border-left: 3px solid rgba(255, 209, 102, 0.55);
        }
        .timeline-date {
          font-size: 13px;
          color: rgba(255,247,245,0.72);
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
        .inventory-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .shop-item,
        .inventory-item {
          padding: 14px 16px;
          border-radius: 16px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .inventory-item.equipped {
          border-color: rgba(255, 209, 102, 0.85);
          background: rgba(255, 209, 102, 0.14);
        }
        .item-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 8px;
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          font-size: 12px;
        }
        .count-badge {
          font-size: 12px;
          color: rgba(255,247,245,0.72);
        }
        .help-group,
        .achievement-grid,
        .ranking-list,
        .collection-list {
          display: grid;
          gap: 12px;
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
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .achievement-item.unlocked {
          border-color: rgba(255, 209, 102, 0.85);
          background: rgba(255, 209, 102, 0.14);
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
      <div class="shop-list">${items.map((item) => `<div class="shop-item"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${item.type === 'equip' ? '装备' : '消耗'}</span></div><div class="muted">价格：${escapeHtml(item.price)} 好感</div><div class="muted">${escapeHtml(item.description)}</div></div>`).join('') || '<div class="muted">暂无商品</div>'}</div>
    </div>
  `

  const content = `${renderItems(equips, '装备区')}${renderItems(consumables, '消耗品区')}<div class="section"><div class="muted">使用「酒狐购买 &lt;物品名&gt;」购买</div></div>`
  return renderCard(ctx, buildShell('酒狐商店', '酒狐为你准备的道具列表', content))
}

function renderInventoryCard(ctx, payload) {
  const data = payload.data || {}
  const items = Array.isArray(data.items) ? data.items : []
  const content = `
    <div class="section">
      <div class="label">背包物品</div>
      <div class="inventory-grid">${items.map((item) => `<div class="inventory-item ${item.equipped ? 'equipped' : ''}"><div class="item-head"><strong>${escapeHtml(item.name)}</strong><span class="badge">${item.type === 'equip' ? '装备' : '消耗'}</span></div><div class="count-badge">数量 x${escapeHtml(item.count)}</div><div class="muted">${item.equipped ? '当前已装备' : '可在背包中操作'}</div></div>`).join('') || '<div class="muted">背包是空的~</div>'}</div>
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
      <div class="label">装备成功</div>
      <div class="value">${escapeHtml(data.itemName)}</div>
      <div class="muted">${escapeHtml(data.message)}</div>
    </div>
  `
  return renderCard(ctx, buildShell('装备成功', '酒狐已切换到新的装备状态', content))
}

function renderUseResultCard(ctx, payload) {
  const data = payload.data || {}
  const content = `
    <div class="section">
      <div class="label">使用成功</div>
      <div class="value">${escapeHtml(data.itemName)}</div>
      <div class="muted">${escapeHtml(data.message)}</div>
      ${data.effect ? `<div class="muted">效果：${escapeHtml(data.effect)}</div>` : ''}
    </div>
  `
  return renderCard(ctx, buildShell('使用成功', '酒狐收到了你的道具效果', content))
}

function renderHelpCard(ctx, payload) {
  const data = payload.data || {}
  const groups = Array.isArray(data.groups) ? data.groups : []
  const content = groups.map((group) => `
    <div class="section help-group">
      <div class="label">${escapeHtml(group.title)}</div>
      ${group.items.map((item) => `<div class="help-row"><div class="item-head"><strong>${escapeHtml(item[0])}</strong></div><div class="muted">${escapeHtml(item[1])}</div></div>`).join('')}
    </div>
  `).join('') + (data.footer ? `<div class="section"><div class="muted">${escapeHtml(data.footer)}</div></div>` : '')

  return renderCard(ctx, buildShell('酒狐帮助', escapeHtml(data.title || '指令列表'), content))
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

module.exports = {
  hasPuppeteer,
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
  renderCheckinResultCard,
  renderBuyResultCard,
  renderGiftResultCard,
}
