import { setupL10N, t } from "./libs/l10n"
import zhCN from "./translations/zhCN"
import SrsReviewSessionDemo from "./components/SrsReviewSessionDemo"
import SrsCardBlockRenderer from "./components/SrsCardBlockRenderer"
import type { BlockForConversion, Repr, CursorData, DbId, Block } from "./orca.d.ts"

// 扩展 Block 类型以包含 _repr 属性（运行时存在但类型定义中缺失）
type BlockWithRepr = Block & { _repr?: Repr }

let pluginName: string

// 用于存储当前显示的复习会话组件的容器和 root
let reviewSessionContainer: HTMLDivElement | null = null
let reviewSessionRoot: any = null

/**
 * 插件加载函数
 * 在插件启用时被 Orca 调用
 */
export async function load(_name: string) {
  pluginName = _name

  // 设置国际化
  setupL10N(orca.state.locale, { "zh-CN": zhCN })

  console.log(`[${pluginName}] 插件已加载`)

  // ========================================
  // 1. 注册命令：开始 SRS 复习会话
  // ========================================
  orca.commands.registerCommand(
    `${pluginName}.startReviewSession`,
    () => {
      console.log(`[${pluginName}] 开始 SRS 复习会话`)
      startReviewSession()
    },
    "SRS: 开始复习"
  )

  // ========================================
  // 2. 注册编辑器命令：将当前块转换为 SRS 卡片（调试用）
  // ========================================
  orca.commands.registerEditorCommand(
    `${pluginName}.makeCardFromBlock`,
    // do 函数：执行转换
    async (editor, ...args) => {
      const [panelId, rootBlockId, cursor, isRedo] = editor
      if (!cursor) {
        orca.notify("error", "无法获取光标位置")
        return null
      }
      const result = await makeCardFromBlock(cursor)
      return result ? { ret: result, undoArgs: result } : null
    },
    // undo 函数：撤销转换（恢复原始 _repr）
    async (undoArgs: any) => {
      if (!undoArgs || !undoArgs.blockId) return

      const block = orca.state.blocks[undoArgs.blockId] as BlockWithRepr
      if (!block) return

      // 恢复原始 _repr
      block._repr = undoArgs.originalRepr || { type: "text" }

      console.log(`[${pluginName}] 已撤销：块 #${undoArgs.blockId} 已恢复`)
    },
    {
      label: "SRS: 将块转换为记忆卡片",
      hasArgs: false
    }
  )

  // ========================================
  // 2. 注册工具栏按钮
  // ========================================
  orca.toolbar.registerToolbarButton(`${pluginName}.reviewButton`, {
    icon: "ti ti-cards",  // 使用 Tabler Icons 的卡片图标
    tooltip: "开始 SRS 复习",
    command: `${pluginName}.startReviewSession`
  })

  // ========================================
  // 3. 注册斜杠命令
  // ========================================
  orca.slashCommands.registerSlashCommand(`${pluginName}.review`, {
    icon: "ti ti-cards",
    group: "SRS",
    title: "开始 SRS 复习",
    command: `${pluginName}.startReviewSession`
  })

  // 斜杠命令：转换为 SRS 卡片
  orca.slashCommands.registerSlashCommand(`${pluginName}.makeCard`, {
    icon: "ti ti-card-plus",
    group: "SRS",
    title: "转换为记忆卡片",
    command: `${pluginName}.makeCardFromBlock`
  })

  // ========================================
  // 4. 注册自定义块渲染器：SRS 卡片
  // ========================================
  orca.renderers.registerBlock(
    "srs.card",           // 块类型
    false,                // 不可作为纯文本编辑
    SrsCardBlockRenderer, // 渲染器组件
    [],                   // 无需 asset 字段
    false                 // 不使用自定义子块布局
  )

  // ========================================
  // 5. 注册 plain 转换器（必需）
  // ========================================
  // 将 SRS 卡片块转换为纯文本格式（用于导出、复制等）
  orca.converters.registerBlock(
    "plain",
    "srs.card",
    (blockContent: BlockForConversion, repr: Repr) => {
      const front = repr.front || "（无题目）"
      const back = repr.back || "（无答案）"
      return `[SRS 卡片]\n题目: ${front}\n答案: ${back}`
    }
  )

  console.log(`[${pluginName}] 命令、UI 组件和渲染器已注册`)
}

/**
 * 插件卸载函数
 * 在插件禁用时被 Orca 调用
 */
export async function unload() {
  console.log(`[${pluginName}] 开始卸载插件`)

  // 清理复习会话组件
  closeReviewSession()

  // 移除注册的命令
  orca.commands.unregisterCommand(`${pluginName}.startReviewSession`)
  orca.commands.unregisterEditorCommand(`${pluginName}.makeCardFromBlock`)

  // 移除工具栏按钮
  orca.toolbar.unregisterToolbarButton(`${pluginName}.reviewButton`)

  // 移除斜杠命令
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.review`)
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.makeCard`)

  // 移除块渲染器
  orca.renderers.unregisterBlock("srs.card")

  // 移除转换器
  orca.converters.unregisterBlock("plain", "srs.card")

  console.log(`[${pluginName}] 插件已卸载`)
}

// ========================================
// 辅助函数：开始复习会话
// ========================================
/**
 * 显示 SRS 复习会话组件
 * 使用假数据创建一个完整的复习会话
 */
function startReviewSession() {
  // 如果已经打开复习会话，先关闭
  if (reviewSessionContainer) {
    closeReviewSession()
  }

  // 创建容器 div
  reviewSessionContainer = document.createElement("div")
  reviewSessionContainer.id = "srs-review-session-container"
  document.body.appendChild(reviewSessionContainer)

  // 获取 React 和 createRoot（从全局 window 对象）
  const React = window.React
  const { createRoot } = window

  // 创建 React root
  reviewSessionRoot = createRoot(reviewSessionContainer)

  // 渲染复习会话组件
  reviewSessionRoot.render(
    React.createElement(SrsReviewSessionDemo, {
      onClose: () => {
        console.log(`[${pluginName}] 用户关闭复习会话`)
        closeReviewSession()
      }
    })
  )

  console.log(`[${pluginName}] SRS 复习会话已开始`)

  // 显示通知
  orca.notify(
    "info",
    "复习会话已开始，共 5 张卡片",
    { title: "SRS 复习" }
  )
}

/**
 * 关闭 SRS 复习会话组件
 * 清理 DOM 和 React root
 */
function closeReviewSession() {
  if (reviewSessionRoot) {
    reviewSessionRoot.unmount()
    reviewSessionRoot = null
  }

  if (reviewSessionContainer) {
    reviewSessionContainer.remove()
    reviewSessionContainer = null
  }

  console.log(`[${pluginName}] SRS 复习会话已关闭`)
}

// ========================================
// 辅助函数：将块转换为 SRS 卡片
// ========================================
/**
 * 将当前块转换为 SRS 卡片块
 * - 当前块的文本作为题目（front）
 * - 第一个子块的文本作为答案（back），如果没有子块则使用默认答案
 *
 * @param cursor 当前光标位置
 * @returns 转换结果（包含 blockId 和原始 _repr，供 undo 使用）
 */
async function makeCardFromBlock(cursor: CursorData) {
  if (!cursor || !cursor.anchor || !cursor.anchor.blockId) {
    orca.notify("error", "无法获取当前块位置")
    return null
  }

  const blockId = cursor.anchor.blockId
  const block = orca.state.blocks[blockId] as BlockWithRepr

  if (!block) {
    orca.notify("error", "未找到当前块")
    return null
  }

  // 保存原始 _repr 供撤销使用
  const originalRepr = block._repr ? { ...block._repr } : { type: "text" }

  // 获取题目：使用当前块的纯文本
  const front = block.text || "（无题目）"

  // 获取答案：使用第一个子块的纯文本（如果存在）
  let back = "（无答案）"
  if (block.children && block.children.length > 0) {
    const firstChildId = block.children[0]
    const firstChild = orca.state.blocks[firstChildId]
    if (firstChild && firstChild.text) {
      back = firstChild.text
    }
  }

  // 直接修改块的 _repr（Valtio 会自动触发响应式更新）
  block._repr = {
    type: "srs.card",
    front: front,
    back: back
  }

  console.log(`[${pluginName}] 块 #${blockId} 已转换为 SRS 卡片`)
  console.log(`  题目: ${front}`)
  console.log(`  答案: ${back}`)

  // 显示通知
  orca.notify(
    "success",
    "已转换为 SRS 记忆卡片",
    { title: "SRS" }
  )

  // 返回结果供 undo 使用
  return { blockId, originalRepr }
}
