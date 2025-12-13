import type { DeckInfo } from "../srs/types"

const { useState } = window.React
const { Button } = orca.components

type DeckCardCompactProps = {
  deck: DeckInfo
  onViewDeck: (deckName: string) => void
  onReviewDeck: (deckName: string) => void
}

export default function DeckCardCompact({ deck, onViewDeck, onReviewDeck }: DeckCardCompactProps) {
  const [isHovered, setIsHovered] = useState(false)
  const dueCount = deck.overdueCount + deck.todayCount

  return (
    <div
      onClick={() => onViewDeck(deck.name)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: "12px",
        padding: "16px 20px",
        backgroundColor: "var(--orca-color-bg-1)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        transition: "background-color 0.2s ease",
        ...(isHovered ? { backgroundColor: "var(--orca-color-bg-2)" } : {})
      }}
    >
      {/* 左侧：名称 + 统计 */}
      <div>
        <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--orca-color-text-1)" }}>
          {deck.name}
        </div>
        <div style={{ fontSize: "12px", color: "var(--orca-color-text-3)", marginTop: "4px" }}>
          {dueCount > 0 ? (
            <span style={{ color: "var(--orca-color-warning-6)" }}>{dueCount} 待复习</span>
          ) : (
            <span>已完成</span>
          )}
          {deck.newCount > 0 && <span> · {deck.newCount} 新卡</span>}
        </div>
      </div>

      {/* 右侧：悬浮复习按钮 */}
      <div style={{
        opacity: isHovered ? 1 : 0,
        transition: "opacity 0.2s ease",
        pointerEvents: isHovered ? "auto" : "none"
      }}>
        <Button
          variant="solid"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation()
            onReviewDeck(deck.name)
          }}
          style={{
            padding: "8px 16px",
            fontSize: "13px",
            borderRadius: "16px"
          }}
        >
          复习
        </Button>
      </div>
    </div>
  )
}

