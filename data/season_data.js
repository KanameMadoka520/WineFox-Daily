const SEASONS = [
  {
    id: 'spring',
    name: '春季',
    aliases: ['春', '春天'],
    keywords: ['春', '花', '樱', '嫩芽', '微风', '细雨', '新芽', '暖'],
    preferredCategories: ['天气风景', '日常暖心', '早安', '告白深情'],
    weatherWeights: {
      sunny: 1.1,
      cloudy: 1.35,
      rain: 1.45,
      thunder: 0.75,
      snow: 0.1,
      fog: 1.15,
      hail: 0.55,
      sandstorm: 0.2,
      aurora: 0.35,
      rainbow: 1.45,
      drizzle: 2.1,
      heatwave: 0.2,
      blizzard: 0.05,
      starry: 0.95,
      windy: 1.15,
    },
    descriptions: [
      '风里带着一点新叶和湿土的味道，像整个世界刚从长梦里醒来。',
      '空气轻轻回暖，花和草都开始尝试把颜色重新铺回地面。',
      '这是适合开新坑、出门散步、顺手喜欢上很多事物的季节。',
      '春天总有种“现在开始也来得及”的感觉，连天空都比平时更宽容一点。',
    ],
    foxComment: [
      '酒狐最喜欢春天了，感觉连尾巴尖都会冒出一点点新鲜的好心情。',
      '春风一吹，酒狐就想拉着主人去看花、看云、看一切会发亮的东西。',
      '这个季节很适合重新开始，也很适合把想说的话说得更温柔一点。',
      '春天的空气太适合靠近主人了，连呼吸都会变得轻快一点。',
    ],
    recommendations: ['赏花散步', '整理基地', '开垦农田'],
  },
  {
    id: 'summer',
    name: '夏季',
    aliases: ['夏', '夏天'],
    keywords: ['夏', '蝉', '晴', '热', '冰', '海', '风扇', '夜市', '雷雨'],
    preferredCategories: ['天气风景', '冒险探索', '喝酒', '服务器日常'],
    weatherWeights: {
      sunny: 1.45,
      cloudy: 0.95,
      rain: 0.9,
      thunder: 1.75,
      snow: 0.02,
      fog: 0.55,
      hail: 0.35,
      sandstorm: 0.45,
      aurora: 0.08,
      rainbow: 1.1,
      drizzle: 0.7,
      heatwave: 2.4,
      blizzard: 0.01,
      starry: 1.2,
      windy: 1.15,
    },
    descriptions: [
      '阳光和热意都来得很直接，白天很亮，夜晚也很容易热闹起来。',
      '这是适合远行、冒险、流汗和大口喝冰饮的季节，情绪也会被放大一点。',
      '夏天把世界晒得很清楚，连想念和快乐都更容易被看出来。',
      '白昼变长以后，很多计划都会显得更有冲劲，像在催人快点出发。',
    ],
    foxComment: [
      '夏天一来，酒狐就会认真思考冰镇果酒和主人哪一个更能解暑。',
      '这种季节不出去跑一圈都对不起太阳，但回来之后必须让酒狐蹭空调。',
      '夏夜最适合聊天了，风一吹，很多平时不肯说的话都会自己跑出来。',
      '酒狐喜欢夏天的热闹，也喜欢主人被夕阳照得暖洋洋的样子。',
    ],
    recommendations: ['远行探索', '夜间散步', '冰镇果酒'],
  },
  {
    id: 'autumn',
    name: '秋季',
    aliases: ['秋', '秋天'],
    keywords: ['秋', '叶', '落叶', '果实', '晚霞', '凉', '金色', '麦田', '丰收'],
    preferredCategories: ['天气风景', '建造工程', '喝酒', '晚安'],
    weatherWeights: {
      sunny: 0.95,
      cloudy: 1.45,
      rain: 1.05,
      thunder: 0.7,
      snow: 0.35,
      fog: 1.9,
      hail: 0.7,
      sandstorm: 0.3,
      aurora: 0.45,
      rainbow: 0.8,
      drizzle: 1.2,
      heatwave: 0.15,
      blizzard: 0.08,
      starry: 1.15,
      windy: 1.65,
    },
    descriptions: [
      '空气开始变得清透，树叶和晚霞都比平时更擅长让人停下来多看一会儿。',
      '这是适合收获、整理、回顾，也适合一边吹风一边慢慢发呆的季节。',
      '秋天很会把热烈收住一点，再把温柔和成熟推到前面来。',
      '光线一软下来，很多普通的景色都会突然像带了回忆滤镜。',
    ],
    foxComment: [
      '秋天的风很适合闻酒香，也很适合让酒狐靠着主人坐一会儿。',
      '这个季节总让我想把仓库理整齐，再把想念也理一理，结果理到最后全是主人。',
      '秋天最好了，丰收、晚霞、热饮，还有可以理直气壮赖在主人旁边取暖的借口。',
      '酒狐一直觉得，秋天是最会把心事酿得更香一点的季节。',
    ],
    recommendations: ['收集资源', '整理仓库', '看晚霞发呆'],
  },
  {
    id: 'winter',
    name: '冬季',
    aliases: ['冬', '冬天'],
    keywords: ['冬', '雪', '冷', '火', '围炉', '热酒', '被窝', '霜', '冰'],
    preferredCategories: ['天气风景', '催睡关心', '晚安', '喝酒', '情绪鼓励'],
    weatherWeights: {
      sunny: 0.75,
      cloudy: 1.25,
      rain: 0.25,
      thunder: 0.25,
      snow: 2.45,
      fog: 1.15,
      hail: 1.6,
      sandstorm: 0.08,
      aurora: 1.8,
      rainbow: 0.35,
      drizzle: 0.25,
      heatwave: 0.01,
      blizzard: 2.8,
      starry: 1.25,
      windy: 1.05,
    },
    descriptions: [
      '天气会把人往火光和暖意旁边推，很多藏着的依赖也更容易在这个季节露面。',
      '冬天安静的时候很安静，冷的时候也很认真，所以一切温暖都会显得更有分量。',
      '这是适合放慢一点、靠近一点、把热饮和关心都握在手里的季节。',
      '外面越冷，家和陪伴的意义就会越清楚，连一句晚安都比平时更暖一些。',
    ],
    foxComment: [
      '冬天就是拿来理直气壮靠近主人的，不接受反驳，酒狐说的。',
      '这种冷天最适合围炉、喝热酒，再顺手和主人把话慢慢说长一点。',
      '酒狐一到冬天就会很诚实地承认，自己真的很需要暖和和陪伴。',
      '只要主人在旁边，冬天就不会只是冷，还会多一点很软的安全感。',
    ],
    recommendations: ['围炉取暖', '热酒夜谈', '早点休息'],
  },
]

function normalizeSeasonInput(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function listSeasons() {
  return SEASONS.slice()
}

function getSeasonById(seasonId) {
  const normalized = normalizeSeasonInput(seasonId)
  return SEASONS.find(item => normalizeSeasonInput(item.id) === normalized) || null
}

function resolveSeason(input) {
  const normalized = normalizeSeasonInput(input)
  if (!normalized) return null

  return SEASONS.find((item) => {
    if (normalizeSeasonInput(item.id) === normalized) return true
    if (normalizeSeasonInput(item.name) === normalized) return true
    return Array.isArray(item.aliases) && item.aliases.some(alias => normalizeSeasonInput(alias) === normalized)
  }) || null
}

module.exports = {
  SEASONS,
  listSeasons,
  getSeasonById,
  resolveSeason,
}
