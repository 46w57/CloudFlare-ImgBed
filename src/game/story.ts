import { DialogueLine, QuestDef } from './types';

export const dialogues: Record<string, DialogueLine[]> = {

  eileen_intro: [
    { speaker: 'eileen', text: '啊，你终于醒了！我是艾琳，这片暮光森林的守护者。', nextKey: 'eileen_intro2' },
    { speaker: 'eileen', text: '你身上散发着星陨的气息……看来你就是预言中的旅者。', nextKey: 'eileen_intro3' },
    { speaker: 'eileen', text: '森林深处最近不太平静，暗影生物越来越多了。你要小心。', nextKey: 'eileen_danger' },
  ],

  eileen_danger: [
    { speaker: 'eileen', text: '那些暗影怪物似乎在寻找什么东西……它们对星光碎片异常狂热。', nextKey: 'eileen_lore' },
    { speaker: 'player', text: '星光碎片？那是什么？', nextKey: 'eileen_lore2' },
  ],

  eileen_lore: [
    { speaker: 'eileen', text: '传说在远古时代，一颗陨落的星辰碎裂成了五片，散落在世界各地。', nextKey: 'eileen_lore2' },
    { speaker: 'eileen', text: '每一片都蕴含着强大的力量——有人称之为"星落之证"。', nextKey: 'eillen_quest_offer' },
  ],

  eillen_quest_offer: [
    { speaker: 'eileen', text: '如果你能帮我收集5枚星尘（星光碎片的微小残渣），我也许能帮你解读更多关于陨星的秘密。', action: 'quest_accept', questKey: 'stardust', choices: [{ text: '我接受这个任务', nextKey: 'eileen_quest_accept' }, { text: '我还需要准备一下', nextKey: 'eileen_decline' }] },
  ],

  eileen_quest_accept: [
    { speaker: 'eileen', text: '太好了！击败森林里的暗影生物就有机会获得星尘。收集满5枚后回来找我！', nextKey: 'eileen_after_quest' },
  ],

  eileen_decline: [
    { speaker: 'eileen', text: '没关系，旅途漫长，你需要的时候随时来找我。', nextKey: 'eileen_after_quest' },
  ],

  eileen_after_quest: [
    { speaker: 'eileen', text: '愿星光指引你的道路，勇敢的旅者。', nextKey: null },
  ],

  eileen_post_quest: [
    { speaker: 'eileen', text: '你做到了！这些星尘……我能感受到其中蕴含的古老力量！', nextKey: 'eileen_post_quest2' },
    { speaker: 'eileen', text: '让我用它们为你编织一道星光护盾吧。这会保护你免受暗影的侵蚀。', action: 'heal', nextKey: 'eileen_thanks' },
  ],

  eileen_thanks: [
    { speaker: 'eileen', text: '谢谢你，旅者。这片大陆的命运或许就掌握在你手中。', nextKey: null },
  ],

  gregor_intro: [
    { speaker: 'gregor', text: '哼，又来了一个面生的小子？我是格雷戈尔，这里唯一的铁匠。', nextKey: 'gregor_intro2' },
    { speaker: 'gregor', text: '看你这身行头……怕是连只史莱姆都打不过吧？', nextKey: 'gregor_upgrade' },
  ],

  gregor_upgrade: [
    { speaker: 'gregor', text: '不过嘛……如果你能帮我弄点好材料来，我可以给你升级武器和护甲。', nextKey: 'gregor_desert_lore' },
    { speaker: 'gregor', text: '沙漠废墟那边有些古代遗物，据说蕴含着失传的锻造技术。', nextKey: 'gregor_quest_offer' },
  ],

  gregor_desert_lore: [
    { speaker: 'gregor', text: '那些废墟曾经是古代工匠的圣地……直到虚空吞噬了一切。', nextKey: 'gregor_quest_offer' },
  ],

  gregor_quest_offer: [
    { speaker: 'gregor', text: '给我带3个沙漠遗物回来，我就给你打造一把真正的英雄之剑！', action: 'quest_accept', questKey: 'desert_relics', choices: [{ text: '成交！我去沙漠看看', nextKey: 'gregor_quest_accept' }, { text: '听起来很危险…', nextKey: 'gregor_decline' }] },
  ],

  gregor_quest_accept: [
    { speaker: 'gregor', text: '哈哈！这才像个冒险者的样子！小心那里的蝎子王，它可不是好惹的。', nextKey: 'gregor_after' },
  ],

  gregor_decline: [
    { speaker: 'gregor', text: '切，胆小鬼。等你什么时候有胆量了再来找我吧。', nextKey: 'gregor_after' },
  ],

  gregor_after: [
    { speaker: 'gregor', text: '别站在我这儿挡光！去干活！', nextKey: null },
  ],

  gregor_post_quest: [
    { speaker: 'gregor', text: '哦？！你真的把遗物带回来了？！让我好好瞧瞧……', nextKey: 'gregor_post_quest2' },
    { speaker: 'gregor', text: '好东西！好东西！这可是上古星辰钢的残片！', action: 'give_item', item: 'steel_blade', count: 1, nextKey: 'gregor_craft' },
  ],

  gregor_craft: [
    { speaker: 'gregor', text: '拿好了！这是我打造的星辰之刃，用它劈开一切阻碍吧！', nextKey: null },
  ],

  kashim_intro: [
    { speaker: 'kashim', text: '呵呵呵……稀客，真是稀客。我是卡希姆，一个四处游荡的商人。', nextKey: 'kashim_intro2' },
    { speaker: 'kashim', text: '你身上的气息很有趣……像是被命运选中的样子。', nextKey: 'kashim_shop' },
  ],

  kashim_shop: [
    { speaker: 'kashim', text: '我这里有一些稀有的商品……药水、卷轴、还有来自远方的情报。你想看看吗？', choices: [{ text: '购买药水 (50金)', nextKey: 'kashim_buy_potion', action: 'buy_potion' }, { text: '打听圣城的秘密', nextKey: 'kashim_holycity' }, { text: '没什么需要的', nextKey: 'kashim_leave' }] },
  ],

  kashim_buy_potion: [
    { speaker: 'kashim', text: '明智的选择，朋友。生命药水能在关键时刻救你一命。', nextKey: 'kashim_leave' },
  ],

  kashim_holycity: [
    { speaker: 'kashim', text: '圣辉之城啊……那里隐藏着一个不为人知的秘密。', nextKey: 'kashim_holycity2' },
    { speaker: 'kashim', text: '城门由圣骑士团严密把守，想要进去需要"圣城钥匙"——但那把钥匙早已碎裂成三片。', nextKey: 'kashim_quest_offer' },
  ],

  kashim_quest_offer: [
    { speaker: 'kashim', text: '如果你能找到3片钥匙碎片，我不仅告诉你进入圣城的方法，还会送你一份大礼。', action: 'quest_accept', questKey: 'holy_key', choices: [{ text: '钥匙碎片在哪里？', nextKey: 'kashim_quest_accept' }, { text: '这代价太大了', nextKey: 'kashim_decline' }] },
  ],

  kashim_quest_accept: [
    { speaker: 'kashim', text: '一片在冰龙巢穴深处，一片在虚空废墟的中心，最后一片……据说在堕落圣徒手中。祝你好运，朋友。', nextKey: 'kashim_after' },
  ],

  kashim_decline: [
    { speaker: 'kashim', text: '呵呵，没关系。秘密总会等有准备的人。', nextKey: 'kashim_after' },
  ],

  kashim_after: [
    { speaker: 'kashim', text: '记住，在这个世界，信息比黄金更值钱。我们再会。', nextKey: null },
  ],

  kashim_post_quest: [
    { speaker: 'kashim', text: '你……你竟然真的集齐了所有碎片！看来命运真的选中了你。', nextKey: 'kashim_post_quest2' },
    { speaker: 'kashim', text: '这是承诺给你的礼物——虚空罗盘，它能指引你找到最后的真相。', action: 'give_item', item: 'void_compass', count: 1, nextKey: null },
  ],

  vera_intro: [
    { speaker: 'vera', text: '欢迎来到雪原诊所。我是薇拉，这里的治愈师。', nextKey: 'vera_intro2' },
    { speaker: 'vera', text: '你看起来受了不小的伤……让我先为你治疗一下吧。', action: 'heal', nextKey: 'vera_dragon' },
  ],

  vera_dragon: [
    { speaker: 'vera', text: '听我说……北方的冰龙正在苏醒。它的怒火能冻结整个世界。', nextKey: 'vera_dragon2' },
    { speaker: 'vera', text: '如果没人阻止它，永霜雪原将变成一片死寂的冰墓。', nextKey: 'vera_quest_offer' },
  ],

  vera_quest_offer: [
    { speaker: 'vera', text: '冰龙的鳞片是极珍贵的炼金材料……如果你能击败它并带回3片龙鳞，我可以为你制作最强的恢复药剂。', action: 'quest_accept', questKey: 'dragon_scales', choices: [{ text: '我会去面对冰龙的', nextKey: 'vera_quest_accept' }, { text: '冰龙……太强了', nextKey: 'vera_decline' }] },
  ],

  vera_quest_accept: [
    { speaker: 'vera', text: '谢谢你……你是真正的勇士。请务必小心，冰龙的寒息能瞬间冻结灵魂。', nextKey: 'vera_after' },
  ],

  vera_decline: [
    { speaker: 'vera', text: '我理解……面对那样的存在需要莫大的勇气。', nextKey: 'vera_after' },
  ],

  vera_after: [
    { speaker: 'vera', text: '无论何时，只要你需要治愈，我的诊所大门永远为你敞开。', nextKey: null },
  ],

  vera_post_quest: [
    { speaker: 'vera', text: '这些龙鳞……如此纯净而冰冷……你真的战胜了那条远古巨龙！', nextKey: 'vera_post_quest2' },
    { speaker: 'vera', text: '让我用它们为你炼制永恒之霜药剂——它能让你在战斗中持续恢复生命力。', action: 'give_item', item: 'eternal_frost_potion', count: 1, nextKey: null },
  ],

  noah_intro: [
    { speaker: 'noah', text: '嘘……轻点声。我在研究一些非常重要的东西。', nextKey: 'noah_intro2' },
    { speaker: 'noah', text: '我是诺亚，一名虚空研究者。你听说过"虚空吞噬者"吗？', nextKey: 'noah_lore' },
  ],

  noah_lore: [
    { speaker: 'noah', text: '它是来自虚空的古老存在，以整个世界的能量为食。千年之前被封印，但现在封印正在减弱……', nextKey: 'noah_lore2' },
    { speaker: 'noah', text: '各地的异常现象——暗影生物、冰龙苏醒、废墟中的虚空裂缝——都是它在挣脱束缚的征兆。', nextKey: 'noah_quest_offer' },
  ],

  noah_quest_offer: [
    { speaker: 'noah', text: '我需要从不同区域收集虚空样本进行研究。如果能拿到5份样本，我就能分析出封印减弱的原因。', action: 'quest_accept', questKey: 'void_research', choices: [{ text: '我来帮你收集样本', nextKey: 'noah_quest_accept' }, { text: '虚空研究太危险了', nextKey: 'noah_decline' }] },
  ],

  noah_quest_accept: [
    { speaker: 'noah', text: '太好了！击败虚空区域的敌人就有机会获得虚空样本。注意安全，那些地方的危险超乎想象。', nextKey: 'noah_after' },
  ],

  noah_decline: [
    { speaker: 'noah', text: '我理解你的顾虑……但时间不等人。当你改变主意时，来找我吧。', nextKey: 'noah_after' },
  ],

  noah_after: [
    { speaker: 'noah', text: '知识就是力量，而真理往往隐藏在最危险的地方。', nextKey: null },
  ],

  noah_post_quest: [
    { speaker: 'noah', text: '不可思议……这些样本中蕴含的能量模式与千年前的记录完全一致！', nextKey: 'noah_post_quest2' },
    { speaker: 'noah', text: '根据分析，虚空吞噬者的核心位于圣辉之城地下的虚空裂缝中。你必须在那里做出最终的选择。', nextKey: null },
  ],

  guard_captain_intro: [
    { speaker: 'guard_captain', text: '站住！圣辉之城是神圣之地，未经许可不得入内！', nextKey: 'guard_captain_intro2' },
    { speaker: 'guard_captain', text: '除非你能出示圣城的通行证或证明你的身份，否则请回吧。', choices: [{ text: '展示圣城钥匙', nextKey: 'guard_captain_check_key' }, { text: '我需要进城', nextKey: 'guard_captain_deny' }] },
  ],

  guard_captain_check_key: [
    { speaker: 'guard_captain', text: '这……这是完整的圣城钥匙？！你从哪里得到的？！', nextKey: 'guard_captain_let_in' },
  ],

  guard_captain_let_in: [
    { speaker: 'guard_captain', text: '既然你有钥匙……那就进来吧。但我要警告你：城里面有些事情……不太对劲。', action: 'teleport', targetRegion: 4, targetX: 1216, targetY: 960, nextKey: 'guard_captain_hint' },
  ],

  guard_captain_hint: [
    { speaker: 'guard_captain', text: '最近城主一直把自己关在大殿里……有人说他变了。你自己多加小心。', nextKey: null },
  ],

  guard_captain_deny: [
    { speaker: 'guard_captain', text: '没有证明？那就请回吧。圣城的规矩不能破。', nextKey: null },
  ],

  guard_captain_boss_hint: [
    { speaker: 'guard_captain', text: '那个所谓的"城主"……我觉得他已经不是原来的那个人了。小心堕落圣徒。', nextKey: null },
  ],

  ancient_tree_spirit_pre: [
    { speaker: 'ancient_tree_spirit', text: '……凡人……为何打扰千年的沉眠……', nextKey: 'ancient_tree_spirit_pre2' },
    { speaker: 'ancient_tree_spirit', text: '这片森林的记忆在我体内流淌……而你身上带着星陨的气息。', nextKey: 'ancient_tree_spirit_pre3' },
    { speaker: 'ancient_tree_spirit', text: '证明你的价值吧！让我看看你是否配得上星辰的力量！', nextKey: null },
  ],

  ancient_tree_spirit_post: [
    { speaker: 'ancient_tree_spirit', text: '…… impressive ……你的意志如钢铁般坚定。', nextKey: 'ancient_tree_spirit_post2' },
    { speaker: 'ancient_tree_spirit', text: '拿去吧，这是自然之心的祝福。它会引导你在黑暗中前行。', action: 'give_item', item: 'nature_heart', count: 1, nextKey: null },
  ],

  scorpion_king_pre: [
    { speaker: 'scorpion_king', text: '嘎嘎嘎！又一只送死的虫子！这片沙漠是我的领地！', nextKey: 'scorpion_king_pre2' },
    { speaker: 'scorpion_king', text: '我的毒刺曾刺穿无数勇者的心脏……你也想成为其中之一吗？！', nextKey: null },
  ],

  scorpion_king_post: [
    { speaker: 'scorpion_king', text: '不可……可能……竟有人类能打败我……', nextKey: 'scorpion_king_post2' },
    { speaker: 'scorpion_king', text: '拿走我的毒晶……希望它能替我……完成未竟的复仇……', action: 'give_item', item: 'venom_crystal', count: 1, nextKey: null },
  ],

  ice_dragon_pre: [
    { speaker: 'ice_dragon', text: '……愚蠢的……暖血生物……竟敢踏入……我的领域……', nextKey: 'ice_dragon_pre2' },
    { speaker: 'ice_dragon', text: '我的寒息冻结过整片大陆……而你……不过是一粒转瞬即逝的尘埃……', nextKey: null },
  ],

  ice_dragon_post: [
    { speaker: 'ice_dragon', text: '……火焰……温暖的感觉……久违了……', nextKey: 'ice_dragon_post2' },
    { speaker: 'ice_dragon', text: '取下我的鳞片……让这份寒冷化为守护而非毁灭之力……', action: 'give_item', item: 'dragon_scale_fragment', count: 3, nextKey: null },
  ],

  void_devourer_pre: [
    { speaker: 'void_devourer', text: '█████ 终于……来了……我等待了……千年……', nextKey: 'void_devourer_pre2' },
    { speaker: 'void_devourer', text: '星辰的碎片在你体内共鸣……完美的……容器……', nextKey: 'void_devourer_pre3' },
    { speaker: 'void_devourer', text: '成为虚空的一部分吧……所有的痛苦、恐惧……都将归于虚无……', nextKey: null },
  ],

  void_devourer_post: [
    { speaker: 'void_devourer', text: '……不可能……星光的意志……胜过了……虚无……', nextKey: 'void_devourer_post2' },
    { speaker: 'void_devourer', text: '封印……重新凝聚……这个世界……暂时安全了……', nextKey: null },
  ],

  fallen_saint_pre: [
    { speaker: 'fallen_saint', text: '虔诚者……你以为信仰能拯救你吗？', nextKey: 'fallen_saint_pre2' },
    { speaker: 'fallen_saint', text: '我曾像你一样盲目相信光明……直到我看到了真相！', nextKey: 'fallen_saint_pre3' },
    { speaker: 'fallen_saint', text: '光明与黑暗本是一体！唯有融合两者才能达到真正的救赎！', nextKey: null },
  ],

  fallen_saint_post: [
    { speaker: 'fallen_saint', text: '难道……我错了吗？这股力量……星光……', nextKey: 'fallen_saint_post2' },
    { speaker: 'fallen_saint', text: '也许……也许还有另一条路……原谅我……', action: 'give_item', item: 'saint_crown', count: 1, nextKey: null },
  ],
};

export const quests: Record<string, QuestDef> = {
  stardust: {
    key: 'stardust',
    name: '星落之证',
    description: '为艾琳收集5枚星尘，帮助她解读陨星的秘密。',
    giverNpc: 'eileen',
    target: 'stardust',
    requiredCount: 5,
    rewardGold: 100,
    rewardExp: 150,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  desert_relics: {
    key: 'desert_relics',
    name: '沙漠遗物',
    description: '为铁匠格雷戈尔从沙漠废墟带回3件古代遗物。',
    giverNpc: 'gregor',
    target: 'desert_relic',
    requiredCount: 3,
    rewardGold: 200,
    rewardExp: 300,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  holy_key: {
    key: 'holy_key',
    name: '圣城钥匙',
    description: '为商人卡希姆收集3片圣城钥匙碎片，换取进入圣辉之城的方法。',
    giverNpc: 'kashim',
    target: 'key_fragment',
    requiredCount: 3,
    rewardGold: 300,
    rewardExp: 400,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  dragon_scales: {
    key: 'dragon_scales',
    name: '冰龙之鳞',
    description: '击败永霜雪原的冰龙，为薇拉带回3片龙鳞。',
    giverNpc: 'vera',
    target: 'dragon_scale',
    requiredCount: 3,
    rewardGold: 500,
    rewardExp: 600,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  void_research: {
    key: 'void_research',
    name: '虚空研究',
    description: '为学者诺亚从各区域收集5份虚空样本，帮助分析封印减弱的原因。',
    giverNpc: 'noah',
    target: 'void_sample',
    requiredCount: 5,
    rewardGold: 400,
    rewardExp: 500,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  seal_the_rift: {
    key: 'seal_the_rift',
    name: '封印裂缝',
    description: '前往圣辉之城地下，彻底封印虚空吞噬者的核心。',
    giverNpc: 'noah',
    target: 'void_devourer',
    requiredCount: 1,
    rewardGold: 1000,
    rewardExp: 2000,
    completed: false,
    currentCount: 0,
    accepted: false,
  },
  true_ending: {
    key: 'true_ending',
    name: '最终抉择',
    description: '在虚空核心面前做出选择——这将决定整个世界的命运。',
    giverNpc: 'none',
    requiredCount: 1,
    rewardGold: 0,
    rewardExp: 5000,
    completed: false,
    currentCount: 0,
    accepted: true,
  },
  gather_power: {
    key: 'gather_power',
    name: '力量之路',
    description: '收集各地BOSS掉落的传奇物品，获得足以挑战最终敌人的力量。',
    giverNpc: 'none',
    target: 'legendary_item',
    requiredCount: 5,
    rewardGold: 0,
    rewardExp: 3000,
    completed: false,
    currentCount: 0,
    accepted: true,
  },
};

export const endings: Record<string, { title: string; description: string; epilogue: string[] }> = {
  good_ending: {
    title: '星光之路',
    description: '你选择了封印虚空裂缝，以自己的星光之力填补了破碎的封印。虚空吞噬者的低语渐渐消散，世界重归和平。',
    epilogue: [
      '在封印完成的刹那，一道耀眼的光芒笼罩了整个大陆。',
      '所有的暗影生物在这一刻烟消云散，被净化为纯净的光点。',
      '艾琳站在森林边缘，看着天空中重新亮起的繁星，露出欣慰的笑容。',
      '格雷戈尔放下了手中的锤子，第一次安静地仰望星空。',
      '薇拉的诊所里，伤者们惊奇地发现自己的伤口在快速愈合。',
      '卡希姆收起了他的商品，喃喃道："最好的货物，是自由。"',
      '诺亚合上了厚厚的笔记："新的纪元……开始了。"',
      '而你——星光之旅者，成为了这片大陆新的守护者。',
      '每当夜幕降临，人们都能看到天空中有一颗特别明亮的星星，那就是你的化身。',
      '—— 暮光之境 · 陨星回响 —— THE END ——',
    ],
  },
  bad_ending: {
    title: '虚空之力',
    description: '你选择了吸收虚空的力量，获得了无穷的能量，但也逐渐失去了自我意识。新的威胁诞生了。',
    epilogue: [
      '当你的手触碰虚空核心的那一刻，无尽的黑暗涌入你的身体。',
      '你感到前所未有的强大——却又感到某种重要的东西正在离你而去。',
      '记忆开始模糊……艾琳的脸、格雷戈尔的笑声、薇拉的温柔……都在褪色。',
      '"这就是……力量吗？"你听到自己陌生的声音在回响。',
      '虚空吞噬者没有消失——它与你融为一体，成为了新的、更可怕的存在。',
      '大地再次颤抖，天空变成了深紫色。',
      '幸存的人们绝望地看着那个曾经被称为"英雄"的身影，如今已化身为虚空之王。',
      '也许在某个平行世界里，你做出了不同的选择。',
      '但在这里……故事以另一种方式结束了。',
      '—— 暮光之境 · 陨星回响 —— BAD END ——',
    ],
  },
};
