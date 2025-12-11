/**
 * 命令注册模块
 *
 * 负责注册和注销所有命令以及编辑器命令
 */

import type { Block } from "../../orca.d.ts"
import { BlockWithRepr } from "../blockUtils"
import { scanCardsFromTags, makeCardFromBlock } from "../cardCreator"
import { createCloze } from "../clozeUtils"
import { insertDirection } from "../directionUtils"

export function registerCommands(
  pluginName: string,
  startReviewSession: (deckName?: string) => Promise<void>,
  openFlashcardHome: () => Promise<void>
): void {
  // 在闭包中捕获 pluginName，供 undo 函数使用
  const _pluginName = pluginName

  orca.commands.registerCommand(
    `${pluginName}.startReviewSession`,
    async () => {
      console.log(`[${_pluginName}] 开始 SRS 复习会话`)
      await startReviewSession()
    },
    "SRS: 开始复习"
  )

  orca.commands.registerCommand(
    `${pluginName}.scanCardsFromTags`,
    () => {
      console.log(`[${_pluginName}] 执行标签扫描`)
      scanCardsFromTags(_pluginName)
    },
    "SRS: 扫描带标签的卡片"
  )

  orca.commands.registerCommand(
    `${pluginName}.openFlashcardHome`,
    async () => {
      console.log(`[${_pluginName}] 打开 Flashcard Home`)
      await openFlashcardHome()
    },
    "SRS: 打开 Flashcard Home"
  )

  orca.commands.registerEditorCommand(
    `${pluginName}.makeCardFromBlock`,
    async (editor, ...args) => {
      const [panelId, rootBlockId, cursor] = editor
      if (!cursor) {
        orca.notify("error", "无法获取光标位置")
        return null
      }
      const result = await makeCardFromBlock(cursor, _pluginName)
      return result ? { ret: result, undoArgs: result } : null
    },
    async undoArgs => {
      if (!undoArgs || !undoArgs.blockId) return

      const block = orca.state.blocks[undoArgs.blockId] as BlockWithRepr
      if (!block) return

      block._repr = undoArgs.originalRepr || { type: "text" }

      if (undoArgs.originalText !== undefined) {
        block.text = undoArgs.originalText
      }

      console.log(`[${_pluginName}] 已撤销：块 #${undoArgs.blockId} 已恢复`)
    },
    {
      label: "SRS: 将块转换为记忆卡片",
      hasArgs: false
    }
  )

  orca.commands.registerEditorCommand(
    `${pluginName}.createCloze`,
    async (editor, ...args) => {
      const [panelId, rootBlockId, cursor] = editor
      if (!cursor) {
        orca.notify("error", "无法获取光标位置")
        return null
      }
      const result = await createCloze(cursor, _pluginName)
      return result ? { ret: result, undoArgs: result } : null
    },
    async undoArgs => {
      if (!undoArgs || !undoArgs.blockId) return

      const block = orca.state.blocks[undoArgs.blockId] as Block
      if (!block) return

      if (undoArgs.originalContent) {
        await orca.commands.invokeEditorCommand(
          "core.editor.setBlocksContent",
          null,
          [
            {
              id: undoArgs.blockId,
              content: undoArgs.originalContent
            }
          ],
          false
        )
      } else if (undoArgs.originalText !== undefined) {
        await orca.commands.invokeEditorCommand(
          "core.editor.setBlocksContent",
          null,
          [
            {
              id: undoArgs.blockId,
              content: [{ t: "t", v: undoArgs.originalText }]
            }
          ],
          false
        )
      }
    },
    {
      label: "SRS: 创建 Cloze 填空",
      hasArgs: false
    }
  )

  // 方向卡命令：正向 (Ctrl+Alt+.)
  orca.commands.registerEditorCommand(
    `${pluginName}.createDirectionForward`,
    async (editor, ...args) => {
      const [panelId, rootBlockId, cursor] = editor
      if (!cursor) {
        orca.notify("error", "无法获取光标位置")
        return null
      }
      const result = await insertDirection(cursor, "forward", _pluginName)
      return result ? { ret: result, undoArgs: result } : null
    },
    async undoArgs => {
      if (!undoArgs || !undoArgs.blockId) return

      const block = orca.state.blocks[undoArgs.blockId] as Block
      if (!block) return

      if (undoArgs.originalContent) {
        await orca.commands.invokeEditorCommand(
          "core.editor.setBlocksContent",
          null,
          [
            {
              id: undoArgs.blockId,
              content: undoArgs.originalContent
            }
          ],
          false
        )
      }
    },
    {
      label: "SRS: 创建正向方向卡 →",
      hasArgs: false
    }
  )

  // 方向卡命令：反向 (Ctrl+Alt+,)
  orca.commands.registerEditorCommand(
    `${pluginName}.createDirectionBackward`,
    async (editor, ...args) => {
      const [panelId, rootBlockId, cursor] = editor
      if (!cursor) {
        orca.notify("error", "无法获取光标位置")
        return null
      }
      const result = await insertDirection(cursor, "backward", _pluginName)
      return result ? { ret: result, undoArgs: result } : null
    },
    async undoArgs => {
      if (!undoArgs || !undoArgs.blockId) return

      const block = orca.state.blocks[undoArgs.blockId] as Block
      if (!block) return

      if (undoArgs.originalContent) {
        await orca.commands.invokeEditorCommand(
          "core.editor.setBlocksContent",
          null,
          [
            {
              id: undoArgs.blockId,
              content: undoArgs.originalContent
            }
          ],
          false
        )
      }
    },
    {
      label: "SRS: 创建反向方向卡 ←",
      hasArgs: false
    }
  )
}

export function unregisterCommands(pluginName: string): void {
  orca.commands.unregisterCommand(`${pluginName}.startReviewSession`)
  orca.commands.unregisterCommand(`${pluginName}.scanCardsFromTags`)
  orca.commands.unregisterCommand(`${pluginName}.openFlashcardHome`)
  orca.commands.unregisterEditorCommand(`${pluginName}.makeCardFromBlock`)
  orca.commands.unregisterEditorCommand(`${pluginName}.createCloze`)
  orca.commands.unregisterEditorCommand(`${pluginName}.createDirectionForward`)
  orca.commands.unregisterEditorCommand(`${pluginName}.createDirectionBackward`)
}
