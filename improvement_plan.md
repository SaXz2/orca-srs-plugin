# Orca SRS 插件 - Deck 分组迁移计划

## 目标概述

将卡片的 Deck 分组从 `#card/xxx` 标签格式迁移到 **Orca 标签属性系统**。

### 当前方式
- 用户使用 `#card` 或 `#card/English` 格式标记卡片
- 插件从 `block.refs[].alias` 中解析 deck 名称（字符串切分）

### 目标方式
- 用户在 Orca 标签页面为 `#card` 标签定义属性 "deck"（类型：多选文本）
- 用户打 `#card` 标签后，从下拉菜单选择 deck 值
- 插件从 `block.refs[].data` 中读取 deck 值（标签属性系统）

---

## 核心改动

### 改动 1：重写 `extractDeckName()` 函数

**文件**: `src/main.ts` 第 444-461 行

**当前逻辑**（需完全删除）:
```typescript
function extractDeckName(block: Block): string {
  if (!block.refs || block.refs.length === 0) return "Default"

  for (const ref of block.refs) {
    if (ref.type === 2) { // 标签引用
      const tagAlias = ref.alias || ""

      if (tagAlias === "card") {
        return "Default"
      } else if (tagAlias.startsWith("card/")) {  // ← 删除此逻辑
        const deckName = tagAlias.substring(5)
        return deckName || "Default"
      }
    }
  }

  return "Default"
}
```

**新实现**:
```typescript
/**
 * 从块的标签属性系统中提取 deck 名称
 *
 * 工作原理：
 * 1. 找到 type=2 (RefType.Property) 且 alias="card" 的引用
 * 2. 从引用的 data 数组中找到 name="deck" 的属性
 * 3. 返回该属性的 value，如果不存在返回 "Default"
 *
 * 用户操作流程：
 * 1. 在 Orca 标签页面为 #card 标签定义属性 "deck"（类型：多选文本）
 * 2. 添加可选值（如 "English", "物理", "数学"）
 * 3. 给块打 #card 标签后，从下拉菜单选择 deck 值
 *
 * @param block - 块对象
 * @returns deck 名称，默认为 "Default"
 */
function extractDeckName(block: Block): string {
  // 边界情况：块没有引用
  if (!block.refs || block.refs.length === 0) {
    return "Default"
  }

  // 1. 找到 #card 标签引用
  const cardRef = block.refs.find(ref =>
    ref.type === 2 &&      // RefType.Property（标签引用）
    ref.alias === "card"   // 标签名称为 "card"
  )

  // 边界情况：没有找到 #card 标签引用
  if (!cardRef) {
    return "Default"
  }

  // 边界情况：标签引用没有关联数据
  if (!cardRef.data || cardRef.data.length === 0) {
    return "Default"
  }

  // 2. 从标签关联数据中读取 deck 属性
  const deckProperty = cardRef.data.find(d => d.name === "deck")

  // 边界情况：没有设置 deck 属性
  if (!deckProperty) {
    return "Default"
  }

  // 3. 返回 deck 值
  const deckValue = deckProperty.value

  // 边界情况：deck 值为空、null 或非字符串
  if (!deckValue || typeof deckValue !== "string" || deckValue.trim() === "") {
    return "Default"
  }

  return deckValue.trim()
}
```

**关键点**:
- 从 `ref.data` 数组读取，而不是从 `ref.alias` 解析
- 完善的边界情况处理（无引用、无数据、无属性、值为空等）
- 详细的中文注释说明用户操作流程

---

### 改动 2：更新 `scanCardsFromTags()` 注释

**文件**: `src/main.ts` 第 637 行

**修改前**:
```typescript
// c. 从标签中解析 deck 名称（新逻辑）
const deckName = extractDeckName(block)
```

**修改后**:
```typescript
// c. 从标签属性系统中读取 deck 名称（block.refs[].data）
const deckName = extractDeckName(block)
```

---

### 改动 3：更新 `collectReviewCards()` 注释

**文件**: `src/main.ts` 第 401 行

**修改前**:
```typescript
const deckName = extractDeckName(block)
```

**修改后**:
```typescript
// 从标签属性系统读取 deck 名称
const deckName = extractDeckName(block)
```

---

### 改动 4：删除旧格式相关代码

#### 4.1 删除备用方案中的 `card/` 标签

**文件**: `src/main.ts` 第 326 行和第 562 行

**修改前**:
```typescript
const possibleTags = ["card", "card/", "card/english", "card/物理", "card/js", "card/数学"]
```

**修改后**:
```typescript
const possibleTags = ["card"]  // 移除所有 card/ 格式，只支持 #card
```

#### 4.2 删除手动过滤逻辑中的 `card/` 判断

**文件**: `src/main.ts` 第 356 行和第 591 行

**修改前**:
```typescript
const isMatch = tagAlias === "card" || tagAlias.startsWith("card/")
```

**修改后**:
```typescript
const isMatch = tagAlias === "card"  // 只匹配 #card，不支持 #card/xxx
```

---

### 改动 5：更新项目文档

**文件**: `CLAUDE.md` 中关于卡片标记的说明

**修改前**:
```markdown
用户规则：
1. 任何要变成记忆卡片的块：
   - 父块 = 题目
   - 第一个子块 = 答案
   - 父块打标签 `#card`
2. 可选 deck：
   - 通过标签 `#card/xxx` 表示这个卡片属于哪个 deck
```

**修改后**:
```markdown
用户规则：
1. 任何要变成记忆卡片的块：
   - 父块 = 题目
   - 第一个子块 = 答案
   - 父块打标签 `#card`
2. Deck 分组：
   - 在 Orca 标签页面为 #card 标签定义属性 "deck"（类型：多选文本）
   - 添加可选值（如 "English", "物理", "数学"）
   - 给块打 #card 标签后，从下拉菜单选择 deck 值
   - 如果不选择，默认归入 "Default" deck
```

---

## 实施步骤

### 步骤 1：核心逻辑重写（30 分钟）

1. 打开 `src/main.ts`
2. 定位到第 444 行 `extractDeckName()` 函数
3. 完全替换函数实现（使用上述新代码）
4. 保存文件

### 步骤 2：更新注释（5 分钟）

1. 修改第 637 行注释
2. 修改第 401 行，添加注释
3. 保存文件

### 步骤 3：删除旧代码（10 分钟）

1. 修改第 326 行：`possibleTags = ["card"]`
2. 修改第 562 行：`possibleTags = ["card"]`
3. 修改第 356 行：删除 `|| tagAlias.startsWith("card/")`
4. 修改第 591 行：删除 `|| tagAlias.startsWith("card/")`
5. 保存文件

### 步骤 4：更新文档（5 分钟）

1. 打开 `CLAUDE.md`
2. 定位到"项目说明：Orca SRS 插件"部分
3. 更新"用户使用方式（产品视角）"章节
4. 保存文件

### 步骤 5：编译和测试（30 分钟）

1. 运行 `npm run build` 编译插件
2. 在 Orca 中重新加载插件
3. 执行测试用例（见下方）

---

## 测试计划

### 测试用例 1：基本读取功能

**步骤**:
1. 在 Orca 中创建一个新块
2. 给块打 `#card` 标签
3. 在 Orca 标签页面为 #card 标签添加属性 "deck"（类型：多选文本）
4. 添加选项 "TestDeck"
5. 在块的标签属性中选择 "TestDeck"
6. 运行"扫描带标签的卡片"命令
7. 打开卡片浏览器

**预期结果**:
- 卡片出现在 "TestDeck" deck 中
- 控制台日志显示：`Deck: TestDeck`

### 测试用例 2：默认 Deck

**步骤**:
1. 创建新块并打 `#card` 标签
2. 不设置 deck 属性值（留空）
3. 运行"扫描带标签的卡片"命令

**预期结果**:
- 卡片归入 "Default" deck
- 不报错

### 测试用例 3：多个 Deck

**步骤**:
1. 创建 3 张卡片，分别设置 deck 为 "English", "物理", "Default"
2. 打开卡片浏览器

**预期结果**:
- 显示 3 个 deck
- 每个 deck 包含 1 张卡片
- Default deck 排在最前

### 测试用例 4：复习功能

**步骤**:
1. 创建多张卡片，设置不同的 deck
2. 点击某个 deck，进入卡片列表
3. 点击"开始复习此 Deck"

**预期结果**:
- 复习会话启动
- 只复习该 deck 的卡片

---

## 关键文件清单

### 需要修改的文件

1. **`src/main.ts`** - 核心逻辑文件
   - 第 444-461 行：`extractDeckName()` 函数（完全重写）
   - 第 637 行：注释更新
   - 第 401 行：添加注释
   - 第 326、562 行：删除 `card/` 相关标签
   - 第 356、591 行：删除 `startsWith("card/")` 判断

2. **`CLAUDE.md`** - 项目文档
   - 更新"用户使用方式（产品视角）"章节

### 不需要修改的文件

- `src/srs/types.ts` - 类型定义无需改动（`ReviewCard.deck` 已是必填字段）
- `src/components/SrsCardBrowser.tsx` - UI 组件无需改动（已支持 deck 分组）
- `src/srs/storage.ts` - 存储逻辑无需改动
- `src/srs/algorithm.ts` - 算法逻辑无需改动

---

## 数据结构参考

### Orca 标签属性系统的数据路径

```typescript
// Block 对象
interface Block {
  id: DbId
  refs: BlockRef[]  // 块引用数组
  // ...其他字段
}

// 标签引用
interface BlockRef {
  id: DbId
  from: DbId
  to: DbId
  type: number        // 2 = RefType.Property（标签引用）
  alias?: string      // 标签名称（如 "card"）
  data?: BlockProperty[]  // ← 关联数据数组（存储属性值）
}

// 属性数据
interface BlockProperty {
  name: string        // 属性名（如 "deck"）
  type: number        // 属性类型（6 = PropType.TextChoices）
  value?: any         // 属性值（如 "English"）
}
```

### 读取 deck 值的完整路径

```
block
  └─ refs[]
      └─ [type=2, alias="card"]  ← 找到 #card 标签引用
          └─ data[]
              └─ [name="deck"]   ← 找到 deck 属性
                  └─ value       ← 读取 deck 值（如 "English"）
```

---

## 风险和注意事项

### 风险 1：用户未设置 deck 属性

**现象**: 用户打 `#card` 标签后，没有在标签页面设置 deck 属性

**影响**: 所有卡片归入 "Default" deck

**缓解**:
- 功能仍然可用（Default deck 正常工作）
- 在卡片浏览器中添加提示信息（可选）

### 风险 2：边界情况处理

**可能的边界情况**:
- `block.refs` 为空数组
- `cardRef.data` 为 `undefined` 或空数组
- `deckProperty.value` 为 `null`、空字符串、或非字符串类型

**缓解**: 新的 `extractDeckName()` 函数已包含完善的边界检查

### 风险 3：性能问题

**现象**: 大量卡片时，遍历 `refs` 和 `data` 数组可能影响性能

**缓解**:
- Orca 的内置数据结构已优化
- 实际使用中单个块的 refs 和 data 数组通常很小（< 10 项）
- 如遇性能问题，可添加缓存机制

---

## 完成标准

- ✅ `extractDeckName()` 函数从 `block.refs[].data` 读取 deck 值
- ✅ 所有 `#card/xxx` 相关代码已删除
- ✅ 注释和文档已更新
- ✅ 编译无错误（`npm run build` 成功）
- ✅ 所有测试用例通过
- ✅ 卡片浏览器正确显示 deck 列表
- ✅ 复习功能按 deck 正常工作

---

## 预计工作量

- **代码修改**: 1 小时
- **测试验证**: 30 分钟
- **总计**: 1.5 小时

---

## 后续优化（可选）

1. **用户引导**: 首次使用时提示用户在标签页面设置 deck 属性
2. **迁移工具**: 提供命令将旧格式 `#card/xxx` 自动迁移到新格式
3. **统计信息**: 在浏览器中显示每个 deck 的学习进度
