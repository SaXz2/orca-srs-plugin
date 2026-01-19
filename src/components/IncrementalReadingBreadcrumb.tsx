import type { Block, DbId } from "../orca.d.ts"
import { extractCardType } from "../srs/deckUtils"

const { useEffect, useState } = window.React

type BreadcrumbProps = {
  blockId: DbId
  panelId: string
  maxDepth?: number
}

type BreadcrumbItem = {
  id: DbId
  text: string
}

async function findTopicPath(blockId: DbId, maxDepth: number): Promise<BreadcrumbItem[]> {
  const path: BreadcrumbItem[] = []
  let currentId: DbId | undefined = blockId
  let depth = 0

  while (currentId && depth < maxDepth) {
    const block = await orca.invokeBackend("get-block", currentId) as Block | undefined
    if (!block) break

    path.unshift({ id: block.id, text: block.text || "(无标题)" })

    if (extractCardType(block) === "渐进阅读") {
      break
    }

    currentId = block.parent
    depth += 1
  }

  return path
}

export default function IncrementalReadingBreadcrumb({
  blockId,
  panelId,
  maxDepth = 5
}: BreadcrumbProps) {
  const [items, setItems] = useState<BreadcrumbItem[]>([])

  useEffect(() => {
    let cancelled = false

    const loadPath = async () => {
      try {
        const path = await findTopicPath(blockId, maxDepth)
        if (!cancelled) {
          setItems(path)
        }
      } catch (error) {
        console.error("[IR Breadcrumb] 读取面包屑失败:", error)
      }
    }

    void loadPath()

    return () => {
      cancelled = true
    }
  }, [blockId, maxDepth])

  if (items.length === 0) {
    return null
  }

  const handleJump = (targetId: DbId, shiftKey?: boolean) => {
    if (shiftKey) {
      orca.nav.openInLastPanel("block", { blockId: targetId })
    } else {
      orca.nav.goTo("block", { blockId: targetId }, panelId)
    }
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "12px",
      color: "var(--orca-color-text-2)",
      flexWrap: "wrap"
    }}>
      {items.map((item: BreadcrumbItem, index: number) => {
        const isLast = index === items.length - 1
        return (
          <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              onClick={event => handleJump(item.id, event.shiftKey)}
              style={{
                cursor: "pointer",
                color: isLast ? "var(--orca-color-text-1)" : "var(--orca-color-primary-6)",
                fontWeight: isLast ? 600 : 500
              }}
              title="点击跳转到原块"
            >
              {item.text}
            </span>
            {!isLast && <span style={{ color: "var(--orca-color-text-3)" }}>{">"}</span>}
          </div>
        )
      })}
    </div>
  )
}
