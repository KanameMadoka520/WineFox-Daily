const FREE_COMMAND_POOL = ['猜拳', '猜数字', '抽签', '喂酒', '酿酒', '问答']
const announcedToday = new Map()

function createSeed(input) {
  let seed = 0
  for (const ch of input) {
    seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  }
  return seed || 1
}

function createRng(seed) {
  let x = seed >>> 0
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 0x100000000
  }
}

function getDailyFreeCommands(dateKey) {
  const pool = [...FREE_COMMAND_POOL]
  const rng = createRng(createSeed(dateKey))
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 4)
}

function isCommandFree(commandName, dateKey) {
  return getDailyFreeCommands(dateKey).includes(commandName)
}

function getAnnouncementText(dateKey) {
  return `今日免费体验: ${getDailyFreeCommands(dateKey).map(cmd => `酒狐${cmd}`).join(' / ')}`
}

function shouldAnnounce(guildId, dateKey) {
  return announcedToday.get(guildId) !== dateKey
}

function markAnnounced(guildId, dateKey) {
  announcedToday.set(guildId, dateKey)
}

function formatHelpLine(commandText, description, levelRequired = 0, freeCommands = []) {
  const parts = []
  if (levelRequired > 0) parts.push(`[Lv${levelRequired}]`)
  parts.push(commandText)
  parts.push(description)
  const normalized = commandText.replace(/^酒狐/, '').split(' ')[0].replace(/<.*$/, '').trim()
  if (freeCommands.includes(normalized)) parts.push('[今日免费]')
  return parts.join(' ')
}

module.exports = {
  FREE_COMMAND_POOL,
  getDailyFreeCommands,
  isCommandFree,
  getAnnouncementText,
  shouldAnnounce,
  markAnnounced,
  formatHelpLine,
}
