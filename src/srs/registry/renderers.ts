/**
 * 渲染器注册模块
 *
 * 负责注册自定义块渲染器和 inline 渲染器
 */

import SrsReviewSessionRenderer from "../../components/SrsReviewSessionRenderer"
import SrsCardBlockRenderer from "../../components/SrsCardBlockRenderer"
import ClozeInlineRenderer from "../../components/ClozeInlineRenderer"
import SrsFlashcardHomeRenderer from "../../components/SrsFlashcardHomeRenderer"

export function registerRenderers(pluginName: string): void {
  orca.renderers.registerBlock(
    "srs.card",
    false,
    SrsCardBlockRenderer,
    [],
    false
  )

  orca.renderers.registerBlock(
    "srs.cloze-card",
    false,
    SrsCardBlockRenderer,
    [],
    false
  )

  orca.renderers.registerBlock(
    "srs.review-session",
    false,
    SrsReviewSessionRenderer,
    [],
    false
  )

  orca.renderers.registerBlock(
    "srs.flashcard-home",
    false,
    SrsFlashcardHomeRenderer,
    [],
    false
  )

  orca.renderers.registerInline(
    `${pluginName}.cloze`,
    false,
    ClozeInlineRenderer
  )
}

export function unregisterRenderers(pluginName: string): void {
  orca.renderers.unregisterBlock("srs.card")
  orca.renderers.unregisterBlock("srs.cloze-card")
  orca.renderers.unregisterBlock("srs.review-session")
  orca.renderers.unregisterBlock("srs.flashcard-home")
  orca.renderers.unregisterInline(`${pluginName}.cloze`)
}
