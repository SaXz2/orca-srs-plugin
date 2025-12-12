详细的自定义面板迁移实施计划。
计划概要
我设计了一个三阶段、循序渐进的迁移方案：
📋 阶段一：FlashcardHome 迁移（1.6 小时）
创建 SrsFlashcardHomePanel.tsx（新的自定义面板）
移除块管理逻辑（flashcardHomeManager.ts）
简化导航代码（直接 orca.nav.goTo）
完整复用现有业务逻辑（SrsFlashcardHome.tsx）
📋 阶段二：ReviewSession 迁移（2.25 小时）
创建 SrsReviewSessionPanel.tsx
通过 viewArgs 传递参数（deckFilter、hostPanelId）
使用 orca.nav.findViewPanel() 获取参数
移除全局状态变量
处理多面板协作逻辑
📋 阶段三：清理旧块功能（0.85 小时）
创建 cleanup.ts（扫描和删除旧块）
注册命令 SRS: 清理旧架构遗留块
提供用户确认对话框
清理插件数据存储
关键技术亮点
✅ 参数传递：orca.nav.goTo("srs.review-session", { deckFilter: "English" }, panelId)
✅ 参数获取：orca.nav.findViewPanel(panelId, panels).viewArgs
✅ 响应式更新：useSnapshot(orca.state) 订阅面板变化
✅ 风险控制：新旧代码可共存，随时回滚
预计时间
总计 4.7 小时（纯开发时间） 计划文件已保存至：C:\Users\1\.claude\plans\greedy-napping-parnas.md 现在准备开始实施！🚀
Claude’s Plan
自定义面板迁移实施计划
一、项目背景
当前架构问题
两个核心面板使用 Block Renderer 架构实现：
SrsReviewSessionRenderer - 复习会话面板
SrsFlashcardHomeRenderer - 闪卡主页面板
通过创建"虚拟块"（特殊的 _repr.type）并使用 BlockShell 包装来渲染面板内容。这种方式存在以下问题：
需要创建和持久化块对象（占用数据库空间）
块管理逻辑复杂（reviewSessionManager.ts、flashcardHomeManager.ts）
BlockShell 渲染开销
用户数据库中会留下"遗留块"
目标架构
使用 Orca 的 Panel Renderer API（orca.panels.registerPanel）实现：
直接注册自定义面板视图类型
通过 viewArgs 传递参数
无需创建块对象
更简洁、高效的架构
二、迁移策略
阶段划分
阶段一（优先）：迁移 FlashcardHome 面板
功能简单，风险低
验证自定义面板 API 可行性
阶段二：迁移 ReviewSession 面板
涉及多面板协作
参数传递逻辑
阶段三：清理旧块功能
提供用户命令清理遗留块
技术决策
决策点	选择	理由
参数传递方式	通过 viewArgs	官方推荐方式，符合 Orca 设计
viewArgs 访问	orca.nav.findViewPanel()	官方 API，稳定可靠
面板刷新机制	Valtio useSnapshot(orca.state)	Orca 内置响应式系统
旧块清理	添加专用命令	提供用户控制，安全可靠
三、阶段一：FlashcardHome 迁移
3.1 目标
将 FlashcardHome 从 Block Renderer 迁移到 Panel Renderer。
3.2 文件变动清单
新增文件
src/panels/SrsFlashcardHomePanel.tsx - 自定义面板组件（新架构）
修改文件
src/main.ts - 修改 openFlashcardHome() 导航逻辑
src/srs/registry/renderers.ts - 移除 block renderer 注册，添加 panel renderer 注册
删除文件
src/components/SrsFlashcardHomeRenderer.tsx - Block Renderer 容器（已废弃）
src/srs/flashcardHomeManager.ts - 块管理逻辑（已废弃）
保留文件（无需修改）
src/components/SrsFlashcardHome.tsx - 核心业务逻辑组件（完整复用）
src/components/DeckCardCompact.tsx - Deck 卡片组件
src/srs/cardCollector.ts - 卡片收集逻辑
src/srs/deckUtils.ts - Deck 统计工具
3.3 实施步骤
步骤 1：创建自定义面板组件
文件：src/panels/SrsFlashcardHomePanel.tsx
/**
 * FlashcardHome 自定义面板
 * 使用 Panel Renderer 架构，替代旧的 Block Renderer
 */
import type { PanelProps } from "../orca.d.ts"
import SrsFlashcardHome from "../components/SrsFlashcardHome"
import SrsErrorBoundary from "../components/SrsErrorBoundary"

const { useEffect, useState } = window.React
const { useSnapshot } = window.Valtio

export default function SrsFlashcardHomePanel(props: PanelProps) {
  const { panelId, active } = props

  // 订阅面板状态变化（Valtio 响应式）
  const { panels } = useSnapshot(orca.state)

  const [pluginName, setPluginName] = useState("orca-srs")
  const [viewArgs, setViewArgs] = useState<Record<string, any> | null>(null)

  // 获取面板的 viewArgs
  useEffect(() => {
    const viewPanel = orca.nav.findViewPanel(panelId, panels)
    if (viewPanel) {
      setViewArgs(viewPanel.viewArgs)
    }
  }, [panelId, panels])

  // 动态获取插件名
  useEffect(() => {
    void (async () => {
      try {
        const { getPluginName } = await import("../main")
        const name = typeof getPluginName === "function" ? getPluginName() : "orca-srs"
        setPluginName(name)
      } catch (error) {
        console.error("[FlashcardHome Panel] 获取插件名失败:", error)
      }
    })()
  }, [])

  return (
    <div
      className="srs-flashcard-home-panel"
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <SrsErrorBoundary componentName="Flashcard Home" errorTitle="面板加载出错">
        <SrsFlashcardHome
          panelId={panelId}
          pluginName={pluginName}
          // 未来可通过 viewArgs 传递其他参数
        />
      </SrsErrorBoundary>
    </div>
  )
}
关键点：
接收 PanelProps（panelId, active）
使用 useSnapshot(orca.state) 订阅面板树变化
使用 orca.nav.findViewPanel() 获取 viewArgs
直接渲染 SrsFlashcardHome 组件（无需 BlockShell）
步骤 2：注册自定义面板
文件：src/srs/registry/renderers.ts 修改注册逻辑：
// 移除旧的 block renderer 注册
// orca.renderers.registerBlock("srs.flashcard-home", false, SrsFlashcardHomeRenderer)

// 添加新的 panel renderer 注册
import SrsFlashcardHomePanel from "../../panels/SrsFlashcardHomePanel"

export function registerRenderers(pluginName: string) {
  // ... 其他渲染器注册 ...

  // 注册 FlashcardHome 自定义面板
  orca.panels.registerPanel("srs.flashcard-home", SrsFlashcardHomePanel)

  console.log(`[${pluginName}] FlashcardHome 自定义面板已注册`)
}

export function unregisterRenderers(pluginName: string) {
  // ... 其他渲染器注销 ...

  // 注销 FlashcardHome 自定义面板
  orca.panels.unregisterPanel("srs.flashcard-home")

  console.log(`[${pluginName}] FlashcardHome 自定义面板已注销`)
}
步骤 3：修改打开命令
文件：src/main.ts 修改 openFlashcardHome() 函数：
/**
 * 打开 Flashcard Home 面板（新架构：使用自定义面板）
 */
async function openFlashcardHome() {
  try {
    const activePanelId = orca.state.activePanel

    if (!activePanelId) {
      orca.notify("warn", "当前没有可用的面板", { title: "SRS 闪卡" })
      return
    }

    // 直接导航到自定义面板视图（无需创建块）
    orca.nav.goTo(
      "srs.flashcard-home",  // 自定义面板视图类型
      {},                     // viewArgs（未来可传递参数）
      activePanelId           // 在当前面板打开
    )

    orca.notify("success", "Flashcard Home 已打开", { title: "SRS 闪卡" })
    console.log(`[${pluginName}] FlashcardHome 已在面板 ${activePanelId} 中打开`)
  } catch (error) {
    console.error(`[${pluginName}] 打开 FlashcardHome 失败:`, error)
    orca.notify("error", "打开 Flashcard Home 失败", { title: "SRS 闪卡" })
  }
}
关键变化：
❌ 移除 getOrCreateFlashcardHomeBlock()
❌ 移除块 ID 管理
✅ 直接使用 orca.nav.goTo() 导航到自定义面板视图
步骤 4：删除旧文件
删除以下文件（迁移完成后）：
src/components/SrsFlashcardHomeRenderer.tsx
src/srs/flashcardHomeManager.ts
注意：在测试验证通过前，暂时保留这些文件作为备份。
步骤 5：测试验证
测试清单：
 从工具栏/斜杠命令打开 FlashcardHome
 Deck 列表正常显示
 统计数据正确（今日待复习、新卡待学等）
 点击"查看"切换到卡片列表视图
 卡片列表分页、过滤功能正常
 点击"复习"启动复习会话
 点击卡片行跳转到原始块
 刷新按钮正常工作
 返回 Deck 列表功能正常
 无控制台错误
 面板导航历史正常（前进/后退）
四、阶段二：ReviewSession 迁移
4.1 目标
将 ReviewSession 从 Block Renderer 迁移到 Panel Renderer，并支持通过 viewArgs 传递 deckFilter 参数。
4.2 文件变动清单
新增文件
src/panels/SrsReviewSessionPanel.tsx - 自定义面板组件
修改文件
src/main.ts - 修改 startReviewSession() 导航逻辑
src/srs/registry/renderers.ts - 移除 block renderer 注册，添加 panel renderer 注册
删除文件
src/components/SrsReviewSessionRenderer.tsx - Block Renderer 容器
src/srs/reviewSessionManager.ts - 块管理逻辑
保留文件（无需修改）
src/components/SrsReviewSessionDemo.tsx - 核心复习逻辑
src/components/SrsCardDemo.tsx - 卡片展示组件
src/srs/storage.ts - SRS 状态管理
src/srs/algorithm.ts - FSRS 算法
src/srs/panelUtils.ts - 面板工具函数
4.3 实施步骤
步骤 1：创建自定义面板组件
文件：src/panels/SrsReviewSessionPanel.tsx
/**
 * ReviewSession 自定义面板
 * 支持通过 viewArgs 传递参数（如 deckFilter）
 */
import type { PanelProps } from "../orca.d.ts"
import type { ReviewCard } from "../srs/types"
import SrsReviewSessionDemo from "../components/SrsReviewSessionDemo"
import SrsErrorBoundary from "../components/SrsErrorBoundary"

const { useEffect, useState } = window.React
const { useSnapshot } = window.Valtio

export default function SrsReviewSessionPanel(props: PanelProps) {
  const { panelId, active } = props

  // 订阅面板状态变化
  const { panels } = useSnapshot(orca.state)

  const [cards, setCards] = useState<ReviewCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pluginName, setPluginName] = useState("orca-srs")
  const [deckFilter, setDeckFilter] = useState<string | null>(null)
  const [hostPanelId, setHostPanelId] = useState<string | null>(null)

  // 从 viewArgs 获取参数
  useEffect(() => {
    const viewPanel = orca.nav.findViewPanel(panelId, panels)
    if (viewPanel) {
      // 提取 deckFilter 参数
      const filter = viewPanel.viewArgs?.deckFilter ?? null
      setDeckFilter(filter)

      // 提取 hostPanelId 参数（左侧主面板 ID）
      const hostId = viewPanel.viewArgs?.hostPanelId ?? null
      setHostPanelId(hostId)
    }
  }, [panelId, panels])

  // 获取插件名
  useEffect(() => {
    void (async () => {
      try {
        const { getPluginName } = await import("../main")
        const name = typeof getPluginName === "function" ? getPluginName() : "orca-srs"
        setPluginName(name)
      } catch (error) {
        console.error("[ReviewSession Panel] 获取插件名失败:", error)
      }
    })()
  }, [])

  // 加载复习队列
  useEffect(() => {
    void loadReviewQueue()
  }, [deckFilter, pluginName])

  const loadReviewQueue = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { collectReviewCards, buildReviewQueue } = await import("../main")
      const allCards = await collectReviewCards(pluginName)

      // 应用 Deck 过滤
      const filteredCards = deckFilter
        ? allCards.filter(card => card.deck === deckFilter)
        : allCards

      const queue = buildReviewQueue(filteredCards)
      setCards(queue)

      console.log(`[ReviewSession Panel] 加载队列完成: ${queue.length} 张卡片` +
        (deckFilter ? ` (Deck: ${deckFilter})` : ""))
    } catch (error) {
      console.error("[ReviewSession Panel] 加载复习队列失败:", error)
      setErrorMessage(error instanceof Error ? error.message : `${error}`)
      orca.notify("error", "加载复习队列失败", { title: "SRS 复习" })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    orca.nav.close(panelId)
  }

  const handleJumpToCard = async (cardBlockId: number) => {
    try {
      const { findLeftPanel, schedulePanelResize } = await import("../srs/panelUtils")

      // 优先使用 viewArgs 中的 hostPanelId
      if (hostPanelId) {
        orca.nav.goTo("block", { blockId: cardBlockId }, hostPanelId)
        orca.nav.switchFocusTo(hostPanelId)
        return
      }

      // 查找左侧面板
      let leftPanelId = findLeftPanel(orca.state.panels, panelId)

      if (!leftPanelId) {
        // 创建左侧面板
        leftPanelId = orca.nav.addTo(panelId, "left", {
          view: "block",
          viewArgs: { blockId: cardBlockId },
          viewState: {}
        })

        if (leftPanelId) {
          schedulePanelResize(leftPanelId, pluginName)
          orca.nav.switchFocusTo(leftPanelId)
        }
      } else {
        orca.nav.goTo("block", { blockId: cardBlockId }, leftPanelId)
        orca.nav.switchFocusTo(leftPanelId)
      }
    } catch (error) {
      console.error("[ReviewSession Panel] 跳转到卡片失败:", error)
      orca.nav.goTo("block", { blockId: cardBlockId })
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontSize: "14px",
          color: "var(--orca-color-text-2)"
        }}>
          加载复习队列中...
        </div>
      )
    }

    if (errorMessage) {
      const { Button } = orca.components
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "24px",
          height: "100%",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center"
        }}>
          <div style={{ color: "var(--orca-color-danger-5)" }}>
            加载失败：{errorMessage}
          </div>
          <Button variant="solid" onClick={loadReviewQueue}>
            重试
          </Button>
        </div>
      )
    }

    return (
      <SrsReviewSessionDemo
        cards={cards}
        onClose={handleClose}
        onJumpToCard={handleJumpToCard}
        inSidePanel={true}
        panelId={panelId}
        pluginName={pluginName}
      />
    )
  }

  return (
    <div
      className="srs-review-session-panel"
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <SrsErrorBoundary componentName="复习会话" errorTitle="复习会话加载出错">
        {renderContent()}
      </SrsErrorBoundary>
    </div>
  )
}
关键点：
从 viewArgs 获取 deckFilter 和 hostPanelId
当参数变化时重新加载队列（useEffect 依赖）
复用 SrsReviewSessionDemo 的所有业务逻辑
步骤 2：注册自定义面板
文件：src/srs/registry/renderers.ts
import SrsReviewSessionPanel from "../../panels/SrsReviewSessionPanel"

export function registerRenderers(pluginName: string) {
  // ... 其他渲染器 ...

  // 注册 ReviewSession 自定义面板
  orca.panels.registerPanel("srs.review-session", SrsReviewSessionPanel)

  console.log(`[${pluginName}] ReviewSession 自定义面板已注册`)
}

export function unregisterRenderers(pluginName: string) {
  // ... 其他渲染器 ...

  orca.panels.unregisterPanel("srs.review-session")

  console.log(`[${pluginName}] ReviewSession 自定义面板已注销`)
}
步骤 3：修改启动命令
文件：src/main.ts 修改 startReviewSession() 函数：
/**
 * 启动 SRS 复习会话（新架构：使用自定义面板）
 * @param deckName - 可选的 Deck 名称过滤
 * @param openInCurrentPanel - 是否在当前面板打开（默认 false，在右侧新建面板）
 */
async function startReviewSession(deckName?: string, openInCurrentPanel: boolean = false) {
  try {
    const activePanelId = orca.state.activePanel

    if (!activePanelId) {
      orca.notify("warn", "当前没有可用的面板", { title: "SRS 复习" })
      return
    }

    // 准备 viewArgs
    const viewArgs: Record<string, any> = {}
    if (deckName) {
      viewArgs.deckFilter = deckName
    }

    // 情景 1：在当前面板打开（从 FlashcardHome 调用）
    if (openInCurrentPanel) {
      orca.nav.goTo("srs.review-session", viewArgs, activePanelId)

      const message = deckName
        ? `开始复习 Deck "${deckName}"`
        : "开始复习"
      orca.notify("success", message, { title: "SRS 复习" })
      console.log(`[${pluginName}] 复习会话已在当前面板打开 (Deck: ${deckName ?? "全部"})`)
      return
    }

    // 情景 2：在右侧面板打开（从工具栏/斜杠命令调用）
    viewArgs.hostPanelId = activePanelId  // 记录宿主面板 ID

    let rightPanelId = findRightPanel(orca.state.panels, activePanelId)

    if (!rightPanelId) {
      // 右侧没有面板，创建新面板
      rightPanelId = orca.nav.addTo(activePanelId, "right", {
        view: "srs.review-session",
        viewArgs,
        viewState: {}
      })

      if (rightPanelId) {
        schedulePanelResize(activePanelId, pluginName)
        orca.nav.switchFocusTo(rightPanelId)
      } else {
        orca.notify("error", "创建复习面板失败", { title: "SRS 复习" })
        return
      }
    } else {
      // 右侧已有面板，复用
      orca.nav.goTo("srs.review-session", viewArgs, rightPanelId)
      orca.nav.switchFocusTo(rightPanelId)
    }

    const message = deckName
      ? `开始复习 Deck "${deckName}"`
      : "开始复习"
    orca.notify("success", message, { title: "SRS 复习" })
    console.log(`[${pluginName}] 复习会话已在右侧面板打开 (Deck: ${deckName ?? "全部"})`)
  } catch (error) {
    console.error(`[${pluginName}] 启动复习会话失败:`, error)
    orca.notify("error", "启动复习会话失败", { title: "SRS 复习" })
  }
}
关键变化：
❌ 移除 reviewDeckFilter 全局状态
❌ 移除 reviewHostPanelId 全局状态
❌ 移除 getOrCreateReviewSessionBlock()
✅ 通过 viewArgs 传递 deckFilter 和 hostPanelId
✅ 直接使用 orca.nav.goTo() 导航
步骤 4：移除全局状态
文件：src/main.ts 删除以下全局变量和导出函数：
// ❌ 删除
let reviewHostPanelId: string | null = null
let reviewDeckFilter: string | null = null

export function getReviewHostPanelId(): string | null {
  return reviewHostPanelId
}

export function getReviewDeckFilter(): string | null {
  return reviewDeckFilter
}
步骤 5：删除旧文件
删除以下文件：
src/components/SrsReviewSessionRenderer.tsx
src/srs/reviewSessionManager.ts
步骤 6：测试验证
测试清单：
 从工具栏启动复习（全部卡片）
 从斜杠命令启动复习
 从 FlashcardHome 启动复习（特定 Deck）
 复习队列正确加载
 Deck 过滤正常工作
 评分功能正常（Again/Hard/Good/Easy）
 埋藏、暂停功能正常
 跳转卡片时左侧面板正确管理
 右侧面板复习界面始终可见
 会话完成后显示统计
 关闭按钮正常工作
 无控制台错误
 面板导航历史正常
五、阶段三：清理旧块功能
5.1 目标
提供用户命令清理旧架构遗留的"虚拟块"。
5.2 文件变动清单
新增文件
src/srs/cleanup.ts - 清理逻辑
修改文件
src/srs/registry/commands.ts - 注册清理命令
src/main.ts - 导出清理函数
5.3 实施步骤
步骤 1：创建清理逻辑
文件：src/srs/cleanup.ts
/**
 * 清理旧架构遗留的虚拟块
 */
import type { DbId } from "../orca.d.ts"

/**
 * 扫描并清理旧的 review-session 和 flashcard-home 块
 * @param pluginName - 插件名称
 * @returns 清理的块数量
 */
export async function cleanupOldBlocks(pluginName: string): Promise<number> {
  console.log(`[${pluginName}] 开始扫描旧架构遗留块...`)

  const blocksToDelete: DbId[] = []

  try {
    // 1. 查找所有包含 srs.isReviewSessionBlock 属性的块
    const reviewSessionBlocks = await orca.invokeBackend(
      "query",
      {
        q: `[?e :srs.isReviewSessionBlock true]`,
        sort: null,
        pageSize: 1000
      }
    )

    if (reviewSessionBlocks?.result) {
      for (const blockData of reviewSessionBlocks.result) {
        if (blockData?.entity) {
          blocksToDelete.push(blockData.entity)
        }
      }
    }

    // 2. 查找所有包含 srs.isFlashcardHomeBlock 属性的块
    const flashcardHomeBlocks = await orca.invokeBackend(
      "query",
      {
        q: `[?e :srs.isFlashcardHomeBlock true]`,
        sort: null,
        pageSize: 1000
      }
    )

    if (flashcardHomeBlocks?.result) {
      for (const blockData of flashcardHomeBlocks.result) {
        if (blockData?.entity) {
          blocksToDelete.push(blockData.entity)
        }
      }
    }

    // 3. 从插件数据存储中获取已保存的块 ID
    const storedReviewSessionId = await orca.plugins.getData(pluginName, "reviewSessionBlockId")
    const storedFlashcardHomeId = await orca.plugins.getData(pluginName, "flashcardHomeBlockId")

    if (typeof storedReviewSessionId === "number") {
      blocksToDelete.push(storedReviewSessionId)
    }
    if (typeof storedFlashcardHomeId === "number") {
      blocksToDelete.push(storedFlashcardHomeId)
    }

    // 去重
    const uniqueBlocks = Array.from(new Set(blocksToDelete))

    if (uniqueBlocks.length === 0) {
      console.log(`[${pluginName}] 未发现旧架构遗留块`)
      orca.notify("info", "未发现需要清理的旧块", { title: "SRS 清理" })
      return 0
    }

    console.log(`[${pluginName}] 发现 ${uniqueBlocks.length} 个旧架构遗留块`)

    // 4. 确认对话框
    const confirmed = await showConfirmDialog(
      "清理旧块",
      `发现 ${uniqueBlocks.length} 个旧架构遗留的块。\n\n这些块是插件旧版本创建的"虚拟块"，新架构不再需要。\n\n是否删除？`,
      "删除",
      "取消"
    )

    if (!confirmed) {
      console.log(`[${pluginName}] 用户取消清理`)
      return 0
    }

    // 5. 删除块
    let deletedCount = 0
    for (const blockId of uniqueBlocks) {
      try {
        await orca.commands.invokeEditorCommand("core.editor.deleteBlock", null, blockId, null)
        deletedCount++
        console.log(`[${pluginName}] 已删除块 ${blockId}`)
      } catch (error) {
        console.warn(`[${pluginName}] 删除块 ${blockId} 失败:`, error)
      }
    }

    // 6. 清理插件数据存储
    await orca.plugins.removeData(pluginName, "reviewSessionBlockId")
    await orca.plugins.removeData(pluginName, "flashcardHomeBlockId")

    console.log(`[${pluginName}] 清理完成: 删除 ${deletedCount}/${uniqueBlocks.length} 个块`)
    orca.notify("success", `已清理 ${deletedCount} 个旧块`, { title: "SRS 清理" })

    return deletedCount
  } catch (error) {
    console.error(`[${pluginName}] 清理旧块失败:`, error)
    orca.notify("error", "清理旧块失败", { title: "SRS 清理" })
    return 0
  }
}

/**
 * 显示确认对话框（使用 Orca 通知系统）
 */
async function showConfirmDialog(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false

    orca.notify("warn", message, {
      title,
      action: () => {
        if (!resolved) {
          resolved = true
          resolve(true)
        }
      }
    })

    // 5 秒后自动取消
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    }, 5000)
  })
}
步骤 2：注册清理命令
文件：src/srs/registry/commands.ts
import { cleanupOldBlocks } from "../cleanup"

export function registerCommands(
  pluginName: string,
  startReviewSession: Function,
  openFlashcardHome: Function
) {
  // ... 其他命令 ...

  // 注册清理旧块命令
  orca.commands.registerCommand(
    `${pluginName}.cleanupOldBlocks`,
    async () => {
      await cleanupOldBlocks(pluginName)
    },
    "SRS: 清理旧架构遗留块"
  )

  console.log(`[${pluginName}] 清理命令已注册`)
}

export function unregisterCommands(pluginName: string) {
  // ... 其他命令 ...

  orca.commands.unregisterCommand(`${pluginName}.cleanupOldBlocks`)
}
步骤 3：添加斜杠命令（可选）
文件：src/srs/registry/uiComponents.ts
export function registerUIComponents(pluginName: string) {
  // ... 其他 UI 组件 ...

  // 斜杠命令：清理旧块
  orca.slashCommands.registerSlashCommand(
    `${pluginName}.cleanupOldBlocks`,
    {
      icon: "ti ti-trash",
      group: "SRS",
      title: "清理旧架构遗留块",
      command: `${pluginName}.cleanupOldBlocks`
    }
  )
}

export function unregisterUIComponents(pluginName: string) {
  // ... 其他 UI 组件 ...

  orca.slashCommands.unregisterSlashCommand(`${pluginName}.cleanupOldBlocks`)
}
步骤 4：测试清理功能
测试清单：
 执行命令 SRS: 清理旧架构遗留块
 正确扫描并显示旧块数量
 确认对话框正常显示
 选择"删除"后正确删除块
 插件数据存储被清理
 选择"取消"后不删除任何块
 无旧块时显示提示信息
六、兼容性和风险控制
6.1 代码共存策略（迁移期间）
在迁移过程中，新旧代码可以共存：
阶段	Block Renderer	Panel Renderer	备注
阶段一开始	✅ 两个都在	❌ 无	正常运行
阶段一进行中	✅ FlashcardHome 保留<br>✅ ReviewSession 运行	✅ FlashcardHome 测试	可切换测试
阶段一完成	✅ ReviewSession 运行	✅ FlashcardHome 生产	FlashcardHome 已迁移
阶段二进行中	✅ ReviewSession 保留	✅ FlashcardHome 生产<br>✅ ReviewSession 测试	可切换测试
阶段二完成	❌ 全部删除	✅ 两个都在	迁移完成
6.2 切换机制
通过修改 src/srs/registry/renderers.ts，可以快速在新旧架构间切换：
// 开关：true = 新架构，false = 旧架构
const USE_NEW_FLASHCARD_HOME = true
const USE_NEW_REVIEW_SESSION = true

export function registerRenderers(pluginName: string) {
  if (USE_NEW_FLASHCARD_HOME) {
    // 新架构
    orca.panels.registerPanel("srs.flashcard-home", SrsFlashcardHomePanel)
  } else {
    // 旧架构
    orca.renderers.registerBlock("srs.flashcard-home", false, SrsFlashcardHomeRenderer)
  }

  // 同理 ReviewSession...
}
6.3 回滚计划
如果迁移出现问题：
阶段一回滚（FlashcardHome）
修改 USE_NEW_FLASHCARD_HOME = false
恢复 openFlashcardHome() 旧实现
重新启用 flashcardHomeManager.ts
npm run build 重新构建
阶段二回滚（ReviewSession）
修改 USE_NEW_REVIEW_SESSION = false
恢复 startReviewSession() 旧实现
重新启用 reviewSessionManager.ts
恢复全局状态变量
npm run build 重新构建
数据回滚
旧块仍在数据库中（未被删除）
插件数据存储仍包含块 ID
可直接切换回旧架构
6.4 验证清单
每个阶段完成后，执行以下验证： 功能验证：
 所有用户可见功能正常
 无控制台错误
 无 UI 闪烁或卡顿
 面板导航历史正常
性能验证：
 面板打开速度（应更快）
 内存占用（应更低）
 复习队列加载时间（应不变）
数据完整性验证：
 卡片数据无丢失
 SRS 状态无损坏
 Deck 统计正确
兼容性验证：
 前进/后退导航正常
 面板布局恢复正常
 多面板协作正常
七、实施时间线
阶段	任务	预计时间	累计时间
阶段一	FlashcardHome 迁移		
1.1	创建 SrsFlashcardHomePanel.tsx	30 分钟	0.5h
1.2	修改注册逻辑	15 分钟	0.75h
1.3	修改 openFlashcardHome()	15 分钟	1h
1.4	测试验证	30 分钟	1.5h
1.5	删除旧文件	10 分钟	1.6h
阶段二	ReviewSession 迁移		
2.1	创建 SrsReviewSessionPanel.tsx	45 分钟	2.35h
2.2	修改注册逻辑	15 分钟	2.5h
2.3	修改 startReviewSession()	30 分钟	2.8h
2.4	移除全局状态	15 分钟	3h
2.5	测试验证（多面板协作）	45 分钟	3.75h
2.6	删除旧文件	10 分钟	3.85h
阶段三	清理旧块功能		
3.1	创建 cleanup.ts	30 分钟	4.35h
3.2	注册清理命令	15 分钟	4.5h
3.3	测试清理功能	20 分钟	4.7h
总计		4.7 小时	
备注：以上时间为纯开发时间，不包括代码审查、文档更新等。
八、关键文件路径汇总
新增文件
src/
├── panels/
│   ├── SrsFlashcardHomePanel.tsx      # 阶段一
│   └── SrsReviewSessionPanel.tsx      # 阶段二
└── srs/
    └── cleanup.ts                      # 阶段三
修改文件
src/
├── main.ts                             # 阶段一、二
└── srs/
    └── registry/
        ├── renderers.ts                # 阶段一、二
        ├── commands.ts                 # 阶段三
        └── uiComponents.ts             # 阶段三（可选）
删除文件
src/
├── components/
│   ├── SrsFlashcardHomeRenderer.tsx   # 阶段一
│   └── SrsReviewSessionRenderer.tsx   # 阶段二
└── srs/
    ├── flashcardHomeManager.ts        # 阶段一
    └── reviewSessionManager.ts        # 阶段二
保留文件（无需修改）
src/
├── components/
│   ├── SrsFlashcardHome.tsx           # 核心业务逻辑
│   ├── SrsReviewSessionDemo.tsx       # 核心复习逻辑
│   ├── SrsCardDemo.tsx
│   ├── DeckCardCompact.tsx
│   └── SrsErrorBoundary.tsx
└── srs/
    ├── cardCollector.ts
    ├── storage.ts
    ├── algorithm.ts
    ├── deckUtils.ts
    ├── panelUtils.ts
    └── types.ts
九、成功标准
阶段一成功标准
✅ FlashcardHome 在新架构下正常显示
✅ 所有视图切换功能正常
✅ 统计数据准确
✅ 复习启动功能正常
✅ 无控制台错误
✅ 性能无下降（加载时间 < 500ms）
阶段二成功标准
✅ ReviewSession 在新架构下正常显示
✅ Deck 过滤正确工作
✅ 多面板协作正常
✅ 所有复习功能正常（评分、埋藏、暂停、跳转）
✅ 从 FlashcardHome 和工具栏启动都正常
✅ 无控制台错误
✅ 性能无下降
阶段三成功标准
✅ 清理命令正确扫描旧块
✅ 确认对话框正常工作
✅ 删除功能正确执行
✅ 插件数据存储被清理
✅ 无误删其他块
整体成功标准
✅ 所有阶段测试通过
✅ 旧文件已删除
✅ 代码无冗余
✅ 文档已更新
✅ 用户可正常使用所有功能
十、风险评估
风险	等级	影响	缓解措施
自定义面板 API 限制	中	功能无法实现	阶段一验证 API 完整性
viewArgs 访问失败	低	参数传递异常	已验证 findViewPanel API
面板刷新机制问题	中	UI 不响应数据变化	使用 Valtio useSnapshot
多面板协作复杂	中	ReviewSession 跳转异常	阶段二重点测试
用户数据丢失	低	卡片数据丢失	旧块保留，不自动删除
性能回退	低	加载变慢	理论上应更快，需验证
回滚困难	低	无法恢复旧架构	保留旧文件备份
十一、后续优化建议
迁移完成后，可考虑以下优化：
面板状态持久化
保存用户的 Deck 选择、过滤器设置
使用 viewState 保存滚动位置
面板布局优化
支持用户自定义面板大小
记住用户的面板布局偏好
快捷键支持
为复习面板添加键盘快捷键
支持全键盘复习流程
性能监控
添加性能指标收集
对比新旧架构的性能数据
用户体验改进
添加面板过渡动画
优化加载状态显示