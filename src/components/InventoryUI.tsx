import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

const ALL_ITEMS = [
  { id: 'health_potion', name: '生命药水', icon: '🧪', count: 5, description: '恢复50点生命值。由村中炼金术士精心调制，带有淡淡的草药香气。', type: 'consumable' },
  { id: 'mana_potion', name: '魔力药水', icon: '💎', count: 3, description: '恢复30点魔力值。蕴含星尘精华的蓝色液体，饮用后精神焕发。', type: 'consumable' },
  { id: 'iron_sword', name: '铁剑', icon: '🗡️', count: 1, description: '基础武器，攻击力+10。虽然朴素但锋利可靠，适合新手冒险者使用。', type: 'equipment' },
  { id: 'steel_sword', name: '精钢剑', icon: '⚔️', count: 1, description: '高级武器，攻击力+25。以陨星金属锻造而成，剑身隐隐泛着星光。', type: 'equipment' },
  { id: 'gold_coins', name: '金币袋', icon: '💰', count: 128, description: '通用的货币。装满了沉甸甸的金币，是冒险旅途中的必备之物。', type: 'quest' },
  { id: 'old_key', name: '锈蚀钥匙', icon: '🔑', count: 1, description: '古老的钥匙，表面布满锈迹，似乎能打开某扇被遗忘的门。', type: 'key' },
  { id: 'stardust', name: '星尘', icon: '✨', count: 7, description: '从陨落星辰上收集的粉末，散发着微弱的暖光，是珍贵的炼金材料。', type: 'quest' },
  { id: 'relic_fragment', name: '遗物碎片', icon: '🔮', count: 2, description: '上古文明的残片，触摸时能感受到微弱的能量波动。', type: 'quest' },
  { id: 'dragon_scale', name: '龙鳞', icon: '🛡️', count: 2, description: '从远古龙族身上掉落的鳞片，坚硬如铁，是制作顶级护甲的材料。', type: 'equipment' },
  { id: 'void_sample', name: '虚空样本', icon: '🌀', count: 1, description: '来自虚空的神秘物质，不断扭曲着周围的空间，需小心保存。', type: 'quest' },
  { id: 'key_fragment', name: '钥匙碎片', icon: '🧩', count: 3, description: '古老封印的碎片之一，集齐全部碎片可重铸开启虚空之门的钥匙。', type: 'key' },
];

const EQUIPMENT_SLOTS = [
  { key: 'weapon' as const, label: '武器', defaultIcon: '🗡️', emptyText: '无武器' },
  { key: 'armor' as const, label: '防具', defaultIcon: '👕', emptyText: '无防具' },
  { key: 'accessory' as const, label: '饰品', defaultIcon: '💍', emptyText: '无饰品' },
] as const;

const ITEM_ICONS: Record<string, string> = {
  iron_sword: '🗡️',
  steel_sword: '⚔️',
  cloth_armor: '👕',
  chain_armor: '🥋',
  star_necklace: '💫',
};

export default function InventoryUI() {
  const { inventoryItems, equipment, playerGold, toggleInventory } = useGameStore();
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'items' | 'equipment'>('items');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'i' || e.key === 'I' || e.key === 'Escape') {
        e.preventDefault();
        toggleInventory();
      }
      if (e.key === 'ArrowDown') {
        setSelectedItemIndex((prev) => Math.min(prev + 1, inventoryItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        setSelectedItemIndex((prev) => Math.max(prev - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventoryItems.length, toggleInventory]);

  const displayItems = inventoryItems.length > 0 ? inventoryItems : ALL_ITEMS;
  const selectedItem = displayItems[selectedItemIndex] || null;

  const gridSlots = Array.from({ length: 24 }, (_, i) => displayItems[i] || null);

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) toggleInventory(); }}
      style={{
        position: 'absolute', inset: 0,
        background: 'rgba(8, 6, 18, 0.92)',
        zIndex: 200, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '20px 24px',
        backdropFilter: 'blur(6px)',
        animation: 'fadeInLine 0.25s ease',
      }}
    >
      {/* Header */}
      <div style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
      }}>
        <h2 style={{
          fontFamily: "'Press Start 2P', monospace", fontSize: 16,
          color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.4)',
        }}>
          📦 背包
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 11,
            color: '#ffd700', display: 'flex', alignItems: 'center', gap: 4,
          }}>
            💰 {playerGold}
          </span>
          <button
            onClick={toggleInventory}
            style={{
              background: 'rgba(180,40,40,0.7)', border: '1px solid #c0392b',
              color: '#fff', fontFamily: "'Press Start 2P', monospace",
              fontSize: 9, padding: '6px 14px', borderRadius: 4,
              cursor: 'pointer', pointerEvents: 'auto',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(220,60,60,0.9)'}
            onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,40,40,0.7)'}
          >
            关闭 [I]
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['items', 'equipment'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 18px', border: 'none', borderRadius: '4px 4px 0 0',
              background: activeTab === tab ? 'rgba(138,43,226,0.35)' : 'rgba(30,25,50,0.6)',
              color: activeTab === tab ? '#d8b4fe' : '#888',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
              cursor: 'pointer', borderBottom: activeTab === tab
                ? '2px solid #a855f7' : '2px solid transparent',
              transition: 'all 0.15s', pointerEvents: 'auto',
            }}
          >
            {tab === 'items' ? '🎒 物品栏' : '⚔️ 装备'}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{
        display: 'flex', gap: 16, flex: 1, width: '100%',
        maxWidth: 720,
      }}>
        {/* Left Panel - Item Grid or Equipment */}
        {activeTab === 'items' ? (
          /* Item Grid */
          <div style={{
            background: 'rgba(15,12,30,0.85)', border: '2px solid #3a3a5a',
            borderRadius: 8, padding: 12, flexShrink: 0,
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
            }}>
              {gridSlots.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => item && setSelectedItemIndex(idx)}
                  onMouseEnter={() => item && setSelectedItemIndex(idx)}
                  style={{
                    width: 52, height: 52,
                    background: selectedItemIndex === idx && item
                      ? 'rgba(138,43,226,0.3)'
                      : 'rgba(25,20,45,0.8)',
                    border: selectedItemIndex === idx && item
                      ? '2px solid #a855f7'
                      : '1px solid rgba(70,60,100,0.5)',
                    borderRadius: 6,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 1, cursor: item ? 'pointer' : 'default',
                    transition: 'all 0.1s ease', position: 'relative',
                    pointerEvents: 'auto',
                  }}
                >
                  {item ? (
                    <>
                      <span style={{ fontSize: 20 }}>{item.icon}</span>
                      {item.count > 1 && (
                        <span style={{
                          position: 'absolute', bottom: 2, right: 4,
                          fontSize: 8, fontFamily: "'Press Start 2P', monospace",
                          color: '#ffd700', textShadow: '0 0 3px #000',
                        }}>{item.count}</span>
                      )}
                    </>
                  ) : (
                    <span style={{ fontSize: 10, color: 'rgba(80,70,110,0.3)' }}>·</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Equipment Panel */
          <div style={{
            background: 'rgba(15,12,30,0.85)', border: '2px solid #3a3a5a',
            borderRadius: 8, padding: 16, width: 260, flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <h3 style={{
              fontFamily: "'Press Start 2P', monospace", fontSize: 11,
              color: '#a78bfa', marginBottom: 4,
            }}>装备栏</h3>
            {EQUIPMENT_SLOTS.map((slot) => {
              const equippedItem = equipment[slot.key];
              const hasItem = equippedItem && equippedItem !== null;
              return (
                <div key={slot.key} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: 'rgba(25,20,45,0.8)',
                  border: `1px solid ${hasItem ? 'rgba(168,85,247,0.4)' : 'rgba(50,45,75,0.5)'}`,
                  borderRadius: 6,
                }}>
                  <span style={{ fontSize: 24, minWidth: 32, textAlign: 'center' }}>
                    {hasItem ? (ITEM_ICONS[equippedItem!] || slot.defaultIcon) : slot.defaultIcon}
                  </span>
                  <div>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                      color: hasItem ? '#d8b4fe' : '#666',
                    }}>{slot.label}</div>
                    <div style={{
                      fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                      color: hasItem ? '#888' : '#444', marginTop: 2,
                    }}>
                      {hasItem ? equippedItem : slot.emptyText}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Right Panel - Item Details */}
        <div style={{
          flex: 1, background: 'rgba(15,12,30,0.85)', border: '2px solid #3a3a5a',
          borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column',
        }}>
          {selectedItem ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 36 }}>{selectedItem.icon}</span>
                <div>
                  <h3 style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 13,
                    color: '#f0e8ff', lineHeight: 1.4,
                  }}>{selectedItem.name}</h3>
                  <span style={{
                    fontFamily: "'Press Start 2P', monospace", fontSize: 8,
                    color: selectedItem.type === 'consumable'
                      ? '#4ade80'
                      : selectedItem.type === 'equipment'
                        ? '#f59e0b'
                        : selectedItem.type === 'key'
                          ? '#ef4444'
                          : '#a78bfa',
                    padding: '2px 6px', borderRadius: 3,
                    background: `${selectedItem.type === 'consumable'
                      ? 'rgba(74,222,128,0.15)'
                      : selectedItem.type === 'equipment'
                        ? 'rgba(245,158,11,0.15)'
                        : selectedItem.type === 'key'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(167,139,250,0.15)'}`,
                  }}>
                    {selectedItem.type === 'consumable' ? '消耗品' :
                     selectedItem.type === 'equipment' ? '装备' :
                     selectedItem.type === 'key' ? '关键物品' : '任务物品'}
                  </span>
                </div>
              </div>
              <div style={{
                borderTop: '1px solid rgba(70,60,100,0.4)', paddingTop: 12,
              }}>
                <p style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 10,
                  color: '#b0a8c8', lineHeight: 2, whiteSpace: 'pre-wrap',
                }}>{selectedItem.description}</p>
              </div>
              <div style={{
                marginTop: 'auto', paddingTop: 12,
                borderTop: '1px solid rgba(70,60,100,0.4)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: "'Press Start 2P', monospace", fontSize: 9,
                  color: '#888',
                }}>数量: x{selectedItem.count}</span>
                {selectedItem.type === 'consumable' && (
                  <button style={{
                    background: 'rgba(34,139,34,0.6)', border: '1px solid #228b22',
                    color: '#90EE90', fontFamily: "'Press Start 2P', monospace",
                    fontSize: 9, padding: '6px 12px', borderRadius: 4,
                    cursor: 'pointer', pointerEvents: 'auto',
                    transition: 'background 0.15s',
                  }}>
                    使用
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', color: '#555',
              fontFamily: "'Press Start 2P', monospace", fontSize: 10,
            }}>
              选择一个物品查看详情
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
