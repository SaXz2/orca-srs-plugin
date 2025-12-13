/**
 * 渲染器注册模块
 *
 * 负责注册自定义块渲染器和 inline 渲染器
 */

import SrsCardBlockRenderer from "../../components/SrsCardBlockRenderer"
import ClozeInlineRenderer from "../../components/ClozeInlineRenderer"
import DirectionInlineRenderer from "../../components/DirectionInlineRenderer"
import SrsFlashcardHomePanel from "../../panels/SrsFlashcardHomePanel"
import SrsNewWindowPanel from "../../panels/srs_new_window/SrsNewWindowPanel"

export function registerRenderers(pluginName: string): void {
  // 基本卡块渲染器
  orca.renderers.registerBlock(
    "srs.card",
    false,
    SrsCardBlockRenderer,
    [],
    false
  )

  // Cloze 卡块渲染器
  orca.renderers.registerBlock(
    "srs.cloze-card",
    false,
    SrsCardBlockRenderer,
    [],
    false
  )

  // Direction 卡块渲染器（复用 SrsCardBlockRenderer，内部路由到具体渲染器）
  orca.renderers.registerBlock(
    "srs.direction-card",
    false,
    SrsCardBlockRenderer,
    [],
    false
  )

  // Flashcard Home 面板
  orca.panels.registerPanel("srs.flashcard-home", SrsFlashcardHomePanel)

  // 复习会话面板（Custom Panel 架构）
  orca.panels.registerPanel("srs.new-window", SrsNewWindowPanel)

  // Cloze inline 渲染器
  orca.renderers.registerInline(
    `${pluginName}.cloze`,
    false,
    ClozeInlineRenderer
  )

  // Direction inline 渲染器
  orca.renderers.registerInline(
    `${pluginName}.direction`,
    false,
    DirectionInlineRenderer
  )
}

export function unregisterRenderers(pluginName: string): void {
  orca.renderers.unregisterBlock("srs.card")
  orca.renderers.unregisterBlock("srs.cloze-card")
  orca.renderers.unregisterBlock("srs.direction-card")
  orca.panels.unregisterPanel("srs.flashcard-home")
  orca.panels.unregisterPanel("srs.new-window")
  orca.renderers.unregisterInline(`${pluginName}.cloze`)
  orca.renderers.unregisterInline(`${pluginName}.direction`)
}
