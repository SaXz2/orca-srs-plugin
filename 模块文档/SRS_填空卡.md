# SRS 填空卡（Cloze）功能模块

> **本文档说明**：这是一个渐进式总结的文档，记录填空卡功能的实现过程。我们将一步一步地实现类似于 Anki 的 Cloze（填空）卡片功能。

---

## 📋 目标

实现类似 Anki 的 Cloze 填空卡功能，允许用户：

1. 选中文本后，将其转换为 `{c1:: 文本}` 格式的填空标记
2. 支持多次填空，自动递增编号（c1, c2, c3...）
3. 支持撤销/重做操作
4. 在复习时显示填空卡片，隐藏填空部分

---

## 📝 当前进度

### ✅ 阶段 1：基础填空标记功能（已完成）

#### 实现内容

1. **创建 clozeUtils 工具模块** (`src/srs/clozeUtils.ts`)

   - `getMaxClozeNumber(text)`: 从文本中提取当前最大的 cloze 编号
   - `createCloze(cursor, pluginName)`: 将选中文本转换为 cloze 格式

2. **注册编辑器命令** (`src/main.ts`)

   - 命令 ID: `${pluginName}.createCloze`
   - 支持 do/undo 操作
   - do: 调用 `createCloze()` 将选中文本转换为 `{cN:: text}` 格式
   - undo: 恢复原始文本和 content 数组

3. **注册工具栏按钮**
   - 按钮 ID: `${pluginName}.clozeButton`
   - 图标: `ti ti-braces` (大括号)
   - 提示: "创建 Cloze 填空"

---

### ✅ 阶段 1.5：Cloze Inline 渲染器（已完成）

#### 实现内容

1. **创建 Cloze Inline 渲染器组件** (`src/components/ClozeInlineRenderer.tsx`)

   - 组件名: `ClozeInlineRenderer`
   - 接收 props: `blockId`, `data`, `index`
   - data 格式: `{ t: "pluginName.cloze", v: "填空内容", clozeNumber: 1 }`

2. **注册 Inline 渲染器和转换器** (`src/main.ts`)

   - **Inline 渲染器**: `orca.renderers.registerInline()`
     - 类型: `${pluginName}.cloze`
     - 不可编辑 (`isEditable: false`)
   - **Plain 转换器**: `orca.converters.registerInline()`
     - 将 cloze inline 转换回 `{cN:: 内容}` 格式

3. **文本解析函数** (`src/srs/clozeUtils.ts`)

   - `parseClozeText(text, pluginName)`: 将包含 `{cN:: 文本}` 的纯文本解析为 ContentFragment 数组
   - 例如: `"首都是{c1:: 北京}"` → `[{t:"t", v:"首都是"}, {t:"pluginName.cloze", v:"北京", clozeNumber:1}]`

4. **更新 createCloze 函数**
   - 使用 `parseClozeText()` 生成 ContentFragment 数组
   - 通过 `setBlocksContent` 设置富文本内容而非纯文本
   - Orca 自动调用 inline 渲染器显示填空

#### 渲染效果

- **`{cN::}` 符号不可见**：只显示填空内容
- **浅灰色文本**：`color: #999`
- **蓝色下划线**：`border-bottom: 2px solid #4a90e2`
- **鼠标悬停提示**：显示 `Cloze N`

#### 技术原理

1. **ContentFragment 结构**

```typescript
// 普通文本
{ t: "t", v: "中国的首都是" }

// Cloze 填空
{
  t: "pluginName.cloze",
  v: "北京",
  clozeNumber: 1
}
```

2. **数据流程**
   - 用户选中文本 → 点击 Cloze 按钮
   - `createCloze()` 在文本中插入 `{cN:: 选中文本}`
   - `parseClozeText()` 将纯文本解析为 ContentFragment 数组
   - Orca 识别到 `pluginName.cloze` 类型，调用 `ClozeInlineRenderer`
   - 渲染器只显示填空内容，应用自定义样式

#### 使用效果

**操作前**：
```
中国的首都是北京
```

**选中"北京"点击 Cloze 按钮后**：
```
中国的首都是北京  （"北京"显示为浅灰色 + 蓝色下划线，{c1::} 符号不可见）
```

#### 核心逻辑

```typescript
// 检测最大 cloze 编号
const maxClozeNumber = getMaxClozeNumber(blockText);
const nextClozeNumber = maxClozeNumber + 1;

// 创建 cloze 标记
const clozeText = `{c${nextClozeNumber}:: ${selectedText}}`;

// 替换选中文本
const newBlockText =
  blockText.substring(0, startOffset) +
  clozeText +
  blockText.substring(endOffset);
```

#### 使用方式

1. 在块中输入文本，例如：`中国首都是北京`
2. 选中 "北京"
3. 点击工具栏的"创建 Cloze 填空"按钮（或使用命令）
4. 文本变为：`中国首都是{c1:: 北京}` **并自动添加 `#card` 标签**
5. 再次选中 "中国"，使用同样操作
6. 文本变为：`{c2:: 中国}首都是{c1:: 北京}` **（已有 `#card` 标签，不会重复添加）**

> 💡 **提示**：创建 cloze 填空会自动将块标记为卡片，无需手动添加 `#card` 标签。

#### 技术细节

1. **文本选择处理**

   - 通过 `CursorData` 获取选中范围
   - 计算 `startOffset` 和 `endOffset`
   - 提取 `blockText.substring(startOffset, endOffset)`

2. **编号递增逻辑**

   - 使用正则表达式 `/\{c(\d+)::/g` 匹配所有现有的 cloze 标记
   - 找出最大编号，新标记使用 `maxNumber + 1`

3. **块内容更新**

   - 使用 `core.editor.setBlocksContent` 命令更新块内容
   - 保存原始 `content` 数组用于撤销
   - 支持完整的 undo/redo 功能

4. **#card 标签自动添加**

   - 创建 cloze 标记后，自动检查块是否有 `#card` 标签
   - 检查逻辑：`block.refs?.some(ref => ref.type === 2 && ref.alias === "card")`
   - 如果没有标签，使用 `core.editor.insertTag` 命令自动添加
   - 避免重复添加，确保每个块只有一个 `#card` 标签

5. **错误处理**
   - 验证光标位置有效性
   - 检查是否有选中文本
   - 确保选中范围在同一块内
   - 捕获更新命令的异常
   - 标签添加失败不影响 cloze 创建（容错处理）

---

## 🔄 下一步计划

### ⏳ 阶段 2：Cloze 卡片复习渲染（待实现）

**目标**：在复习界面正确渲染填空卡片，支持隐藏/显示答案

**任务**：

1. ✅ **编辑器内渲染** - 已完成（阶段 1.5）
   - 在编辑器中隐藏 `{cN::}` 符号
   - 显示浅灰色 + 蓝色下划线样式

2. **复习界面渲染** - 待实现
   - 创建 Cloze 卡片复习组件
   - 题目状态：将填空部分替换为 `[...]`
   - 答案状态：显示完整内容，高亮填空部分
   - 支持多个填空的独立显示/隐藏

**示例效果**：

```
题目（隐藏状态）：
[...] 首都是 [...]

答案（显示状态）：
中国 首都是 北京
   ↑         ↑
  高亮显示
```

**技术方案**：

- 创建 `ClozeCardReviewRenderer` 组件
- 在复习模式下，将 `pluginName.cloze` 类型的 fragment 渲染为：
  - 题目状态：`[...]` 占位符
  - 答案状态：高亮的原始内容
- 与现有的 `SrsCardDemo` 组件集成

---

### ⏳ 阶段 3：Cloze 卡片类型支持（待实现）

**目标**：将 Cloze 作为独立的卡片类型

**任务**：

1. 定义 `_repr.type = "srs.cloze"` 卡片类型
2. 自动检测文本中的 cloze 标记
3. 将带有 cloze 标记的块转换为 cloze 卡片
4. 注册 cloze 卡片的渲染器和转换器

---

### ⏳ 阶段 4：复习逻辑集成（待实现）

**目标**：在 SRS 复习系统中支持 Cloze 卡片

**任务**：

1. 在 `buildReviewQueue` 中支持 cloze 卡片
2. 为每个 cloze 标记生成独立的复习项
3. 跟踪每个填空的 SRS 数据
4. 支持按填空编号区分复习进度

---

### ⏳ 阶段 5：高级功能（待实现）

**任务**：

1. **提示文本**：支持 `{c1::答案::提示}` 格式
2. **填空组**：支持 `{c1::文本1} ... {c1::文本2}` 同时显示
3. **嵌套填空**：处理复杂的填空嵌套场景
4. **批量操作**：快速创建多个填空

---

## 📚 相关文件

### 核心实现

- `src/srs/clozeUtils.ts` - Cloze 工具函数
  - `getMaxClozeNumber()` - 获取最大 cloze 编号
  - `createCloze()` - 创建 cloze 标记
  - `parseClozeText()` - 解析 cloze 文本为 ContentFragment 数组
- `src/components/ClozeInlineRenderer.tsx` - Cloze Inline 渲染器（编辑器内）
- `src/main.ts` - 命令、按钮、渲染器注册

### 待创建

- `src/components/ClozeCardReviewRenderer.tsx` - Cloze 卡片复习渲染器
- `src/srs/clozeCardCreator.ts` - Cloze 卡片创建逻辑（可选）

### 参考文档

- `SRS_卡片创建与管理.md` - 卡片创建流程
- `SRS_块渲染器.md` - 自定义渲染器实现
- `SRS_复习队列管理.md` - 复习队列构建逻辑

---

## 🎯 设计原则

1. **渐进增强**：每个阶段独立可用，逐步完善功能
2. **兼容现有系统**：与现有 SRS 卡片系统无缝集成
3. **用户体验优先**：操作简单直观，符合 Anki 用户习惯
4. **支持撤销**：所有操作都可撤销/重做
5. **类型安全**：使用 TypeScript 类型系统确保代码质量

---

## 📖 参考资料

- [Anki Manual - Cloze Deletion](https://docs.ankiweb.net/editing.html#cloze-deletion)
- `plugin-docs/documents/Core-Editor-Commands.md` - 虎鲸笔记编辑器命令文档
- `src/orca.d.ts` - 虎鲸笔记 API 类型定义

---

## 📊 实现总结

### 已完成功能

- ✅ **基础填空标记**：选中文本 → 转换为 `{cN:: 文本}` 格式
- ✅ **编号自动递增**：智能检测现有编号，避免冲突
- ✅ **自动添加标签**：首次创建填空时自动添加 `#card` 标签
- ✅ **Inline 渲染器**：编辑器内隐藏 `{cN::}` 符号，显示自定义样式
- ✅ **ContentFragment 解析**：将纯文本转换为富文本结构
- ✅ **撤销/重做支持**：完整的 undo/redo 功能
- ✅ **Plain 转换器**：支持导出为纯文本格式

### 当前限制

- ⚠️ **复习界面渲染**：尚未实现填空隐藏/显示逻辑
- ⚠️ **卡片类型识别**：暂未定义独立的 `srs.cloze` 卡片类型
- ⚠️ **复习队列集成**：未集成到 SRS 复习系统

### 技术亮点

1. **符合 Orca 插件规范**：使用官方的 inline renderer API
2. **类型安全**：TypeScript 静态类型检查
3. **渐进增强**：每个阶段独立可用
4. **用户体验优先**：操作简单，符合 Anki 用户习惯

---

**最后更新**: 2025-12-09
**当前阶段**: 阶段 1.5 ✅ 完成（编辑器内 Inline 渲染）
**下一步**: 阶段 2 - 实现复习界面的填空隐藏/显示功能
