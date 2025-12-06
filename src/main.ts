import { setupL10N, t } from "./libs/l10n"
import zhCN from "./translations/zhCN"
import SrsReviewSessionDemo from "./components/SrsReviewSessionDemo"

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

  console.log(`[${pluginName}] 命令和 UI 组件已注册`)
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

  // 移除工具栏按钮
  orca.toolbar.unregisterToolbarButton(`${pluginName}.reviewButton`)

  // 移除斜杠命令
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.review`)

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
