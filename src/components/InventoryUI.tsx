import { useState } from 'react'
import { useGameStore } from '../store/gameStore'

const rarityColor: Record<string, string> = {
  common: '#c0c0c0',
  uncommon: '#40c040',
  rare: '#4080e0',
  epic: '#a040e0',
  legendary: '#E0C040',
}

const rarityLabel: Record<string, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

const typeLabel: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
  consumable: '消耗品',
  material: '材料',
  key: '关键物品',
}

const slotLabel: Record<string, string> = {
  weapon: '武器',
  armor: '护甲',
  accessory: '饰品',
}

export default function InventoryUI() {
  const stats = useGameStore(s => s.playerStats)
  const inventory = useGameStore(s => s.inventory)
  const equipment = useGameStore(s => s.equipment)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [tab, setTab] = useState<'all' | 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'key'>('all')

  const filtered = tab === 'all' ? inventory : inventory.filter(item => item.type === tab)
  const selectedItem = selectedIdx !== null ? filtered[selectedIdx] ?? null : null

  const eqSlots = [
    { key: 'weapon' as const, label: '武器', item: equipment.weapon },
    { key: 'armor' as const, label: '护甲', item: equipment.armor },
    { key: 'accessory' as const, label: '饰品', item: equipment.accessory },
  ]

  const tabs = [
    { key: 'all' as const, label: '全部' },
    { key: 'weapon' as const, label: '武器' },
    { key: 'armor' as const, label: '护甲' },
    { key: 'accessory' as const, label: '饰品' },
    { key: 'consumable' as const, label: '消耗' },
    { key: 'material' as const, label: '材料' },
    { key: 'key' as const, label: '关键' },
  ]

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '800px',
      height: '600px',
      background: 'rgba(10,10,30,0.92)',
      fontFamily: "'Press Start 2P', monospace",
      display: 'flex',
      flexDirection: 'column',
      padding: 16,
      boxSizing: 'border-box',
    }}>
      <div style={{
        fontSize: 14,
        color: '#E0C040',
        textAlign: 'center',
        marginBottom: 12,
        textShadow: '0 0 10px rgba(224,192,64,0.4)',
      }}>
        背包
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        fontSize: 7,
        color: '#aaa',
        marginBottom: 8,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {tabs.map(t => (
          <span
            key={t.key}
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              background: tab === t.key ? '#2a4a6e' : 'transparent',
              border: tab === t.key ? '1px solid #6B4C9A' : '1px solid transparent',
              borderRadius: 2,
              color: tab === t.key ? '#fff' : '#888',
            }}
            onClick={() => { setTab(t.key); setSelectedIdx(null) }}
          >
            {t.label}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            flex: 1,
            alignContent: 'flex-start',
            overflowY: 'auto',
          }}>
            {filtered.map((item, i) => (
              <div
                key={`${item.itemId}-${i}`}
                style={{
                  width: 72,
                  height: 72,
                  background: selectedIdx === i ? '#2a3a5e' : '#1a1a2e',
                  border: `2px solid ${selectedIdx === i ? rarityColor[item.rarity] : '#333'}`,
                  borderRadius: 4,
                  padding: 4,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box',
                }}
                onClick={() => setSelectedIdx(i)}
                onMouseEnter={e => {
                  if (selectedIdx !== i) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#555'
                  }
                }}
                onMouseLeave={e => {
                  if (selectedIdx !== i) {
                    (e.currentTarget as HTMLDivElement).style.borderColor = '#333'
                  }
                }}
              >
                <div style={{
                  fontSize: 7,
                  color: rarityColor[item.rarity],
                  textAlign: 'center',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                }}>
                  {item.name}
                </div>
                {item.quantity > 1 && (
                  <div style={{ fontSize: 7, color: '#888', marginTop: 2 }}>x{item.quantity}</div>
                )}
                <div style={{ fontSize: 6, color: '#666', marginTop: 2 }}>{typeLabel[item.type] ?? item.type}</div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ fontSize: 8, color: '#555', padding: 20, textAlign: 'center', width: '100%' }}>
                没有物品
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            background: '#1a1a2e',
            border: '2px solid #6B4C9A',
            borderRadius: 4,
            padding: 8,
          }}>
            <div style={{ fontSize: 9, color: '#E0C040', marginBottom: 6 }}>装备</div>
            {eqSlots.map(slot => (
              <div key={slot.key} style={{ fontSize: 7, color: '#aaa', marginBottom: 4, display: 'flex', gap: 4 }}>
                <span style={{ color: '#888', minWidth: 30 }}>{slot.label}:</span>
                <span style={{ color: slot.item ? rarityColor[slot.item.rarity] : '#555' }}>
                  {slot.item ? slot.item.name : '空'}
                </span>
              </div>
            ))}
          </div>

          <div style={{
            background: '#1a1a2e',
            border: '2px solid #6B4C9A',
            borderRadius: 4,
            padding: 8,
          }}>
            <div style={{ fontSize: 9, color: '#E0C040', marginBottom: 6 }}>属性</div>
            <div style={{ fontSize: 7, color: '#c0c0d0', lineHeight: 2 }}>
              <div>攻击: <span style={{ color: '#E04040' }}>{stats.attack}</span></div>
              <div>防御: <span style={{ color: '#4080E0' }}>{stats.defense}</span></div>
              <div>生命: <span style={{ color: '#40c040' }}>{stats.hp}</span></div>
              <div>魔力: <span style={{ color: '#4080E0' }}>{stats.mp}</span></div>
              <div>速度: <span style={{ color: '#E0C040' }}>{stats.speed}</span></div>
            </div>
          </div>

          {selectedItem && (
            <div style={{
              background: '#1a1a2e',
              border: `2px solid ${rarityColor[selectedItem.rarity]}`,
              borderRadius: 4,
              padding: 8,
              flex: 1,
            }}>
              <div style={{ fontSize: 9, color: rarityColor[selectedItem.rarity], marginBottom: 4 }}>
                {selectedItem.name}
              </div>
              <div style={{ fontSize: 6, color: rarityColor[selectedItem.rarity], marginBottom: 4 }}>
                {rarityLabel[selectedItem.rarity] ?? selectedItem.rarity} {typeLabel[selectedItem.type] ?? selectedItem.type}
              </div>
              <div style={{ fontSize: 7, color: '#aaa', lineHeight: 1.6, marginBottom: 4 }}>
                {selectedItem.description}
              </div>
              {selectedItem.stats && (
                <div style={{ fontSize: 7, color: '#40c040', lineHeight: 1.8 }}>
                  {Object.entries(selectedItem.stats).map(([k, v]) => (
                    <div key={k}>+{v} {k === 'attack' ? '攻击' : k === 'defense' ? '防御' : k === 'hp' ? '生命' : k === 'mp' ? '魔力' : k === 'speed' ? '速度' : k}</div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 7, color: '#E0C040', marginTop: 4 }}>
                价值: {selectedItem.value}G
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{
        fontSize: 8,
        color: '#555',
        textAlign: 'center',
        marginTop: 8,
      }}>
        按 I 关闭背包
      </div>
    </div>
  )
}
