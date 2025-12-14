/**
 * 标签属性初始化模块
 * 
 * 负责在首次创建 #card 标签时，为标签块本身添加属性定义（模式）
 * 这样用户不需要手动在 Orca 标签页面配置这些属性
 */

import type { Block, BlockProperty } from "../orca.d.ts"

/**
 * PropType 常量（根据 Orca 文档推断）
 * 
 * 参考 Core-Editor-Commands.md setProperties 文档：
 * - 0: PropType.JSON
 * - 1: PropType.Text
 * - 2: PropType.BlockRefs
 * - 3: PropType.Number
 * - 4: PropType.Boolean
 * - 5: PropType.DateTime
 * - 6: PropType.TextChoices
 */
const PropType = {
  JSON: 0,
  Text: 1,
  BlockRefs: 2,
  Number: 3,
  Boolean: 4,
  DateTime: 5,
  TextChoices: 6
} as const

/**
 * card 标签需要的属性定义
 * 
 * 根据 Orca 的标签属性系统：
 * - type 和 status 使用"文本"类型（PropType.Text = 1）
 * - 牌组 使用"块引用"类型（PropType.BlockRefs = 2）
 * - 值留空，用户可后续在 UI 中选择/输入
 */
const CARD_TAG_PROPERTY_DEFINITIONS: BlockProperty[] = [
  {
    name: "type",
    type: PropType.Text,  // 文本类型
    value: ""  // 留空
  },
  {
    name: "牌组",
    type: PropType.BlockRefs,  // 块引用类型
    // 尝试使用 undefined 代替空数组，因为空数组被 Orca 静默忽略
    value: undefined as any
  },
  {
    name: "status",
    type: PropType.Text,  // 文本类型
    value: ""  // 留空
  }
]

// 缓存：避免重复检查和初始化
let cardTagInitialized = false
let initializationInProgress = false

/**
 * 确保 #card 标签块存在必要的属性定义
 * 
 * 工作流程：
 * 1. 通过别名获取 #card 标签块
 * 2. 检查标签块是否已有 type/牌组/status 属性定义
 * 3. 如无，使用 setProperties 添加这些属性定义
 * 
 * @param pluginName - 插件名称（用于日志）
 */
export async function ensureCardTagProperties(pluginName: string): Promise<void> {
  // 如果已初始化，直接返回
  if (cardTagInitialized) {
    console.log(`[${pluginName}] [tagPropertyInit] 标签属性已初始化，跳过`)
    return
  }

  // 防止并发初始化
  if (initializationInProgress) {
    console.log(`[${pluginName}] [tagPropertyInit] 初始化进行中，跳过重复调用`)
    return
  }

  initializationInProgress = true

  try {
    console.log(`[${pluginName}] [tagPropertyInit] ========== 开始检查 #card 标签属性定义 ==========`)

    // 1. 获取 #card 标签块
    console.log(`[${pluginName}] [tagPropertyInit] 正在获取 #card 标签块...`)
    const cardTagBlock = await orca.invokeBackend("get-block-by-alias", "card") as Block | null

    if (!cardTagBlock) {
      console.log(`[${pluginName}] [tagPropertyInit] ⚠️ 未找到 #card 标签块，可能是首次使用或别名不存在`)
      console.log(`[${pluginName}] [tagPropertyInit] 稍后 insertTag 会自动创建标签块，届时再尝试初始化`)
      initializationInProgress = false
      return
    }

    console.log(`[${pluginName}] [tagPropertyInit] ✓ 找到 #card 标签块:`)
    console.log(`[${pluginName}] [tagPropertyInit]   ID: ${cardTagBlock.id}`)
    console.log(`[${pluginName}] [tagPropertyInit]   aliases: ${JSON.stringify(cardTagBlock.aliases)}`)
    console.log(`[${pluginName}] [tagPropertyInit]   现有 properties:`, JSON.stringify(cardTagBlock.properties, null, 2))

    // 2. 检查是否已有必要的属性定义
    const existingPropNames = new Set(cardTagBlock.properties?.map(p => p.name) || [])
    const missingProps = CARD_TAG_PROPERTY_DEFINITIONS.filter(
      propDef => !existingPropNames.has(propDef.name)
    )

    console.log(`[${pluginName}] [tagPropertyInit] 已有属性: ${Array.from(existingPropNames).join(", ") || "(无)"}`)
    console.log(`[${pluginName}] [tagPropertyInit] 缺失属性: ${missingProps.map(p => p.name).join(", ") || "(无)"}`)

    if (missingProps.length === 0) {
      console.log(`[${pluginName}] [tagPropertyInit] ✓ 标签已有全部属性定义，无需初始化`)
      cardTagInitialized = true
      initializationInProgress = false
      return
    }

    // 3. 添加缺失的属性定义（分开调用以便排查问题）
    console.log(`[${pluginName}] [tagPropertyInit] 正在添加缺失的属性定义...`)
    console.log(`[${pluginName}] [tagPropertyInit] 将要添加的属性:`, JSON.stringify(missingProps, null, 2))

    for (const prop of missingProps) {
      try {
        console.log(`[${pluginName}] [tagPropertyInit] 正在添加属性: ${prop.name} (type=${prop.type}, value=${JSON.stringify(prop.value)})`)
        
        await orca.commands.invokeEditorCommand(
          "core.editor.setProperties",
          null,
          [cardTagBlock.id],
          [prop]
        )
        
        console.log(`[${pluginName}] [tagPropertyInit] ✓ 属性 "${prop.name}" 添加成功`)
      } catch (propError) {
        console.error(`[${pluginName}] [tagPropertyInit] ✗ 属性 "${prop.name}" 添加失败:`, propError)
      }
    }

    console.log(`[${pluginName}] [tagPropertyInit] 所有属性添加完成`)

    // 4. 验证添加结果
    const updatedBlock = await orca.invokeBackend("get-block", cardTagBlock.id) as Block | null
    if (updatedBlock) {
      console.log(`[${pluginName}] [tagPropertyInit] 验证：更新后的 properties:`, JSON.stringify(updatedBlock.properties, null, 2))
      
      // 检查哪些属性成功/失败
      const addedPropNames = new Set(updatedBlock.properties?.map(p => p.name) || [])
      for (const prop of missingProps) {
        if (addedPropNames.has(prop.name)) {
          console.log(`[${pluginName}] [tagPropertyInit] ✓ 验证通过: ${prop.name}`)
        } else {
          console.warn(`[${pluginName}] [tagPropertyInit] ✗ 验证失败: ${prop.name} 未出现在 properties 中`)
        }
      }
    }

    cardTagInitialized = true
    console.log(`[${pluginName}] [tagPropertyInit] ========== 标签属性初始化完成 ==========`)

  } catch (error) {
    console.error(`[${pluginName}] [tagPropertyInit] ✗ 初始化失败:`, error)
    // 不抛出错误，避免阻塞卡片创建流程
  } finally {
    initializationInProgress = false
  }
}

/**
 * 重置初始化状态（用于测试或重新加载插件）
 */
export function resetCardTagInitState(): void {
  cardTagInitialized = false
  initializationInProgress = false
}
