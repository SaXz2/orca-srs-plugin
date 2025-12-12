import type { PanelProps } from "../orca.d.ts"
import SrsFlashcardHome from "../components/SrsFlashcardHome"
import SrsErrorBoundary from "../components/SrsErrorBoundary"

export default function SrsFlashcardHomePanel(props: PanelProps) {
  const { panelId } = props
  const { useEffect, useRef } = window.React
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const rootEl = rootRef.current
    if (!rootEl) return

    const panelEl = rootEl.closest(".orca-panel") as HTMLElement | null
    const hideableEl = rootEl.closest(".orca-hideable") as HTMLElement | null

    const restored: Array<() => void> = []

    if (hideableEl) {
      const prevFlex = hideableEl.style.flex
      const prevMinWidth = hideableEl.style.minWidth
      const prevWidth = hideableEl.style.width
      hideableEl.style.flex = "1"
      hideableEl.style.minWidth = "0"
      hideableEl.style.width = "100%"
      restored.push(() => {
        hideableEl.style.flex = prevFlex
        hideableEl.style.minWidth = prevMinWidth
        hideableEl.style.width = prevWidth
      })
    }

    if (panelEl) {
      const hiddenViews = Array.from(
        panelEl.querySelectorAll<HTMLElement>(".orca-hideable.orca-hideable-hidden")
      )

      for (const hidden of hiddenViews) {
        const prevDisplay = hidden.style.display
        hidden.style.display = "none"
        restored.push(() => {
          hidden.style.display = prevDisplay
        })
      }
    }

    return () => {
      for (const restore of restored) restore()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="srs-flashcard-home-panel"
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        minWidth: 0
      }}
    >
      <SrsErrorBoundary componentName="闪卡主页" errorTitle="闪卡主页加载出错">
        <SrsFlashcardHome panelId={panelId} blockId={0} />
      </SrsErrorBoundary>
    </div>
  )
}
