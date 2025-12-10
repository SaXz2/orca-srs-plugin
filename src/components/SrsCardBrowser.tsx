/**
 * SRS 卡片浏览器组件
 * 功能：
 * - 两级导航：Deck 列表 → 卡片列表
 * - 支持按 Deck 复习或复习全部
 * - 支持按到期状态筛选（全部、已到期、今天到期、未来、新卡）
 * - 显示卡片基础信息（题目、上次复习时间、下次复习时间）
 * - 点击卡片跳转到对应块
 */

import type { Block, DbId, Repr } from "../orca.d.ts"
import type { DeckInfo, DeckStats, ReviewCard } from "../srs/types.ts"

const { useState, useEffect, useMemo, useCallback } = window.React
const { useSnapshot } = window.Valtio
const { ModalOverlay, Button } = orca.components

// 导入 main.ts 中的函数（需要在 main.ts 中导出）
import { calculateDeckStats, collectReviewCards, startReviewSession } from "../main.ts"

// 扩展 Block 类型以包含 _repr 属性
type BlockWithRepr = Block & { _repr?: Repr }

type ViewMode = "deck-list" | "card-list"

type SrsCardBrowserProps = {
  onClose: () => void
}

/**
 * 格式化日期时间
 */
function formatDateTime(date: Date | null): string {
  if (!date) return "从未复习"

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")

  return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 获取今天的开始和结束时间
 */
function getTodayRange(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start, end }
}

/**
 * 主组件
 */
export default function SrsCardBrowser({ onClose }: SrsCardBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("deck-list")
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null)

  return (
    <ModalOverlay visible={true} onClose={onClose}>
      {viewMode === "deck-list" ? (
        <DeckListView
          onSelectDeck={(deckName) => {
            setSelectedDeck(deckName)
            setViewMode("card-list")
          }}
          onStartReviewAll={() => {
            onClose()
            startReviewSession() // 复习所有 deck
          }}
        />
      ) : (
        <CardListView
          deckName={selectedDeck!}
          onBack={() => {
            setSelectedDeck(null)
            setViewMode("deck-list")
          }}
          onStartReviewDeck={(deckName) => {
            onClose()
            startReviewSession(deckName)
          }}
          onClose={onClose}
        />
      )}
    </ModalOverlay>
  )
}

/**
 * Deck 列表视图组件
 */
type DeckListViewProps = {
  onSelectDeck: (deckName: string) => void
  onStartReviewAll: () => void
}

function DeckListView({ onSelectDeck, onStartReviewAll }: DeckListViewProps) {
  const [deckStats, setDeckStats] = useState<DeckStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 加载 deck 统计
  useEffect(() => {
    async function loadStats() {
      setIsLoading(true)
      try {
        const { getPluginName } = await import("../main")
        const currentPluginName = typeof getPluginName === "function" ? getPluginName() : "orca-srs"
        const cards = await collectReviewCards(currentPluginName)
        const stats = calculateDeckStats(cards)
        setDeckStats(stats)
      } catch (error) {
        console.error("加载 deck 统计失败:", error)
        orca.notify("error", "加载失败，请重试")
      } finally {
        setIsLoading(false)
      }
    }
    void loadStats()
  }, [])

  if (isLoading || !deckStats) {
    return (
      <div style={{
        width: "600px",
        padding: "40px",
        textAlign: "center",
        backgroundColor: "var(--orca-color-bg-1)",
        borderRadius: "8px",
        color: "var(--orca-color-text-3)"
      }}>
        正在加载 deck 列表...
      </div>
    )
  }

  return (
    <div style={{
      width: "600px",
      maxHeight: "80vh",
      backgroundColor: "var(--orca-color-bg-1)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* 标题栏 */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--orca-color-border-1)",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <span style={{ fontSize: "20px" }}>🃏</span>
        <span style={{ fontSize: "16px", fontWeight: 600 }}>SRS 卡片浏览器</span>
      </div>

      {/* Deck 列表 */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px"
      }}>
        {deckStats.decks.length === 0 ? (
          <div style={{
            textAlign: "center",
            color: "var(--orca-color-text-3)",
            padding: "40px 20px"
          }}>
            没有找到卡片。请先使用 #card 或 #card/deckName 标签标记块。
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {deckStats.decks.map((deck: DeckInfo) => (
              <DeckCard
                key={deck.name}
                deck={deck}
                onClick={() => onSelectDeck(deck.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 + 全局复习按钮 */}
      <div style={{
        padding: "16px",
        borderTop: "1px solid var(--orca-color-border-1)"
      }}>
        <div style={{
          marginBottom: "12px",
          fontSize: "12px",
          color: "var(--orca-color-text-3)",
          textAlign: "center"
        }}>
          总计: {deckStats.totalNew} 新卡 | {deckStats.totalOverdue} 到期 | {deckStats.totalCards} 张卡片
        </div>
        <Button
          variant="solid"
          onClick={onStartReviewAll}
          style={{ width: "100%" }}
        >
          开始复习所有 Deck
        </Button>
      </div>
    </div>
  )
}

/**
 * 单个 Deck 卡片组件
 */
type DeckCardProps = {
  deck: DeckInfo
  onClick: () => void
}

function DeckCard({ deck, onClick }: DeckCardProps) {
  const dueCount = deck.overdueCount + deck.todayCount

  return (
    <div
      onClick={onClick}
      style={{
        padding: "16px",
        border: "1px solid var(--orca-color-border-1)",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s",
        backgroundColor: "var(--orca-color-bg-2)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--orca-color-primary-5)"
        e.currentTarget.style.backgroundColor = "var(--orca-color-bg-3)"
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--orca-color-border-1)"
        e.currentTarget.style.backgroundColor = "var(--orca-color-bg-2)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
        <span style={{ fontSize: "18px", marginRight: "8px" }}>📚</span>
        <span style={{ fontSize: "16px", fontWeight: 600 }}>
          {deck.name}
        </span>
      </div>

      <div style={{ fontSize: "13px", color: "var(--orca-color-text-2)" }}>
        <span style={{
          color: deck.newCount > 0 ? "var(--orca-color-primary-7)" : "inherit"
        }}>
          {deck.newCount} 新卡
        </span>
        <span style={{ margin: "0 8px" }}>|</span>
        <span style={{
          color: dueCount > 0 ? "var(--orca-color-warning-7)" : "inherit"
        }}>
          {dueCount} 到期
        </span>
        <span style={{ margin: "0 8px" }}>|</span>
        <span>总计 {deck.totalCount}</span>
      </div>
    </div>
  )
}

/**
 * 卡片列表视图组件
 */
type CardListViewProps = {
  deckName: string
  onBack: () => void
  onStartReviewDeck: (deckName: string) => void
  onClose: () => void
}

function CardListView({
  deckName,
  onBack,
  onStartReviewDeck,
  onClose
}: CardListViewProps) {
  const { blocks } = useSnapshot(orca.state)
  const [currentFilter, setCurrentFilter] = useState<FilterType>("all")
  const [remoteBlocks, setRemoteBlocks] = useState<BlockWithRepr[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // 从原有代码复制的工具函数
  type FilterType = "all" | "overdue" | "today" | "future" | "new"
  type CardInfo = {
    blockId: string
    front: string
    lastReviewed: Date | null
    due: Date
    reps: number
  }

  // 从后端加载卡片
  const refreshRemoteBlocks = useCallback(async () => {
    setIsLoading(true)
    try {
      const fetched = await orca.invokeBackend("get-blocks-with-tags", ["card"])
      setRemoteBlocks(fetched)
    } catch (error) {
      console.error("加载卡片失败:", error)
      orca.notify("error", "加载卡片失败")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshRemoteBlocks()
  }, [refreshRemoteBlocks])

  // 检查块是否是 SRS 卡片
  function isSrsCardBlock(block: Block): block is BlockWithRepr {
    const b = block as BlockWithRepr
    return b._repr?.type === "srs.card"
  }

  /**
   * 判断卡片属于哪个筛选类别
   */
  function getCardFilterType(card: CardInfo): FilterType {
    const { start: todayStart, end: todayEnd } = getTodayRange()

    // 新卡：从未复习
    if (!card.lastReviewed || card.reps === 0) {
      return "new"
    }

    // 已到期：due < 今天开始
    if (card.due < todayStart) {
      return "overdue"
    }

    // 今天到期：due 在今天范围内
    if (card.due >= todayStart && card.due <= todayEnd) {
      return "today"
    }

    // 未来到期：due > 今天结束
    return "future"
  }

  /**
   * 获取到期状态的颜色
   */
  function getDueColor(filterType: FilterType): string {
    switch (filterType) {
      case "overdue":
        return "var(--orca-color-danger-7)"
      case "today":
        return "var(--orca-color-warning-7)"
      case "new":
        return "var(--orca-color-primary-7)"
      case "future":
        return "var(--orca-color-text-3)"
      default:
        return "var(--orca-color-text-1)"
    }
  }

  // 构建卡片列表（按 deck 过滤）
  const allCards = useMemo<CardInfo[]>(() => {
    const merged = new Map<string, BlockWithRepr>()

    // 合并本地和远程块
    for (const rb of remoteBlocks) {
      if (isSrsCardBlock(rb)) merged.set(String(rb.id), rb)
    }
    for (const blockId in blocks) {
      const block = blocks[blockId]
      if (isSrsCardBlock(block)) merged.set(String(blockId), block)
    }

    const cardList: CardInfo[] = []

    for (const [blockId, block] of merged) {
      // 按 deck 过滤
      const blockDeck = block._repr?.deck || "Default"
      if (blockDeck !== deckName) continue

      const front = block._repr?.front || "(无题目)"
      const lastReviewedValue = block.properties?.find(p => p.name === "srs.lastReviewed")?.value
      const dueValue = block.properties?.find(p => p.name === "srs.due")?.value
      const repsValue = block.properties?.find(p => p.name === "srs.reps")?.value

      const lastReviewed = lastReviewedValue ? new Date(lastReviewedValue) : null
      const due = dueValue ? new Date(dueValue) : new Date()
      const reps = typeof repsValue === "number" ? repsValue : 0

      cardList.push({ blockId, front, lastReviewed, due, reps })
    }

    // 按到期时间排序
    cardList.sort((a, b) => a.due.getTime() - b.due.getTime())
    return cardList
  }, [blocks, remoteBlocks, deckName])

  // 按筛选条件过滤
  const filteredCards = useMemo(() => {
    if (currentFilter === "all") return allCards
    return allCards.filter((card: CardInfo) => getCardFilterType(card) === currentFilter)
  }, [allCards, currentFilter])

  // 点击卡片跳转
  const handleCardClick = useCallback((blockId: string) => {
    onClose()
    orca.nav.goTo("block", { blockId })
  }, [onClose])

  return (
    <div style={{
      width: "600px",
      maxHeight: "80vh",
      backgroundColor: "var(--orca-color-bg-1)",
      borderRadius: "8px",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* 面包屑导航栏 */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--orca-color-border-1)",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <Button variant="plain" onClick={onBack}>
          ← 返回
        </Button>
        <span style={{ fontSize: "16px", fontWeight: 600 }}>
          📚 {deckName}
        </span>
        <div style={{ flex: 1 }} />
        <Button
          variant="solid"
          onClick={() => onStartReviewDeck(deckName)}
        >
          开始复习此 Deck
        </Button>
      </div>

      {/* 筛选标签栏 */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--orca-color-border-1)",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap"
      }}>
        {(["all", "overdue", "today", "future", "new"] as FilterType[]).map(filterType => {
          const count = allCards.filter((card: CardInfo) =>
            filterType === "all" || getCardFilterType(card) === filterType
          ).length
          const labels: Record<FilterType, string> = {
            all: "全部",
            overdue: "已到期",
            today: "今天",
            future: "未来",
            new: "新卡"
          }
          const isActive = currentFilter === filterType
          return (
            <Button
              key={filterType}
              variant={isActive ? "solid" : "plain"}
              onClick={() => setCurrentFilter(filterType)}
              style={{ fontSize: "13px" }}
            >
              {labels[filterType]} ({count})
            </Button>
          )
        })}
      </div>

      {/* 卡片列表 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", color: "var(--orca-color-text-3)", padding: "40px 20px" }}>
            正在加载...
          </div>
        ) : filteredCards.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--orca-color-text-3)", padding: "40px 20px" }}>
            没有符合条件的卡片
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredCards.map((card: CardInfo) => {
              const filterType = getCardFilterType(card)
              const dueColor = getDueColor(filterType)
              
              return (
                <div
                  key={card.blockId}
                  onClick={() => handleCardClick(card.blockId)}
                  style={{
                    padding: "12px",
                    border: "1px solid var(--orca-color-border-1)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: "var(--orca-color-bg-2)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--orca-color-bg-3)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--orca-color-bg-2)"
                  }}
                >
                  <div style={{ fontSize: "14px", marginBottom: "6px", fontWeight: 500 }}>
                    {card.front}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--orca-color-text-3)" }}>
                    上次: {formatDateTime(card.lastReviewed)} |{" "}
                    <span style={{ color: dueColor }}>
                      下次: {formatDateTime(card.due)}
                    </span>
                    {" "}| 复习 {card.reps} 次
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div style={{
        padding: "12px 16px",
        borderTop: "1px solid var(--orca-color-border-1)",
        fontSize: "12px",
        color: "var(--orca-color-text-3)",
        textAlign: "center"
      }}>
        当前筛选: {filteredCards.length} / 总计: {allCards.length}
      </div>
    </div>
  )
}
