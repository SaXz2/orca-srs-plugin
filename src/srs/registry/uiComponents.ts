/**
 * UI 组件注册模块
 *
 * 负责注册工具栏按钮和斜杠命令
 */

export function registerUIComponents(pluginName: string): void {
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

  orca.slashCommands.registerSlashCommand(`${pluginName}.makeCard`, {
    icon: "ti ti-card-plus",
    group: "SRS",
    title: "转换为记忆卡片",
    command: `${pluginName}.makeCardFromBlock`
  })
}

export function unregisterUIComponents(pluginName: string): void {
  orca.toolbar.unregisterToolbarButton(`${pluginName}.reviewButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.browserButton`)
  orca.toolbar.unregisterToolbarButton(`${pluginName}.clozeButton`)
  orca.slashCommands.unregisterSlashCommand(`${pluginName}.makeCard`)
}
