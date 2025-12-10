import type { DeckInfo } from "../srs/types"

const { Button } = orca.components

type DeckCardCompactProps = {
  deck: DeckInfo
  onViewDeck: (deckName: string) => void
  onReviewDeck: (deckName: string) => void
}

export default function DeckCardCompact({ deck, onViewDeck, onReviewDeck }: DeckCardCompactProps) {
  const dueCount = deck.overdueCount + deck.todayCount

  return (
    <div
      style={{
        border: "1px solid var(--orca-color-border-1)",
        borderRadius: "12px",
        padding: "16px",
        backgroundColor: "var(--orca-color-bg-1)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--orca-color-text-1)" }}>
            {deck.name}
          </div>
          <div style={{ fontSize: "12px", color: "var(--orca-color-text-3)", marginTop: "4px" }}>
            新卡 {deck.newCount} · 到期 {dueCount} · 总数 {deck.totalCount}
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <Button variant="plain" onClick={() => onViewDeck(deck.name)} style={{ fontSize: "12px" }}>
            查看
          </Button>
          <Button variant="solid" onClick={() => onReviewDeck(deck.name)} style={{ fontSize: "12px" }}>
            复习
          </Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
        <StatPill label="新卡" value={deck.newCount} color="var(--orca-color-primary-6)" />
        <StatPill label="今天" value={deck.todayCount} color="var(--orca-color-warning-6)" />
        <StatPill label="已到期" value={deck.overdueCount} color="var(--orca-color-danger-6)" />
      </div>
    </div>
  )
}

type StatPillProps = {
  label: string
  value: number
  color: string
}

function StatPill({ label, value, color }: StatPillProps) {
  return (
    <div
      style={{
        borderRadius: "8px",
        border: "1px solid var(--orca-color-border-1)",
        padding: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}
    >
      <div style={{ fontSize: "12px", color: "var(--orca-color-text-3)" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 600, color }}>{value}</div>
    </div>
  )
}
