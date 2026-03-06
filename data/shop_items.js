/**
 * ==========================================
 *  酒狐商店物品
 * ==========================================
 *
 *  type: 'equip' = 装备类（只能买一次，装备后改变互动文案）
 *        'consumable' = 消耗品（用一次消失）
 *
 *  每个物品包含:
 *  - id: 唯一标识
 *  - name: 物品名
 *  - type: 类型
 *  - price: 好感度价格
 *  - description: 商店展示描述
 *  - buyLine: 购买时的文案
 *  - equipLine: 装备时的文案（装备类）
 *  - useLine: 使用时的文案（消耗品）
 *  - effectText: 装备效果附加文案（装备类，互动时附加）
 *  - effect: 使用效果标识（消耗品，由代码处理）
 */

module.exports = [
  // ===== 装备类 =====
  {
    id: 'fox_bell',
    name: '狐狸耳饰',
    type: 'equip',
    price: 20,
    description: '一对精致的小铃铛耳饰，戴上后酒狐的耳朵会叮叮作响~',
    buyLine: '酒狐悄悄话: 哇！好漂亮的铃铛！主人帮我戴上好不好？叮铃叮铃~',
    equipLine: '酒狐悄悄话: 铃铛戴好了！每次摇头都会发出好听的声音~叮铃♪',
    effectText: '（酒狐耳朵上的铃铛叮铃作响~）',
  },
  {
    id: 'sake_bottle',
    name: '酒壶',
    type: 'equip',
    price: 30,
    description: '一个精美的陶瓷酒壶，让酒狐随时能喝上好酒~',
    buyLine: '酒狐悄悄话: 这个酒壶的花纹好漂亮！以后就用这个装我最爱的米酒了~',
    equipLine: '酒狐悄悄话: 酒壶挂在腰间了！随时随地都能来一口~嘿嘿',
    effectText: '（酒狐摸了摸腰间的酒壶，美滋滋~）',
  },
  {
    id: 'scarf',
    name: '围巾',
    type: 'equip',
    price: 25,
    description: '一条柔软的羊毛围巾，冬天再也不会冷了~',
    buyLine: '酒狐悄悄话: 好暖和的围巾！闻起来有阳光的味道~谢谢主人！',
    equipLine: '酒狐悄悄话: 围巾围好了~整个脖子都暖呼呼的！尾巴也想要一条...',
    effectText: '（酒狐裹了裹围巾，露出满足的笑容~）',
  },
  {
    id: 'flower_crown',
    name: '花冠',
    type: 'equip',
    price: 15,
    description: '用野花编成的花冠，戴上后酒狐变得更可爱了~',
    buyLine: '酒狐悄悄话: 花冠！花冠！酒狐一直想要一个！主人帮我戴好~',
    equipLine: '酒狐悄悄话: 花冠戴上了~酒狐是不是变成花仙子了？嘻嘻~',
    effectText: '（酒狐头上的花冠散发着淡淡花香~）',
  },
  {
    id: 'ribbon',
    name: '尾巴蝴蝶结',
    type: 'equip',
    price: 20,
    description: '系在尾巴上的蝴蝶结，让酒狐的大尾巴更加华丽~',
    buyLine: '酒狐悄悄话: 呜！要系在尾巴上吗？好害羞...但是好漂亮！',
    equipLine: '酒狐悄悄话: 蝴蝶结系好了~主人觉得好看吗？（转圈展示尾巴）',
    effectText: '（酒狐的尾巴上系着漂亮的蝴蝶结~）',
  },
  {
    id: 'bracelet',
    name: '手链',
    type: 'equip',
    price: 10,
    description: '一条编织手链，简单但很温馨~',
    buyLine: '酒狐悄悄话: 小手链！好精致~主人帮我戴上吧！',
    equipLine: '酒狐悄悄话: 手链戴好了~走路的时候会轻轻晃动，好好看！',
    effectText: '（酒狐手腕上的小手链轻轻晃动着~）',
  },
  {
    id: 'glasses',
    name: '小眼镜',
    type: 'equip',
    price: 18,
    description: '圆框小眼镜，戴上后酒狐看起来很有学问~',
    buyLine: '酒狐悄悄话: 眼镜！酒狐戴上会不会看起来很聪明？嘿嘿~',
    equipLine: '酒狐悄悄话: 嗯~戴上眼镜以后世界都变清晰了...其实酒狐视力很好啦！纯粹为了可爱！',
    effectText: '（酒狐推了推鼻梁上的小眼镜~）',
  },
  {
    id: 'hairpin',
    name: '发簪',
    type: 'equip',
    price: 22,
    description: '镶嵌小宝石的发簪，别在耳朵旁特别漂亮~',
    buyLine: '酒狐悄悄话: 好漂亮的发簪！上面还镶着小宝石~主人帮我别在耳朵旁边好不好？',
    equipLine: '酒狐悄悄话: 发簪别好了！主人觉得酒狐变漂亮了吗？（歪头）',
    effectText: '（酒狐耳边的发簪微微闪烁着光芒~）',
  },
  {
    id: 'starcloak',
    name: '星光披风',
    type: 'equip',
    price: 40,
    description: '绣有星辰图案的披风，仿佛把夜空披在身上~',
    buyLine: '酒狐悄悄话: 呜哇！这件披风上面有星星的图案！好像把星空披在身上一样！',
    equipLine: '酒狐悄悄话: 披风穿上了~感觉自己变成了夜空下的神秘狐狸！主人觉得帅不帅？',
    effectText: '（酒狐的星光披风在风中轻轻飘动~）',
  },

  // ===== 消耗品 =====
  {
    id: 'cake',
    name: '小蛋糕',
    type: 'consumable',
    price: 10,
    description: '一块美味的小蛋糕，吃了心情会变好~',
    buyLine: '酒狐悄悄话: 蛋糕！酒狐最喜欢甜食了！什么时候可以吃呀~',
    useLine: '酒狐悄悄话: 啊呜~蛋糕好好吃！奶油甜甜的...酒狐现在超级开心！(心情->开心)',
    effect: 'mood_happy',
  },
  {
    id: 'herb',
    name: '安眠药草',
    type: 'consumable',
    price: 15,
    description: '来自丛林的草药，闻了会让酒狐犯困~',
    buyLine: '酒狐悄悄话: 这个草药闻起来好舒服...嗯？不是现在用的吗？好吧~',
    useLine: '酒狐悄悄话: 呼...好香的草药...酒狐好困...想趴在主人腿上睡一觉...(心情->慵懒)',
    effect: 'mood_lazy',
  },
  {
    id: 'mystery_bottle',
    name: '神秘酒瓶',
    type: 'consumable',
    price: 50,
    description: '一瓶来历不明的酒，据说喝了会获得稀有的感悟~',
    buyLine: '酒狐悄悄话: 这瓶酒...发着奇怪的光...主人确定要买吗？好贵啊...',
    useLine: '酒狐悄悄话: 咕嘟咕嘟...呜哇！好奇特的味道！脑袋里突然涌出了一段珍贵的记忆...',
    effect: 'random_rare',
  },
  {
    id: 'firework',
    name: '烟花',
    type: 'consumable',
    price: 8,
    description: '璀璨的烟花，和酒狐一起看烟花吧~',
    buyLine: '酒狐悄悄话: 烟花！酒狐最喜欢看烟花了！什么时候放呀~',
    useLine: '酒狐悄悄话: 砰～嘭～！好漂亮的烟花！主人你看你看！那朵最大的！酒狐好开心啊！(心情->开心)',
    effect: 'mood_happy',
  },
  {
    id: 'sake_premium',
    name: '高级清酒',
    type: 'consumable',
    price: 20,
    description: '一杯上等清酒，让酒狐微醺~',
    buyLine: '酒狐悄悄话: 高级清酒！这个酒狐闻着就知道是好酒！主人太懂了~',
    useLine: '酒狐悄悄话: 嘿嘿...好好喝~酒狐的脸好热...世界在旋转...主人抱着我好不好~(心情->微醺)',
    effect: 'mood_tipsy',
  },
  {
    id: 'pumpkin_pie',
    name: '南瓜派',
    type: 'consumable',
    price: 5,
    description: '香喷喷的南瓜派，便宜又美味~',
    buyLine: '酒狐悄悄话: 南瓜派！秋天的味道~好想赶快吃！',
    useLine: '酒狐悄悄话: 咬一口...南瓜的香甜和肉桂的温暖在嘴里融化~酒狐好满足！(心情->开心)',
    effect: 'mood_happy',
  },
  {
    id: 'cat_disc',
    name: '唱片·猫',
    type: 'consumable',
    price: 12,
    description: 'C418的经典唱片「cat」，放来一起听吧~',
    buyLine: '酒狐悄悄话: C418的唱片「cat」！这首曲子酒狐最喜欢了~放来听听？',
    useLine: '酒狐悄悄话: ♪~好舒缓的旋律~酒狐靠在主人身边听着音乐...好想就这样慵懒地待一整天~(心情->慵懒)',
    effect: 'mood_lazy',
  },
  {
    id: 'golden_apple',
    name: '金苹果',
    type: 'consumable',
    price: 25,
    description: '闪闪发光的金苹果，吃了会充满力量！',
    buyLine: '酒狐悄悄话: 金苹果！闪闪发光的...酒狐从来没吃过这么奢侈的东西！',
    useLine: '酒狐悄悄话: 啊呜~金苹果的味道...好神奇！感觉全身都充满了力量！酒狐的尾巴在发光！(心情->开心)',
    effect: 'mood_happy',
  },
  {
    id: 'mystery_potion',
    name: '迷之药水',
    type: 'consumable',
    price: 30,
    description: '颜色一直在变的神奇药水，喝了会怎样呢？',
    buyLine: '酒狐悄悄话: 这瓶药水颜色一直在变...红色...蓝色...绿色...主人确定要买？',
    useLine: '酒狐悄悄话: 咕嘟...嗯？世界在旋转...酒狐看到了好多星星在转圈圈...嘿嘿嘿~(心情->微醺)',
    effect: 'mood_tipsy',
  },
]
