import type { DbId } from "../orca.d.ts"

const { useState } = window.React
const { Button } = orca.components

type IRBulkActionBarProps = {
  selectedIds: Set<DbId>
  isWorking: boolean
  onApplyPriority: (priority: number) => void | Promise<void>
  onClearSelection: () => void
}

export default function IRBulkActionBar({
  selectedIds,
  isWorking,
  onApplyPriority,
  onClearSelection
}: IRBulkActionBarProps) {
  const [priorityValue, setPriorityValue] = useState<number>(5)
  const selectedCount = selectedIds.size
  const isDisabled = selectedCount === 0 || isWorking
  const clearDisabled = selectedCount === 0
  const actionStyle = (disabled: boolean) => disabled
    ? { opacity: 0.5, pointerEvents: "none" as const }
    : undefined

  return (
    <div style={{
      padding: "12px 16px",
      borderRadius: "10px",
      border: "1px solid var(--orca-color-border-1)",
      backgroundColor: "var(--orca-color-bg-2)",
      display: "flex",
      flexDirection: "column",
      gap: "12px"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px"
      }}>
        <div style={{ fontSize: "13px", color: "var(--orca-color-text-2)" }}>
          已选中 <span style={{ color: "var(--orca-color-primary-6)", fontWeight: 600 }}>{selectedCount}</span> 张卡片
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            variant="outline"
            onClick={() => {
              if (clearDisabled) return
              onClearSelection()
            }}
            style={actionStyle(clearDisabled)}
          >
            清除选择
          </Button>
          <Button
            variant="solid"
            onClick={() => {
              if (isDisabled) return
              void onApplyPriority(priorityValue)
            }}
            style={actionStyle(isDisabled)}
          >
            应用优先级
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ fontSize: "12px", color: "var(--orca-color-text-2)" }}>优先级</div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={priorityValue}
          disabled={isDisabled}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPriorityValue(Number(event.currentTarget.value))
          }}
          style={{ flex: 1 }}
        />
        <div style={{ width: "32px", textAlign: "center" }}>{priorityValue}</div>
      </div>
    </div>
  )
}
