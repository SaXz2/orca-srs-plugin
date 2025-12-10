import type { DbId } from "../orca.d.ts"
import SrsFlashcardHome from "./SrsFlashcardHome"

const { BlockShell } = orca.components

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

export default function SrsFlashcardHomeRenderer(props: RendererProps) {
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
      reprClassName="srs-repr-flashcard-home"
      contentClassName="srs-repr-flashcard-home-content"
      contentAttrs={{ contentEditable: false }}
      contentJsx={<SrsFlashcardHome panelId={panelId} blockId={blockId} />}
      childrenJsx={null}
    />
  )
}
