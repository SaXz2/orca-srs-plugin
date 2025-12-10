/**
 * 转换器注册模块
 *
 * 负责 plain -> SRS 的块和 inline 转换
 */

import type {
  BlockForConversion,
  Repr,
  ContentFragment
} from "../../orca.d.ts"

export function registerConverters(pluginName: string): void {
  orca.converters.registerBlock(
    "plain",
    "srs.card",
    (blockContent: BlockForConversion, repr: Repr) => {
      const front = repr.front || "（无题目）"
      const back = repr.back || "（无答案）"
      return `[SRS 卡片]\n题目: ${front}\n答案: ${back}`
    }
  )

  orca.converters.registerBlock(
    "plain",
    "srs.cloze-card",
    (blockContent: BlockForConversion, repr: Repr) => {
      const front = repr.front || "（无题目）"
      const back = repr.back || "（无答案）"
      return `[SRS 填空卡片]\n题目: ${front}\n答案: ${back}`
    }
  )

  orca.converters.registerBlock(
    "plain",
    "srs.review-session",
    () => "[SRS 复习会话面板块]"
  )

  orca.converters.registerInline(
    "plain",
    `${pluginName}.cloze`,
    (fragment: ContentFragment) => {
      const clozeNumber = fragment.clozeNumber || 1
      const content = fragment.v || ""
      return `{c${clozeNumber}:: ${content}}`
    }
  )
}

export function unregisterConverters(pluginName: string): void {
  orca.converters.unregisterBlock("plain", "srs.card")
  orca.converters.unregisterBlock("plain", "srs.cloze-card")
  orca.converters.unregisterBlock("plain", "srs.review-session")
  orca.converters.unregisterInline("plain", `${pluginName}.cloze`)
}
