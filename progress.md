# 项目开发进度记录

## 📋 项目信息

- **项目名称**: Orca SRS 插件 (虎鲸标记 内置闪卡)
- **技术栈**: TypeScript + React 18 (通过 `window.React` 全局访问)
- **构建工具**: Vite + SWC
- **目标平台**: Orca Note 插件系统
- **当前阶段**: 前端 UI 开发 (使用假数据)

---

## ✅ 已完成功能 (阶段 1: 前端 UI)

### 1. SRS 单卡组件 (`SrsCardDemo`)

**文件位置**: `src/components/SrsCardDemo.tsx`

**功能**:
- 显示题目 (front) 和答案 (back)
- 交互流程:
  1. 初始显示题目 + "显示答案" 按钮
  2. 点击后显示答案 + 4 个评分按钮 (Again / Hard / Good / Easy)
  3. 点击评分按钮触发 `onGrade(grade)` 回调
- 使用 Orca 内置组件:
  - `orca.components.Button` - 按钮
  - `orca.components.ModalOverlay` - 模态框
- 自适应 Orca 主题 (浅色/深色模式)

**Props 接口**:
```typescript
type SrsCardDemoProps = {
  front: string                                      // 题目文本
  back: string                                       // 答案文本
  onGrade: (grade: "again" | "hard" | "good" | "easy") => void  // 评分回调
  onClose?: () => void                               // 关闭回调
}
```

**UI 设计**:
- 题目区域: 灰色背景 + 居中显示
- 答案区域: 左侧蓝色边框标识
- 评分按钮组: 4 列网格布局
  - Again: 红色危险按钮 (`variant="dangerous"`)
  - Hard: 柔和按钮 (`variant="soft"`)
  - Good: 主色调按钮 (`variant="solid"`)
  - Easy: 主色调高亮按钮

---

### 2. SRS 复习会话组件 (`SrsReviewSessionDemo`)

**文件位置**: `src/components/SrsReviewSessionDemo.tsx`

**功能**:
- 管理一组卡片的复习会话
- 内置 5 张假数据卡片 (涵盖量子物理、计算机科学等主题)
- 逐张显示卡片，用户评分后自动切换到下一张
- 所有卡片复习完毕后显示完成页面

**核心状态**:
```typescript
const [currentIndex, setCurrentIndex] = useState(0)      // 当前卡片索引
const [reviewedCount, setReviewedCount] = useState(0)    // 已复习数量
```

**假数据结构**:
```typescript
type Card = {
  id: number      // 卡片 ID
  front: string   // 题目
  back: string    // 答案
}

const demoCards: Card[] = [
  { id: 1, front: "What is quantum entanglement?", back: "..." },
  { id: 2, front: "What is superposition?", back: "..." },
  { id: 3, front: "什么是时间复杂度？", back: "..." },
  { id: 4, front: "什么是闭包（Closure）？", back: "..." },
  { id: 5, front: "What is the difference between let and const?", back: "..." }
]
```

**交互流程**:
1. 显示当前卡片 (复用 `SrsCardDemo` 组件)
2. 用户评分 → 触发 `handleGrade(grade)`
   - 打印控制台日志: `[SRS Review Session] 卡片 #X 评分: XXX`
   - 更新已复习计数
   - 300ms 延迟后切换到下一张
3. 所有卡片完成 → 显示完成页面

**UI 特性**:
- **顶部进度条**: 显示复习进度 (0% → 100%)
- **进度文字**: "卡片 X / 5" 居中悬浮显示
- **完成页面**:
  - 图标: 🎉
  - 统计: "共复习了 X 张卡片"
  - 鼓励文案: "坚持复习，持续进步！"
  - 完成按钮

---

### 3. 插件入口集成 (`main.ts`)

**文件位置**: `src/main.ts`

**已实现功能**:

#### 命令注册
```typescript
orca.commands.registerCommand(
  `${pluginName}.startReviewSession`,
  startReviewSession,
  "SRS: 开始复习"
)
```

#### 工具栏按钮
```typescript
orca.toolbar.registerToolbarButton(`${pluginName}.reviewButton`, {
  icon: "ti ti-cards",           // Tabler Icons 卡片图标
  tooltip: "开始 SRS 复习",
  command: `${pluginName}.startReviewSession`
})
```

#### 斜杠命令
```typescript
orca.slashCommands.registerSlashCommand(`${pluginName}.review`, {
  icon: "ti ti-cards",
  group: "SRS",
  title: "开始 SRS 复习",
  command: `${pluginName}.startReviewSession`
})
```

#### 启动复习会话逻辑
- 创建 DOM 容器: `<div id="srs-review-session-container">`
- 使用 React 18 的 `createRoot` API 渲染组件
- 显示 Orca 通知: "复习会话已开始，共 5 张卡片"

#### 清理逻辑 (unload)
- 卸载 React root
- 移除 DOM 容器
- 注销所有注册的命令和 UI 组件

---

## 📁 当前文件结构

```
虎鲸标记 内置闪卡/
├── src/
│   ├── components/
│   │   ├── SrsCardDemo.tsx              # 单卡组件 (显示题目/答案/评分)
│   │   └── SrsReviewSessionDemo.tsx     # 复习会话组件 (管理多张卡片)
│   ├── libs/
│   │   └── l10n.ts                      # 国际化工具 (未修改)
│   ├── translations/
│   │   └── zhCN.ts                      # 中文翻译 (未修改)
│   ├── main.ts                          # 插件入口 (已集成复习会话)
│   ├── orca.d.ts                        # Orca API 类型定义 (5000+ 行)
│   └── vite-env.d.ts                    # Vite 环境类型
├── dist/
│   └── index.js                         # 构建输出 (需运行 npm run build 生成)
├── plugin-docs/                         # Orca API 官方文档
├── icon.png                             # 插件图标
├── package.json                         # 项目配置
├── vite.config.ts                       # Vite 构建配置
├── tsconfig.json                        # TypeScript 配置
├── CLAUDE.md                            # Claude AI 开发指南
└── progress.md                          # 本文件 (开发进度记录)
```

---

## 🚀 如何测试当前功能

### 1. 构建插件

```bash
cd "D:\orca插件\虎鲸标记 内置闪卡"

# 安装依赖 (首次)
npm install

# 构建插件
npm run build
```

**检查点**: 确认 `dist/index.js` 文件已生成

### 2. 部署到 Orca

1. 将整个项目文件夹复制到 Orca 插件目录:
   - Windows: `%USERPROFILE%\Documents\orca\plugins\`
   - macOS: `~/Documents/orca/plugins/`
2. 确保文件夹名称为 `虎鲸标记 内置闪卡` (插件名由文件夹名决定)
3. 确认必需文件存在:
   - `dist/index.js` ✓
   - `icon.png` ✓

### 3. 在 Orca 中启用插件

1. 打开 Orca Note 应用
2. 进入 **设置 → 插件**
3. 找到 "虎鲸标记 内置闪卡"
4. 点击 **启用**

### 4. 启动复习会话

有 3 种方式可以启动:

#### 方式 1: 工具栏按钮
- 在编辑器顶部找到 **卡片图标** (🃏)
- 点击按钮

#### 方式 2: 命令面板
- 按 `Ctrl+P` (Windows) 或 `Cmd+P` (macOS)
- 搜索 "**SRS: 开始复习**"
- 回车执行

#### 方式 3: 斜杠命令
- 在编辑器中输入 `/`
- 搜索 "**开始 SRS 复习**"
- 选择执行

### 5. 测试复习流程

**预期行为**:

1. **启动阶段**
   - 显示通知: "复习会话已开始，共 5 张卡片"
   - 出现顶部进度条 (蓝色)
   - 显示进度文字: "卡片 1 / 5"
   - 显示第一张卡片题目

2. **复习第 1 张卡片**
   - 题目: "What is quantum entanglement?"
   - 点击 "显示答案" → 看到答案内容
   - 点击评分 (例如 `Good`)
   - **控制台输出**: `[SRS Review Session] 卡片 #1 评分: good`
   - 300ms 后自动切换到第 2 张

3. **复习第 2-5 张卡片**
   - 重复相同流程
   - 观察进度条逐渐填满
   - 进度文字更新: "卡片 2 / 5" → ... → "卡片 5 / 5"

4. **完成阶段**
   - 最后一张评分后,自动显示完成页面
   - 看到 🎉 图标
   - 文字: "本次复习结束！共复习了 5 张卡片"
   - 点击 "完成" 按钮
   - **控制台输出**: `[SRS Review Session] 本次复习会话结束，共复习 5 张卡片`
   - 显示通知: "本次复习完成！共复习了 5 张卡片"
   - 界面关闭

### 6. 查看调试日志

打开 Orca 开发者工具 (`Ctrl+Shift+I` / `Cmd+Option+I`),在 Console 面板查看:

```
[虎鲸标记 内置闪卡] 插件已加载
[虎鲸标记 内置闪卡] 命令和 UI 组件已注册
[虎鲸标记 内置闪卡] 开始 SRS 复习会话
[虎鲸标记 内置闪卡] SRS 复习会话已开始

[SRS Review Session] 卡片 #1 评分: good
[SRS Review Session] 卡片 #2 评分: hard
[SRS Review Session] 卡片 #3 评分: good
[SRS Review Session] 卡片 #4 评分: easy
[SRS Review Session] 卡片 #5 评分: good

[SRS Review Session] 本次复习会话结束，共复习 5 张卡片
```

---

## 🎨 技术实现细节

### React 组件开发约定

#### 1. 使用全局 React (不要 import)
```typescript
// ❌ 错误
import React, { useState } from 'react'

// ✅ 正确
const { useState } = window.React
```

#### 2. 使用 Orca 内置组件
```typescript
const { Button, ModalOverlay, Menu, Input } = orca.components
```

#### 3. 使用 Orca 主题变量
```css
background-color: var(--orca-color-bg-1)
color: var(--orca-color-text-1)
border-color: var(--orca-color-primary-5)
```

#### 4. 使用 Tabler Icons
```typescript
icon: "ti ti-cards"      // 卡片图标
icon: "ti ti-star"       // 星星图标
icon: "ti ti-check"      // 勾选图标
```

### 插件生命周期

#### load() 函数
- 注册命令、UI 组件、事件监听
- 设置国际化 (`setupL10N`)
- 初始化插件状态

#### unload() 函数
- **必须清理所有资源**:
  - 注销命令 (`unregisterCommand`)
  - 移除 UI 组件 (`unregisterToolbarButton`)
  - 卸载 React 组件 (`root.unmount()`)
  - 移除 DOM 节点 (`container.remove()`)

### 组件渲染模式

使用 React 18 的 `createRoot` API:

```typescript
const container = document.createElement("div")
document.body.appendChild(container)

const root = window.createRoot(container)
root.render(
  React.createElement(MyComponent, { prop1: value1 })
)

// 清理时
root.unmount()
container.remove()
```

---

## 📝 代码规范

### TypeScript 类型约定

1. **必须使用静态类型** (全局规则)
   ```typescript
   // ❌ 错误
   const cards = []

   // ✅ 正确
   const cards: Card[] = []
   ```

2. **Props 接口命名**
   ```typescript
   type ComponentNameProps = {
     prop1: type1
     prop2?: type2  // 可选属性用 ?
   }
   ```

3. **导入 Orca 类型**
   ```typescript
   import type { Block, DbId } from "./orca.d.ts"
   ```

### 命名规范

1. **组件文件**: PascalCase
   - `SrsCardDemo.tsx`
   - `SrsReviewSessionDemo.tsx`

2. **函数/变量**: camelCase
   - `startReviewSession()`
   - `currentIndex`

3. **常量**: UPPER_SNAKE_CASE
   - `const MAX_CARDS = 100`

4. **插件标识符**: 使用 `${pluginName}.xxx` 前缀
   - `${pluginName}.startReviewSession`
   - `${pluginName}.reviewButton`

### 注释规范

```typescript
/**
 * 函数功能说明
 * @param paramName 参数说明
 * @returns 返回值说明
 */
function myFunction(paramName: string): void {
  // 行内注释: 解释关键逻辑
}
```

---

## 🔄 下一步开发计划 (待实现)

### 阶段 2: SRS 算法模块

**目标**: 实现间隔重复算法,脱离假数据

#### 待创建文件
- `src/srs/algorithm.ts` - SRS 算法核心
- `src/srs/types.ts` - SRS 相关类型定义

#### 待实现功能

1. **SRS 状态类型定义**
   ```typescript
   type SrsState = {
     due: Date          // 下次复习时间
     interval: number   // 复习间隔 (天)
     ease: number       // 难度系数
     reps: number       // 复习次数
     lapses: number     // 失败次数
   }
   ```

2. **SRS 算法函数**
   ```typescript
   /**
    * 计算下次复习状态
    * 基于简化版 SM-2 算法
    */
   function nextReviewState(
     prevState: SrsState,
     grade: "again" | "hard" | "good" | "easy"
   ): SrsState {
     // 实现算法逻辑
   }
   ```

3. **算法规则** (简化 SM-2)
   - Again: 重置 interval 为 1 天
   - Hard: interval × 1.2
   - Good: interval × ease
   - Easy: interval × ease × 1.3
   - ease 范围: 1.3 - 2.5

---

### 阶段 3: 数据存储模块

**目标**: 将 SRS 状态持久化到 Orca 块属性

#### 待创建文件
- `src/srs/storage.ts` - 数据访问层

#### 待实现功能

1. **加载卡片 SRS 状态**
   ```typescript
   async function loadCardSrsState(blockId: DbId): Promise<SrsState | null> {
     const block = await orca.invokeBackend("get-block", blockId)
     // 从 block.properties 读取 SRS 属性
   }
   ```

2. **保存卡片 SRS 状态**
   ```typescript
   async function saveCardSrsState(blockId: DbId, state: SrsState): Promise<void> {
     await orca.commands.invokeEditorCommand(
       "core.editor.setProperties",
       null,
       blockId,
       {
         "srs.due": state.due,
         "srs.interval": state.interval,
         // ...
       }
     )
   }
   ```

3. **查询到期卡片**
   ```typescript
   async function queryDueCards(date: Date): Promise<Block[]> {
     // 使用 orca.invokeBackend("query", ...)
     // 查找 srs.due <= date 的块
   }
   ```

---

### 阶段 4: 卡片标记功能

**目标**: 允许用户将普通块转换为 SRS 卡片

#### 待实现功能

1. **命令: 创建卡片**
   ```typescript
   orca.commands.registerEditorCommand(
     `${pluginName}.makeCard`,
     async ([panelId, rootBlockId, cursor]) => {
       // 1. 获取当前块 (作为题目)
       // 2. 检查是否有子块 (作为答案)
       // 3. 添加 #card 标签
       // 4. 初始化 SRS 属性
       // 5. 设置 _repr.type = "srs.card"
     },
     // undo 函数
     { label: "SRS: 创建记忆卡片" }
   )
   ```

2. **斜杠命令**
   ```typescript
   orca.slashCommands.registerSlashCommand(`${pluginName}.makeCard`, {
     icon: "ti ti-card-plus",
     group: "SRS",
     title: "创建记忆卡片",
     command: `${pluginName}.makeCard`
   })
   ```

---

### 阶段 5: 自定义卡片渲染器

**目标**: 在编辑器中以特殊样式显示卡片块

#### 待创建文件
- `src/components/SrsCardBlockRenderer.tsx` - 卡片块渲染器

#### 待实现功能

1. **注册块渲染器**
   ```typescript
   orca.renderers.registerBlock(
     "srs.card",
     false,  // 不可编辑 (有专门的复习界面)
     SrsCardBlockRenderer
   )
   ```

2. **渲染器组件**
   ```typescript
   function SrsCardBlockRenderer({
     panelId, blockId, rndId, blockLevel, indentLevel
   }: BlockRendererProps) {
     // 1. 显示卡片标识图标
     // 2. 显示下次复习时间 (srs.due)
     // 3. 显示复习统计 (reps, interval)
   }
   ```

---

### 阶段 6: 真实数据集成

**目标**: 将复习会话连接到真实的 Orca 数据

#### 待修改文件
- `src/components/SrsReviewSessionDemo.tsx` → 改名为 `SrsReviewSession.tsx`
- `src/main.ts`

#### 待实现功能

1. **启动复习时查询到期卡片**
   ```typescript
   async function startReviewSession() {
     // 1. 查询今天到期的卡片
     const dueCards = await queryDueCards(new Date())

     // 2. 如果没有卡片,显示提示
     if (dueCards.length === 0) {
       orca.notify("info", "今天没有需要复习的卡片")
       return
     }

     // 3. 渲染复习会话组件
     renderReviewSession(dueCards)
   }
   ```

2. **评分后更新 SRS 状态**
   ```typescript
   async function handleGrade(cardBlockId: DbId, grade: Grade) {
     // 1. 加载当前 SRS 状态
     const prevState = await loadCardSrsState(cardBlockId)

     // 2. 计算新状态
     const newState = nextReviewState(prevState, grade)

     // 3. 保存到块属性
     await saveCardSrsState(cardBlockId, newState)
   }
   ```

---

## 🐛 已知问题和限制

### 当前阶段限制
1. **仅使用假数据** - 未连接 Orca 后端
2. **无数据持久化** - 刷新后进度丢失
3. **无 SRS 算法** - 评分不影响复习间隔
4. **无卡片创建功能** - 不能从 Orca 块创建卡片

### 技术限制
1. **需要 Orca 环境** - 无法在浏览器中独立运行
2. **依赖全局 React** - 必须在 Orca 提供的环境中运行
3. **热重载不支持** - 修改代码后需要重新构建和重启插件

---

## 📚 参考资料

### Orca 插件开发文档
- **完整 API 参考**: `src/orca.d.ts` (5000+ 行类型定义)
- **快速开始**: `plugin-docs/documents/Quick-Start.md`
- **后端 API**: `plugin-docs/documents/Backend-API.md`
- **核心命令**: `plugin-docs/documents/Core-Commands.md`
- **编辑器命令**: `plugin-docs/documents/Core-Editor-Commands.md`
- **自定义渲染器**: `plugin-docs/documents/Custom-Renderers.md`
- **开发指南**: `CLAUDE.md`

### 外部资源
- [Orca 插件模板](https://github.com/sethyuan/orca-plugin-template)
- [Tabler Icons](https://tabler-icons.io/) - 图标库
- [SM-2 算法](https://en.wikipedia.org/wiki/SuperMemo#Description_of_SM-2_algorithm) - SRS 算法参考

---

## 👥 协作说明

### 继续开发建议

1. **熟悉当前代码**
   - 阅读 `CLAUDE.md` 了解项目架构
   - 运行并测试现有功能
   - 查看控制台日志理解数据流

2. **选择下一阶段**
   - 按顺序实现: 阶段 2 (算法) → 阶段 3 (存储) → ...
   - 或根据需求优先级调整顺序

3. **代码风格保持一致**
   - 遵循现有的命名规范
   - 使用 TypeScript 静态类型
   - 添加详细的中文注释

4. **测试驱动开发**
   - 每完成一个模块立即测试
   - 在控制台打印日志方便调试
   - 保证向后兼容性

### 提交代码前检查

- [ ] TypeScript 编译通过 (`npm run build` 无错误)
- [ ] 所有函数都有类型定义
- [ ] 关键逻辑有中文注释
- [ ] 在 Orca 中测试通过
- [ ] 更新 `progress.md` 记录新功能

---

**最后更新**: 2025-01-XX
**当前状态**: ✅ 阶段 1 完成 (前端 UI 使用假数据)
**下一步**: 🚧 阶段 2 - 实现 SRS 算法模块
