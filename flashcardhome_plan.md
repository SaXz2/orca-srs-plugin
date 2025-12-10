# Orca SRS 插件 - Flashcard Home 重构计划

## 用户决策确认 ✅

- ✅ **界面实现**：使用 Orca 面板系统
- ✅ **功能范围**：不包含学习趋势图
- ✅ **迁移策略**：直接替换旧浏览器
- ✅ **实现范围**：完整版（所有阶段）

---

## 一、核心决策

### 1.1 架构方案：使用 Orca 面板系统

**实现方式**：创建特殊块 + 自定义渲染器（参考 `SrsReviewSessionRenderer`）

```
创建特殊块（type: "srs.flashcard-home"）
    ↓
注册自定义渲染器（SrsFlashcardHomeRenderer）
    ↓
在侧边面板中打开该块
    ↓
渲染器内显示 Flashcard Home 界面
```

**优势**：
- ✅ 与 Orca 原生面板一致的用户体验
- ✅ 支持分屏、调整大小、面板历史
- ✅ 不遮挡工作区，可与编辑器并排
- ✅ 技术可行性已验证

### 1.2 迁移策略：直接替换旧浏览器

- 完全移除 `SrsCardBrowser.tsx` 和 `cardBrowser.ts`
- 将旧浏览器的功能（DeckListView 和 CardListView）集成到新的 Flashcard Home 中
- 更新所有命令和 UI 入口，指向新的 Flashcard Home

---

## 二、功能设计

### 2.1 主界面布局

```
┌─────────────────────────────────────────────┐
│  🏠 Flashcard Home                  [刷新] │
├─────────────────────────────────────────────┤
│  📊 学习概况                                │
│  ┌─────────┬─────────┬─────────┐           │
│  │ 待复习   │  新卡    │  总数   │           │
│  │  23     │  12     │  156    │           │
│  └─────────┴─────────┴─────────┘           │
│                                             │
│  🎯 快速复习                                │
│  [开始今日复习 (23)] [复习所有到期]         │
│                                             │
│  📚 Deck 管理                               │
│  ┌────────────────────────────┐            │
│  │ 📖 Default    [🎯复习][📋] │            │
│  │    新:5 到期:10 总:45      │            │
│  ├────────────────────────────┤            │
│  │ 📖 English    [🎯复习][📋] │            │
│  │    新:3 到期:8  总:32      │            │
│  └────────────────────────────┘            │
│                                             │
│  （点击📋查看该Deck的详细卡片列表）          │
└─────────────────────────────────────────────┘
```

### 2.2 核心功能

1. **统计仪表板**（简化版，3 个指标）
   - 今日待复习（今天到期）
   - 新卡待学（从未复习）
   - 总卡片数

2. **快速复习按钮**
   - 开始今日复习（全局，显示数量）
   - 复习所有到期

3. **Deck 列表**
   - 每个 Deck 显示：名称、新卡、到期、总数
   - 操作按钮：
     - 🎯 复习此 Deck
     - 📋 查看卡片列表（在 Flashcard Home 内切换视图）

4. **卡片列表视图**（复用旧浏览器的 CardListView）
   - 点击 📋 按钮后，在同一面板内切换到卡片列表视图
   - 支持 5 种筛选：全部/已到期/今天/未来/新卡
   - 显示面包屑导航，可返回 Deck 列表

---

## 三、文件修改清单

### 新增文件（4 个）

1. **`src/components/SrsFlashcardHome.tsx`** (~500 行)
   - Flashcard Home 主界面组件
   - 包含两种视图模式：
     - DeckListView：Deck 列表 + 统计仪表板
     - CardListView：特定 Deck 的卡片列表（从旧浏览器迁移）
   - 支持视图切换和状态管理

2. **`src/components/SrsFlashcardHomeRenderer.tsx`** (~60 行)
   - Orca 块渲染器，包装 SrsFlashcardHome 组件

3. **`src/srs/flashcardHomeManager.ts`** (~100 行)
   - 管理 Flashcard Home 的特殊块
   - 函数：`getOrCreateFlashcardHomeBlock()`, `cleanupFlashcardHomeBlock()`

4. **`src/components/DeckCardCompact.tsx`** (~80 行)
   - 单个 Deck 的卡片展示组件

### 修改文件（5 个）

5. **`src/main.ts`**
   - 添加 `openFlashcardHome()` 函数
   - 修改 `startReviewSession()` 添加 `deckName` 参数过滤逻辑
   - 在 `unload()` 中调用 `cleanupFlashcardHomeBlock()`

6. **`src/srs/registry/commands.ts`**
   - 将 `openCardBrowser` 命令替换为 `openFlashcardHome`

7. **`src/srs/registry/uiComponents.ts`**
   - 将"打开卡片浏览器"按钮替换为"Flashcard Home"

8. **`src/srs/registry/renderers.ts`**
   - 注册新渲染器：`srs.flashcard-home`

9. **`src/srs/types.ts`**
   - 添加新类型：`TodayStats`

### 删除文件（2 个）

10. **`src/components/SrsCardBrowser.tsx`** - 删除旧浏览器组件

11. **`src/srs/cardBrowser.ts`** - 删除旧浏览器管理模块

---

## 四、实现步骤（5 个阶段）

### 阶段 1：基础架构
**目标**：能打开一个空白的 Flashcard Home 面板

- [ ] 创建 `flashcardHomeManager.ts`（块管理）
- [ ] 创建 `SrsFlashcardHomeRenderer.tsx`（渲染器）
- [ ] 注册渲染器到 `renderers.ts`
- [ ] 在 `main.ts` 中添加 `openFlashcardHome()` 函数
- [ ] 将 `commands.ts` 中的 `openCardBrowser` 替换为 `openFlashcardHome`
- [ ] 将 `uiComponents.ts` 中的工具栏按钮更新为 Flashcard Home
- [ ] 在 `main.ts` 的 `unload()` 中添加清理逻辑
- [ ] **验证**：点击工具栏按钮，能在侧边面板看到"Flashcard Home"标题

### 阶段 2：Deck 列表视图
**目标**：显示所有 Deck、统计仪表板、快速复习按钮

- [ ] 创建 `DeckCardCompact.tsx` 组件
- [ ] 创建 `SrsFlashcardHome.tsx`，实现 DeckListView 模式
- [ ] 集成统计仪表板（3 个指标：待复习、新卡、总数）
- [ ] 添加快速复习按钮
- [ ] 使用 `calculateDeckStats()` 和 `collectReviewCards()` 获取数据
- [ ] **验证**：能看到所有 Deck 及其统计数字

### 阶段 3：按 Deck 复习功能
**目标**：点击"复习此 Deck"按钮，能启动该 Deck 的复习会话

- [ ] 修改 `main.ts` 中的 `startReviewSession()` 函数
- [ ] 添加 `deckName` 参数过滤逻辑：
  ```typescript
  const filteredCards = deckName
    ? allCards.filter(card => card.deck === deckName)
    : allCards
  ```
- [ ] 在 `SrsFlashcardHome` 中实现"复习此 Deck"按钮
- [ ] **验证**：点击 Deck 的复习按钮，只复习该 Deck 的卡片

### 阶段 4：卡片列表视图
**目标**：点击"查看卡片列表"按钮，在同一面板内切换到卡片列表视图

- [ ] 从旧 `SrsCardBrowser.tsx` 中迁移 `CardListView` 代码到 `SrsFlashcardHome.tsx`
- [ ] 实现视图模式切换：`viewMode: "deck-list" | "card-list"`
- [ ] 添加面包屑导航（返回 Deck 列表）
- [ ] 集成 5 种筛选功能（全部/已到期/今天/未来/新卡）
- [ ] 支持点击卡片跳转到块
- [ ] 删除旧文件：`SrsCardBrowser.tsx` 和 `cardBrowser.ts`
- [ ] **验证**：能在两种视图间切换，卡片列表功能正常

### 阶段 5：优化和完善
**目标**：完善交互体验、添加加载状态、错误处理

- [ ] 添加加载状态和骨架屏
- [ ] 添加刷新按钮（重新加载统计数据）
- [ ] 优化样式和布局（响应式、暗色模式适配）
- [ ] 添加空状态提示（无卡片时）
- [ ] 完善错误处理和用户提示
- [ ] 测试所有功能流程
- [ ] 更新模块文档：`模块文档/SRS_卡片浏览器.md` → `模块文档/SRS_Flashcard_Home.md`
- [ ] **验证**：完整测试所有功能，确保替换旧浏览器后功能无缺失

---

## 五、关键技术点

### 5.1 按 Deck 复习

**问题**：`startReviewSession(deckName?)` 接口存在但未实现过滤

**解决方案**：在 `startReviewSession()` 中：

```typescript
async function startReviewSession(deckName?: string) {
  const allCards = await collectReviewCards(pluginName)

  // 按 deck 过滤
  const filteredCards = deckName
    ? allCards.filter(card => card.deck === deckName)
    : allCards

  const queue = buildReviewQueue(filteredCards)
  // ...后续逻辑
}
```

### 5.3 面板管理

参考 `SrsReviewSessionRenderer` 的实现：

```typescript
// main.ts 中的 openFlashcardHome()
async function openFlashcardHome() {
  const homeBlockId = await getOrCreateFlashcardHomeBlock(pluginName)
  const activePanelId = orca.state.activePanel

  // 在右侧创建面板
  const panelId = orca.nav.addTo(activePanelId, "right", {
    view: "block",
    viewArgs: { blockId: homeBlockId },
    viewState: {}
  })

  orca.nav.switchFocusTo(panelId)
}
```

---

## 六、风险和注意事项

### 6.1 技术风险

1. **面板大小**：内容较多，需要支持滚动和响应式布局
2. **性能**：Deck 较多时（50+），可能需要虚拟滚动或分组
3. **状态同步**：复习后统计数据需要刷新（添加刷新按钮）

### 6.2 功能迁移风险

1. **功能完整性**：确保旧浏览器的所有功能都迁移到新界面
   - ✅ Deck 列表视图
   - ✅ 卡片列表视图
   - ✅ 5 种筛选类型
   - ✅ 点击跳转到块
   - ✅ 启动复习会话

2. **用户习惯**：直接替换可能影响习惯旧界面的用户
   - 建议在更新说明中明确标注界面变更
   - 提供清晰的功能映射说明

### 6.3 测试重点

- [ ] 所有 Deck 操作（复习、查看卡片）
- [ ] 视图切换（Deck 列表 ↔ 卡片列表）
- [ ] 筛选功能（5 种类型）
- [ ] 统计数据准确性
- [ ] 面板大小调整和响应式布局

---

## 七、代码复用和迁移

### 从旧浏览器迁移的代码

从 `SrsCardBrowser.tsx` 中迁移以下代码到 `SrsFlashcardHome.tsx`：

1. **CardListView 组件**（约 200 行）
   - 卡片列表展示逻辑
   - 5 种筛选类型
   - 筛选标签栏
   - 卡片点击跳转

2. **DeckListView 的部分逻辑**（约 100 行）
   - Deck 卡片渲染
   - 统计数据加载
   - "开始复习"按钮

3. **工具函数**
   - `getCardFilterType()`：判断卡片筛选类型
   - `getTodayRange()`：获取今天的时间范围

### 可直接复用

- ✅ `calculateDeckStats()`：Deck 统计
- ✅ `collectReviewCards()`：卡片收集
- ✅ `extractDeckName()`：提取 Deck 名称

### 需要新建

- ⚠️ `flashcardHomeManager.ts`：块管理
- ⚠️ `DeckCardCompact.tsx`：紧凑型 Deck 卡片组件

### 需要修改

- 🔧 `main.ts`：添加 `openFlashcardHome()` 和按 Deck 过滤逻辑
- 🔧 `registry/commands.ts`：替换命令
- 🔧 `registry/uiComponents.ts`：更新 UI 入口

---

## 八、关键文件路径

实现此计划最关键的 4 个文件：

1. **`src/components/SrsFlashcardHome.tsx`** - 核心 UI 组件（新建，~500 行）
   - 整合 DeckListView 和 CardListView
   - 视图模式切换
   - 统计仪表板

2. **`src/srs/flashcardHomeManager.ts`** - 块管理（新建，~100 行）
   - `getOrCreateFlashcardHomeBlock()`
   - `cleanupFlashcardHomeBlock()`

3. **`src/main.ts`** - 插件入口（修改）
   - 添加 `openFlashcardHome()` 函数
   - 修改 `startReviewSession()` 添加按 Deck 过滤

4. **`src/srs/registry/commands.ts`** - 命令注册（修改）
   - 替换 `openCardBrowser` 为 `openFlashcardHome`

需要删除的文件：
- `src/components/SrsCardBrowser.tsx`
- `src/srs/cardBrowser.ts`

---

## 九、预期成果

- **功能完整性**：保留旧浏览器的所有功能（Deck 列表、卡片列表、筛选、复习）
- **用户体验提升**：使用 Orca 面板系统，支持分屏和面板管理
- **架构优化**：统一入口，代码更简洁，便于维护
- **扩展性**：未来可轻松添加学习趋势图、统计报告等增强功能
