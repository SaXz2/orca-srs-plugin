/**
 * 虎鲸笔记 SRS 闪卡插件 - 主入口
 * 
 * 该模块负责插件生命周期管理：
 * - 注册命令、工具栏按钮、斜杠命令
 * - 注册块渲染器和转换器
 * - 管理复习会话
 */

import { setupL10N } from "./libs/l10n"
import zhCN from "./translations/zhCN"
import { getOrCreateReviewSessionBlock, cleanupReviewSessionBlock } from "./srs/reviewSessionManager"
import { findRightPanel, schedulePanelResize } from "./srs/panelUtils"
import { collectReviewCards, buildReviewQueue } from "./srs/cardCollector"
import { extractDeckName, calculateDeckStats } from "./srs/deckUtils"
import { closeCardBrowser } from "./srs/cardBrowser"
import { registerCommands, unregisterCommands } from "./srs/registry/commands"
import { registerUIComponents, unregisterUIComponents } from "./srs/registry/uiComponents"
import { registerRenderers, unregisterRenderers } from "./srs/registry/renderers"
import { registerConverters, unregisterConverters } from "./srs/registry/converters"

// 插件全局状态
let pluginName: string
let reviewHostPanelId: string | null = null

/**
 * 插件加载函数
 * 在插件启用时被 Orca 调用
 */
export async function load(_name: string) {
  pluginName = _name

  // 设置国际化
  setupL10N(orca.state.locale, { "zh-CN": zhCN })

  console.log(`[${pluginName}] 插件已加载`)
  registerCommands(pluginName, startReviewSession)
  registerUIComponents(pluginName)
  registerRenderers(pluginName)
  registerConverters(pluginName)

  console.log(`[${pluginName}] 命令、UI 组件和渲染器已注册`)
}

/**
 * 插件卸载函数
 * 在插件禁用时被 Orca 调用
 */
export async function unload() {
  console.log(`[${pluginName}] 开始卸载插件`)

  // 清理卡片浏览器组件
  closeCardBrowser(pluginName)

  await cleanupReviewSessionBlock(pluginName)

  unregisterConverters(pluginName)
  unregisterRenderers(pluginName)
  unregisterUIComponents(pluginName)
  unregisterCommands(pluginName)

  console.log(`[${pluginName}] 插件已卸载`)
}

// ========================================
// 复习会话管理
// ========================================

/**
 * 显示 SRS 复习会话组件（使用真实队列）
 */
async function startReviewSession(deckName?: string) {
  try {
    const reviewSessionBlockId = await getOrCreateReviewSessionBlock(pluginName)
    const activePanelId = orca.state.activePanel

    if (!activePanelId) {
      orca.notify("warn", "当前没有可用的面板", { title: "SRS 复习" })
      return
    }

    reviewHostPanelId = activePanelId

    let rightPanelId = findRightPanel(orca.state.panels, activePanelId)

    if (!rightPanelId) {
      rightPanelId = orca.nav.addTo(activePanelId, "right", {
        view: "block",
        viewArgs: { blockId: reviewSessionBlockId },
        viewState: {}
      })

      if (!rightPanelId) {
        orca.notify("error", "无法创建侧边面板", { title: "SRS 复习" })
        return
      }

      schedulePanelResize(activePanelId, pluginName)
    } else {
      orca.nav.goTo("block", { blockId: reviewSessionBlockId }, rightPanelId)
    }

    if (rightPanelId) {
      const targetPanelId = rightPanelId
      setTimeout(() => {
        orca.nav.switchFocusTo(targetPanelId)
      }, 100)
    }

    const message = deckName
      ? `已打开 ${deckName} 复习会话`
      : "复习会话已在右侧面板打开"

    orca.notify("success", message, { title: "SRS 复习" })
    console.log(`[${pluginName}] 复习会话已启动，面板ID: ${rightPanelId}`)
  } catch (error) {
    console.error(`[${pluginName}] 启动复习失败:`, error)
    orca.notify("error", `启动复习失败: ${error}`, { title: "SRS 复习" })
  }
}

/**
 * 获取复习宿主面板 ID
 */
export function getReviewHostPanelId(): string | null {
  return reviewHostPanelId
}

/**
 * 获取插件名称
 * 供其他模块使用
 */
export function getPluginName(): string {
  return pluginName
}

// 导出供浏览器组件和其他模块使用
export {
  calculateDeckStats,
  collectReviewCards,
  extractDeckName,
  startReviewSession,
  buildReviewQueue
}
