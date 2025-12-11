/**
 * UI 组件注册模块
 *
 * 负责注册工具栏按钮和斜杠命令
 * 
 * 注意：Orca 当前版本不支持自定义快捷键注册，
 * 方向卡命令需要通过工具栏按钮或斜杠命令触发。
 */

export function registerUIComponents(pluginName: string): void {
  // ============ 工具栏按钮 ============
  
  orca.toolbar.registerToolbarButton(`${pluginName}.reviewButton`, {
    icon: "ti ti-cards",
    tooltip: "开始 SRS 复习",
    command: `${pluginName}.startReviewSession`
  })

  orca.toolbar.registerToolbarButton(`${pluginName}.browserButton`, {
    icon: "ti ti-list",
    tooltip: "打开 Flashcard Home",
    command: `${pluginName}.openFlashcardHome`
  })

  orca.toolbar.registerToolbarButton(`${pluginName}.clozeButton`, {
    icon: "ti ti-braces",
    tooltip: "创建 Cloze 填空",
    command: `${pluginName}.createCloze`
  })

  orca.toolbar.registerToolbarButton(`${pluginName}.directionForwardButton`, {
    icon: "ti ti-arrow-right",
    tooltip: "创建正向方向卡 →",
    command: `${pluginName}.createDirectionForward`
  })

  orca.toolbar.registerToolbarButton(`${pluginName}.directionBackwardButton`, {
    icon: "ti ti-arrow-left",
    tooltip: "创建反向方向卡 ←",
    command: `${pluginName}.createDirectionBackward`
  })

  // ============ AI 卡片工具栏按钮 ============

  orca.toolbar.registerToolbarButton(`${pluginName}.aiCardButton`, {
    icon: "ti ti-robot",
    tooltip: "AI 生成记忆卡片",
    command: `${pluginName}.makeAICard`
  })

  // ============ 斜杠命令 ============
  
  orca.slashCommands.registerSlashCommand(`${pluginName}.makeCard`, {
    icon: "ti ti-card-plus",
    group: "SRS",
    title: "转换为记忆卡片",
    command: `${pluginName}.makeCardFromBlock`
  })

  orca.slashCommands.registerSlashCommand(`${pluginName}.directionForward`, {
    icon: "ti ti-arrow-right",
    group: "SRS",
    title: "创建正向方向卡 → (光标位置分隔问答)",
    command: `${pluginName}.createDirectionForward`
  })

  orca.slashCommands.registerSlashCommand(`${pluginName}.directionBackward`, {
    icon: "ti ti-arrow-left",
    group: "SRS",
    title: "创建反向方向卡 ← (光标位置分隔问答)",
    command: `${pluginName}.createDirectionBackward`
  })

  // ============ AI 卡片斜杠命令 ============

  orca.slashCommands.registerSlashCommand(`${pluginName}.aiCard`, {
    icon: "ti ti-robot",
    group: "SRS",
    title: "AI 生成记忆卡片",
    command: `${pluginName}.makeAICard`
  })
}

export function unregisterUIComponents(pluginName: string): void {
  // 工具栏按钮
  orca.toolbar.unregisterToolbarButton(`${pluginName}.reviewButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.browserButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.clozeButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.directionForwardButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.directionBackwardButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.aiCardButton`)
  
  // 斜杠命令
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.makeCard`)
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.directionForward`)
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.directionBackward`)
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.aiCard`)
}
