# 优化卡片复习界面功能

## 需求分析

1. **去除 # 标签显示**：在显示卡片时，**仅在视觉上**去除 front 和 back 文本中所有以 # 开头的标签，不修改原始数据
2. **跳转到卡片**：在复习界面添加独立的"跳转"按钮，跳转到编辑器中的卡片位置，同时保留复习界面状态（用户可返回继续复习）
3. **编辑卡片**：在复习界面和卡片块渲染器中都添加内嵌编辑功能，可以直接修改 front 和 back 文本

## 数据流说明

**数据源（Single Source of Truth）**：
- `block.text` = 题目（front）的原始数据
- `子块.text` = 答案（back）的原始数据

**派生数据**：
- `_repr.front` 和 `_repr.back` 从 `block.text` 和子块 text 派生

**编辑时的数据流**：
1. 用户编辑 front/back
2. 更新 `block.text` 和子块 `text`（使用 `core.editor.setBlocksContent`）
3. 同时更新 `_repr.front` 和 `_repr.back`（保持数据一致性）
4. **不重新计算 SRS 状态**（保留复习进度）

## 实现方案

### 1. 去除 # 标签显示（仅视觉过滤）

**目标**：在复习界面显示题目和答案时，不显示 `#card`、`#deck/English` 等标签，只显示纯文本内容。

**文件：`src/main.ts`**

#### 修改 1：添加工具函数 `removeHashTags`

在文件顶部（`load` 函数之前）添加：

```typescript
/**
 * 去除文本中的所有 # 标签（仅用于显示，不修改原始数据）
 * 例如：
 * - "学习英语 #card #deck/English" -> "学习英语"
 * - "什么是 #概念" -> "什么是"
 */
const removeHashTags = (text: string): string => {
  if (!text) return text
  // 匹配 # 开头后跟字母、数字、下划线、斜杠、中文等字符的模式
  return text.replace(/#[\w/\u4e00-\u9fa5]+/g, '').trim()
}
```

#### 修改 2：修改 `resolveFrontBack` 函数

找到现有的 `resolveFrontBack` 函数（约 307-311 行），修改为：

```typescript
const resolveFrontBack = (block: BlockWithRepr) => {
  const frontRaw = block._repr?.front ?? block.text ?? "（无题目）"
  const backRaw = block._repr?.back ?? getFirstChildText(block)

  // 应用标签过滤（仅用于显示）
  const front = removeHashTags(frontRaw)
  const back = removeHashTags(backRaw)

  return { front, back }
}
```

---

### 2. 添加跳转功能

**目标**：在复习界面添加"跳转到卡片"按钮，点击后跳转到编辑器中的卡片位置，复习界面保持打开状态（用户可手动返回继续复习）。

**文件：`src/components/SrsCardDemo.tsx`**

#### 修改 1：添加 Props

在 `SrsCardDemoProps` 类型中添加：

```typescript
type SrsCardDemoProps = {
  front: string
  back: string
  onGrade: (grade: Grade) => Promise<void> | void
  onClose?: () => void
  srsInfo?: Partial<SrsState>
  isGrading?: boolean
  blockId?: DbId  // 新增：块 ID
  onJumpToCard?: (blockId: DbId) => void  // 新增：跳转回调
}
```

#### 修改 2：添加跳转按钮

在组件中添加跳转按钮（建议放在卡片右上角）：

在 `return` 语句的 `<div className="srs-card-container">` 内部，题目区域之前添加：

```typescript
{/* 工具栏：跳转按钮 */}
{blockId && onJumpToCard && (
  <div style={{
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '12px'
  }}>
    <Button
      variant="soft"
      onClick={() => onJumpToCard(blockId)}
      style={{
        padding: '6px 12px',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}
    >
      <i className="ti ti-arrow-right" />
      跳转到卡片
    </Button>
  </div>
)}
```

**文件：`src/components/SrsReviewSessionDemo.tsx`**

#### 修改 3：实现跳转回调

在 `SrsReviewSession` 组件中，添加跳转处理函数（在 `handleGrade` 之后）：

```typescript
const handleJumpToCard = (blockId: DbId) => {
  console.log(`[SRS Review Session] 跳转到卡片 #${blockId}`)

  // 跳转到编辑器中的块位置
  orca.nav.goTo("block", { blockId })

  // 不关闭复习界面，用户可手动返回继续复习
  orca.notify(
    "info",
    "已跳转到卡片，复习界面仍然保留",
    { title: "SRS 复习" }
  )
}
```

#### 修改 4：传递 Props 给 SrsCardDemo

找到 `<SrsCardDemo>` 组件的使用位置（约 220 行），添加新的 props：

```typescript
<SrsCardDemo
  front={currentCard.front}
  back={currentCard.back}
  onGrade={handleGrade}
  onClose={onClose}
  srsInfo={currentCard.srs}
  isGrading={isGrading}
  blockId={currentCard.id}  // 新增
  onJumpToCard={handleJumpToCard}  // 新增
/>
```

**文件：`src/components/SrsCardBlockRenderer.tsx`**

#### 修改 5：SrsCardBlockRenderer 不需要跳转按钮

因为该组件已经在编辑器中显示，所以不需要添加跳转功能。

---

### 3. 添加内嵌编辑功能

**目标**：在 SrsCardDemo 和 SrsCardBlockRenderer 中都添加编辑功能，允许用户直接修改题目和答案。

**文件：`src/components/SrsCardDemo.tsx`**

#### 修改 1：添加编辑状态

在组件顶部添加状态：

```typescript
const [showAnswer, setShowAnswer] = useState(false)
const [isEditingFront, setIsEditingFront] = useState(false)  // 新增
const [isEditingBack, setIsEditingBack] = useState(false)    // 新增
const [editedFront, setEditedFront] = useState(front)        // 新增
const [editedBack, setEditedBack] = useState(back)           // 新增
```

#### 修改 2：添加保存和取消函数

```typescript
/**
 * 保存题目编辑
 */
const handleSaveFront = async () => {
  if (!blockId) return

  try {
    // 1. 更新块的 text
    const block = orca.state.blocks[blockId] as any
    await orca.commands.invokeEditorCommand(
      "core.editor.setBlocksContent",
      [null, null, null, false],  // editor context
      [{ id: blockId, text: editedFront }]
    )

    // 2. 更新 _repr.front
    if (block._repr) {
      block._repr.front = editedFront
    }

    setIsEditingFront(false)
    orca.notify("success", "题目已保存")
  } catch (error) {
    console.error("保存题目失败:", error)
    orca.notify("error", `保存失败: ${error}`)
  }
}

/**
 * 保存答案编辑
 */
const handleSaveBack = async () => {
  if (!blockId) return

  try {
    const block = orca.state.blocks[blockId] as any

    // 1. 更新第一个子块的 text
    if (block.children && block.children.length > 0) {
      const firstChildId = block.children[0]
      await orca.commands.invokeEditorCommand(
        "core.editor.setBlocksContent",
        [null, null, null, false],
        [{ id: firstChildId, text: editedBack }]
      )
    } else {
      orca.notify("warn", "卡片没有子块，无法保存答案")
      return
    }

    // 2. 更新 _repr.back
    if (block._repr) {
      block._repr.back = editedBack
    }

    setIsEditingBack(false)
    orca.notify("success", "答案已保存")
  } catch (error) {
    console.error("保存答案失败:", error)
    orca.notify("error", `保存失败: ${error}`)
  }
}

const handleCancelEdit = (type: 'front' | 'back') => {
  if (type === 'front') {
    setEditedFront(front)
    setIsEditingFront(false)
  } else {
    setEditedBack(back)
    setIsEditingBack(false)
  }
}
```

#### 修改 3：修改题目区域的渲染

将题目区域改为支持编辑：

```typescript
{/* 题目区域 */}
<div className="srs-card-front" style={{
  marginBottom: '24px',
  padding: '20px',
  backgroundColor: 'var(--orca-color-bg-2)',
  borderRadius: '8px',
  minHeight: '100px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
}}>
  {/* 编辑按钮 */}
  {blockId && !isEditingFront && (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <Button
        variant="soft"
        onClick={() => setIsEditingFront(true)}
        style={{ padding: '4px 8px', fontSize: '12px' }}
      >
        <i className="ti ti-edit" /> 编辑
      </Button>
    </div>
  )}

  {/* 题目内容或编辑框 */}
  {isEditingFront ? (
    <>
      <textarea
        value={editedFront}
        onChange={(e) => setEditedFront(e.target.value)}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          fontSize: '16px',
          borderRadius: '4px',
          border: '1px solid var(--orca-color-border-1)',
          resize: 'vertical'
        }}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <Button variant="soft" onClick={() => handleCancelEdit('front')}>
          取消
        </Button>
        <Button variant="solid" onClick={handleSaveFront}>
          保存
        </Button>
      </div>
    </>
  ) : (
    <div style={{
      fontSize: '18px',
      fontWeight: '500',
      color: 'var(--orca-color-text-1)',
      textAlign: 'center'
    }}>
      {front}
    </div>
  )}
</div>
```

#### 修改 4：修改答案区域的渲染（类似题目）

在答案区域也添加相同的编辑功能（使用 `isEditingBack`、`editedBack`、`handleSaveBack`）。

**文件：`src/components/SrsCardBlockRenderer.tsx`**

#### 修改 6：在 SrsCardBlockRenderer 中也添加编辑功能

使用与 SrsCardDemo 相同的编辑逻辑，但需要注意：
- 该组件中 `blockId` 始终存在（从 props 获取）
- 编辑保存后不需要处理复习流程

---

## 文件修改清单

### 必须修改的文件

1. **src/main.ts**
   - [ ] 添加 `removeHashTags` 函数
   - [ ] 修改 `resolveFrontBack` 函数应用标签过滤

2. **src/components/SrsCardDemo.tsx**
   - [ ] 添加 `blockId` 和 `onJumpToCard` props
   - [ ] 添加跳转按钮
   - [ ] 添加编辑状态（`isEditingFront`, `isEditingBack`, `editedFront`, `editedBack`）
   - [ ] 添加保存和取消函数（`handleSaveFront`, `handleSaveBack`, `handleCancelEdit`）
   - [ ] 修改题目和答案区域的渲染，支持编辑模式

3. **src/components/SrsReviewSessionDemo.tsx**
   - [ ] 添加 `handleJumpToCard` 函数
   - [ ] 传递 `blockId` 和 `onJumpToCard` 给 `SrsCardDemo`

4. **src/components/SrsCardBlockRenderer.tsx**
   - [ ] 添加编辑功能（与 SrsCardDemo 类似）

---

## 实现顺序建议

1. **第一步**：实现标签过滤（最简单，立即见效）
2. **第二步**：实现跳转功能（中等复杂度）
3. **第三步**：实现编辑功能（最复杂，涉及数据流）

---

## 注意事项

1. **标签过滤**：只在显示时过滤，不修改原始数据
2. **跳转功能**：不关闭复习界面，让用户可以手动返回
3. **编辑功能**：
   - 同时更新 `block.text` 和 `_repr`，保持数据一致性
   - 不重新计算 SRS 状态（保留复习进度）
   - 需要处理没有子块的边界情况
