import type { DbId } from "../orca.d.ts"
import type { IRCard } from "../srs/incrementalReadingCollector"
import { collectAllIRCards } from "../srs/incrementalReadingCollector"
import { bulkUpdatePriority } from "../srs/incrementalReadingStorage"
import {
  IRDateGroupKey,
  IR_GROUP_DEFAULT_EXPANDED
} from "../srs/incrementalReadingManagerUtils"
import IRStatistics from "./IRStatistics"
import IRCardList from "./IRCardList"
import IRBulkActionBar from "./IRBulkActionBar"
import SrsErrorBoundary from "./SrsErrorBoundary"

const { useCallback, useEffect, useMemo, useState } = window.React
const { BlockShell, Button } = orca.components

type RendererProps = {
  panelId: string
  blockId: DbId
  rndId: string
  blockLevel: number
  indentLevel: number
  mirrorId?: DbId
  initiallyCollapsed?: boolean
  renderingMode?: "normal" | "simple" | "simple-children"
}

export default function IncrementalReadingManagerPanel(props: RendererProps) {
  const {
    panelId,
    blockId,
    rndId,
    blockLevel,
    indentLevel,
    mirrorId,
    initiallyCollapsed,
    renderingMode
  } = props

  const [pluginName, setPluginName] = useState("orca-srs")
  const [cards, setCards] = useState<IRCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<DbId>>(() => new Set<DbId>())
  const [expandedGroups, setExpandedGroups] = useState<Record<IRDateGroupKey, boolean>>(() => ({
    ...IR_GROUP_DEFAULT_EXPANDED
  }))
  const [isWorking, setIsWorking] = useState(false)

  const loadCards = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { getPluginName } = await import("../main")
      const currentPluginName = typeof getPluginName === "function" ? getPluginName() : "orca-srs"
      setPluginName(currentPluginName)

      const allCards = await collectAllIRCards(currentPluginName)
      setCards(allCards)
      setSelectedIds((prev: Set<DbId>) => {
        const availableIds = new Set(allCards.map(card => card.id))
        return new Set([...prev].filter(id => availableIds.has(id)))
      })
    } catch (error) {
      console.error("[IR Manager] 加载卡片失败:", error)
      setErrorMessage(error instanceof Error ? error.message : String(error))
      orca.notify("error", "加载渐进阅读管理面板失败", { title: "渐进阅读" })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  const handleCardClick = (cardId: DbId) => {
    orca.nav.openInLastPanel("block", { blockId: cardId })
  }

  const handleToggleGroup = (groupKey: IRDateGroupKey) => {
    setExpandedGroups((prev: Record<IRDateGroupKey, boolean>) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  const handleBulkApply = async (priority: number) => {
    if (selectedIds.size === 0 || isWorking) return
    setIsWorking(true)

    const ids = Array.from(selectedIds) as DbId[]

    try {
      const { success, failed } = await bulkUpdatePriority(ids, priority)

      if (failed.length > 0) {
        const detail = failed
          .map(item => `#${item.id}: ${item.error}`)
          .join("\n")

        console.warn("[IR Manager] 批量更新失败详情:", detail)
        orca.notify("warn", `${success.length}/${ids.length} 张卡片更新成功，${failed.length} 张失败`, {
          title: "渐进阅读",
          action: () => {
            orca.notify("error", detail, { title: "失败详情" })
          }
        })
      } else {
        orca.notify("success", `已批量更新 ${success.length} 张卡片`, { title: "渐进阅读" })
      }

      await loadCards()

      if (failed.length > 0) {
        setSelectedIds(new Set<DbId>(failed.map(item => item.id)))
      } else {
        setSelectedIds(new Set<DbId>())
      }
    } catch (error) {
      console.error("[IR Manager] 批量更新失败:", error)
      orca.notify("error", "批量更新失败", { title: "渐进阅读" })
    } finally {
      setIsWorking(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set<DbId>())
  }

  const header = useMemo(() => (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px"
    }}>
      <div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>渐进阅读管理面板</div>
        <div style={{ fontSize: "12px", color: "var(--orca-color-text-3)" }}>
          聚焦到期与排期，批量调整优先级
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <Button variant="plain" onClick={loadCards}>
          <i className="ti ti-refresh" />
        </Button>
        <Button variant="plain" onClick={() => orca.nav.close(panelId)}>
          关闭
        </Button>
      </div>
    </div>
  ), [loadCards, panelId])

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          minHeight: "240px",
          fontSize: "14px",
          color: "var(--orca-color-text-2)"
        }}>
          加载渐进阅读卡片中...
        </div>
      )
    }

    if (errorMessage) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "24px",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
          <div style={{ color: "var(--orca-color-danger-5)" }}>加载失败：{errorMessage}</div>
          <Button variant="solid" onClick={loadCards}>
            重试
          </Button>
        </div>
      )
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <IRStatistics cards={cards} />
        <IRBulkActionBar
          selectedIds={selectedIds}
          isWorking={isWorking}
          onApplyPriority={handleBulkApply}
          onClearSelection={handleClearSelection}
        />
        <IRCardList
          cards={cards}
          selectedIds={selectedIds}
          expandedGroups={expandedGroups}
          onSelectionChange={setSelectedIds}
          onCardClick={handleCardClick}
          onToggleGroup={handleToggleGroup}
        />
      </div>
    )
  }

  return (
    <BlockShell
      panelId={panelId}
      blockId={blockId}
      rndId={rndId}
      mirrorId={mirrorId}
      blockLevel={blockLevel}
      indentLevel={indentLevel}
      initiallyCollapsed={initiallyCollapsed}
      renderingMode={renderingMode}
      reprClassName="srs-ir-manager"
      contentClassName="srs-ir-manager-content"
      contentJsx={(
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "16px",
          height: "100%",
          overflow: "auto"
        }}>
          {header}
          <SrsErrorBoundary componentName="渐进阅读管理面板" errorTitle="渐进阅读管理面板加载出错">
            {renderContent()}
          </SrsErrorBoundary>
        </div>
      )}
      childrenJsx={null}
    />
  )
}
