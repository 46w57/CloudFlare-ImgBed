## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "React游戏外壳" --> "Canvas游戏引擎"
        "Canvas游戏引擎" --> "渲染系统"
        "Canvas游戏引擎" --> "物理系统"
        "Canvas游戏引擎" --> "输入系统"
        "Canvas游戏引擎" --> "音频系统"
    end
    subgraph "游戏逻辑层"
        "场景管理器" --> "地图系统"
        "场景管理器" --> "实体系统"
        "实体系统" --> "玩家控制器"
        "实体系统" --> "AI控制器"
        "实体系统" --> "战斗系统"
        "剧情管理器" --> "对话系统"
        "剧情管理器" --> "任务系统"
    end
    subgraph "数据层"
        "资源管理器" --> "精灵图集"
        "资源管理器" --> "地图数据"
        "资源管理器" --> "音效数据"
        "存档管理器" --> "LocalStorage"
    end
    "Canvas游戏引擎" --> "场景管理器"
    "Canvas游戏引擎" --> "剧情管理器"
    "场景管理器" --> "资源管理器"
    "场景管理器" --> "存档管理器"
```

## 2. 技术说明
- **前端框架**：React@18 + TypeScript + Vite
- **游戏引擎**：自研Canvas 2D游戏引擎（基于HTML5 Canvas API）
- **状态管理**：Zustand（UI状态） + 游戏内部状态机（游戏逻辑）
- **样式方案**：TailwindCSS@3（UI层） + Canvas渲染（游戏画面）
- **数据存储**：LocalStorage（存档） + 内嵌JSON数据（地图/剧情/物品）
- **音频**：Web Audio API
- **无后端**：纯前端单机游戏

## 3. 项目结构

```
src/
├── engine/           # 游戏引擎核心
│   ├── Game.ts       # 游戏主循环
│   ├── Renderer.ts   # Canvas渲染器
│   ├── Camera.ts     # 摄像机系统
│   ├── Input.ts      # 输入管理
│   ├── Audio.ts      # 音频管理
│   └── Physics.ts    # 碰撞检测
├── world/            # 世界系统
│   ├── TileMap.ts    # 瓦片地图
│   ├── Region.ts     # 区域管理
│   ├── Weather.ts    # 天气系统
│   └── DayNight.ts   # 日夜循环
├── entities/         # 实体系统
│   ├── Entity.ts     # 基础实体
│   ├── Player.ts     # 玩家角色
│   ├── Enemy.ts      # 敌人
│   ├── NPC.ts        # NPC
│   └── Boss.ts       # Boss
├── combat/           # 战斗系统
│   ├── CombatSystem.ts  # 战斗管理
│   ├── Skill.ts      # 技能定义
│   └── Projectile.ts # 投射物
├── story/            # 剧情系统
│   ├── StoryManager.ts # 剧情管理
│   ├── Dialogue.ts   # 对话系统
│   ├── Quest.ts      # 任务系统
│   └── chapters/     # 各章节数据
├── items/            # 物品系统
│   ├── Item.ts       # 物品定义
│   ├── Equipment.ts  # 装备系统
│   └── Inventory.ts  # 背包管理
├── sprites/          # 精灵与动画
│   ├── SpriteSheet.ts # 精灵图集
│   ├── Animation.ts  # 动画系统
│   ├── Particle.ts   # 粒子系统
│   └── data/         # 精灵数据定义
├── ui/               # 游戏UI组件
│   ├── HUD.tsx       # 游戏HUD
│   ├── DialogBox.tsx # 对话框
│   ├── InventoryUI.tsx # 背包界面
│   ├── MainMenu.tsx  # 主菜单
│   └── Settings.tsx  # 设置界面
├── data/             # 游戏数据
│   ├── maps/         # 地图数据
│   ├── items/        # 物品数据
│   ├── enemies/      # 敌人数据
│   ├── skills/       # 技能数据
│   └── dialogues/    # 对话数据
├── store/            # 状态管理
│   └── gameStore.ts  # Zustand store
├── App.tsx           # 应用入口
└── main.tsx          # 渲染入口
```

## 4. 核心系统设计

### 4.1 渲染系统
- Canvas 2D渲染，像素完美模式（imageSmoothingEnabled = false）
- 整数倍缩放确保像素锐利
- 多层渲染：背景层 → 地形层 → 实体层 → 特效层 → UI层
- 视差滚动背景
- 动态光照：基于Canvas的2D光照模拟

### 4.2 地图系统
- 基于Tiled风格的瓦片地图
- 每个区域独立地图文件（JSON格式）
- 碰撞层、装饰层、触发层分离
- 区域间无缝过渡
- 地图尺寸：每区域 100x100 Tiles（1600x1600像素世界坐标）

### 4.3 战斗系统
- 实时动作战斗，非回合制
- 攻击类型：普攻、重击、技能、闪避
- 伤害公式：基础攻击 × 技能倍率 × (1 + 属性加成) - 敌方防御
- 击退和硬直机制
- 技能冷却系统

### 4.4 剧情系统
- 事件驱动的剧情管理器
- 对话树结构支持分支选项
- 剧情触发条件：区域进入、NPC交互、物品获取、Boss击败
- 剧情演出：角色移动、屏幕震动、特效播放、画面渐变

### 4.5 存档系统
- LocalStorage存储
- 存档内容：玩家位置、等级、装备、任务进度、剧情进度、地图探索度
- 自动存档：区域切换时、Boss战后
- 3个存档槽位

## 5. 像素美术技术方案

### 5.1 精灵渲染
- 所有精灵通过Canvas程序化生成 + 精灵数据定义
- 精灵数据：像素级颜色数组，定义每个像素的RGBA值
- 动画帧：多帧精灵数据切换
- 运行时将精灵数据渲染到离屏Canvas，再绘制到主Canvas

### 5.2 地形渲染
- 瓦片集通过程序化生成，每个Tile有精细的像素细节
- 自动拼接：相邻Tile边缘自动过渡
- 装饰层：花草、石头等随机装饰
- 水面动画：像素波浪效果

### 5.3 特效系统
- 粒子系统：火焰、烟雾、魔法光效
- 屏幕后处理：色调映射、暗角效果
- 天气特效：雨滴、雪花、沙尘
- 战斗特效：斩击弧光、魔法弹、爆炸

## 6. 性能优化
- 离屏Canvas缓存静态Tile
- 视口裁剪：只渲染可见区域的Tile和实体
- 精灵图集打包减少绘制调用
- 对象池复用粒子和投射物
- requestAnimationFrame驱动游戏循环
- 固定时间步长物理更新（60FPS）

## 7. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面（包含所有游戏状态） |

## 8. 数据模型

### 8.1 核心数据结构
```typescript
interface PlayerData {
  name: string
  level: number
  exp: number
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  attack: number
  defense: number
  speed: number
  x: number
  y: number
  region: string
  equipment: EquipmentSlots
  inventory: InventoryItem[]
  skills: string[]
  quests: QuestProgress[]
  storyFlags: Record<string, boolean>
}

interface EnemyData {
  id: string
  name: string
  hp: number
  attack: number
  defense: number
  speed: number
  exp: number
  drops: DropItem[]
  skills: string[]
  sprite: string
  animations: Record<string, number[]>
}

interface MapData {
  id: string
  name: string
  width: number
  height: number
  tilesets: string[]
  layers: MapLayer[]
  collisions: number[][]
  spawns: SpawnPoint[]
  transitions: MapTransition[]
}

interface DialogueData {
  id: string
  speaker: string
  portrait: string
  text: string
  choices?: DialogueChoice[]
  next?: string
  action?: DialogueAction
}
```

### 8.2 存档数据
```typescript
interface SaveData {
  slot: number
  timestamp: number
  player: PlayerData
  worldState: {
    defeatedBosses: string[]
    openedChests: string[]
    npcStates: Record<string, string>
    regionProgress: string
  }
  playTime: number
}
```
