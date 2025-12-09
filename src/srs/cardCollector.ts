/**
 * 卡片收集模块
 * 
 * 提供 SRS 卡片的收集、过滤和复习队列构建功能
 */

import type { Block, DbId } from "../orca.d.ts"
import type { ReviewCard } from "./types"
import { BlockWithRepr, isSrsCardBlock, resolveFrontBack } from "./blockUtils"
import { extractDeckName } from "./deckUtils"
import { loadCardSrsState, writeInitialSrsState } from "./storage"

/**
 * 收集所有 SRS 块（带 #card 标签或 _repr.type="srs.card" 的块）
 * @param pluginName - 插件名称（用于日志），可选
 * @returns SRS 块数组
 */
export async function collectSrsBlocks(pluginName: string = "srs-plugin"): Promise<BlockWithRepr[]> {
  // 尝试直接查询 #card 标签
  let tagged = (await orca.invokeBackend("get-blocks-with-tags", ["card"])) as BlockWithRepr[] | undefined
  
  // 如果直接查询无结果，使用备用方案获取所有块并过滤
  if (!tagged || tagged.length === 0) {
    console.log(`[${pluginName}] collectSrsBlocks: 直接查询无结果，使用备用方案`)
    try {
      // 备用方案1：尝试获取所有块
      const allBlocks = await orca.invokeBackend("get-all-blocks") as Block[] || []
      console.log(`[${pluginName}] collectSrsBlocks: get-all-blocks 返回了 ${allBlocks.length} 个块`)
      
      // 备用方案2：查询 #card 标签
      const possibleTags = ["card"]  // 移除所有 card/ 格式，只支持 #card
      let foundBlocks: Block[] = []

      for (const tag of possibleTags) {
        try {
          const taggedWithSpecific = await orca.invokeBackend("get-blocks-with-tags", [tag]) as Block[] || []
          console.log(`[${pluginName}] collectSrsBlocks: 标签 "${tag}" 找到 ${taggedWithSpecific.length} 个块`)
          foundBlocks = [...foundBlocks, ...taggedWithSpecific]
        } catch (e) {
          console.log(`[${pluginName}] collectSrsBlocks: 查询标签 "${tag}" 失败:`, e)
        }
      }
      
      if (foundBlocks.length > 0) {
        tagged = foundBlocks as BlockWithRepr[]
        console.log(`[${pluginName}] collectSrsBlocks: 多标签查询找到 ${tagged.length} 个带 #card 标签的块`)
      } else {
        // 最后备用方案：手动过滤所有块
        tagged = allBlocks.filter(block => {
          if (!block.refs || block.refs.length === 0) {
            return false
          }
          
          const hasCardTag = block.refs.some(ref => {
            if (ref.type !== 2) {
              return false
            }
            const tagAlias = ref.alias || ""
            return tagAlias === "card"  // 只匹配 #card，不支持 #card/xxx
          })
          
          return hasCardTag
        }) as BlockWithRepr[]
        console.log(`[${pluginName}] collectSrsBlocks: 手动过滤找到 ${tagged.length} 个带 #card 标签的块`)
      }
    } catch (error) {
      console.error(`[${pluginName}] collectSrsBlocks 备用方案失败:`, error)
      tagged = []
    }
  }
  
  const stateBlocks = Object.values(orca.state.blocks || {})
    .filter((b): b is BlockWithRepr => !!b && (b as BlockWithRepr)._repr?.type === "srs.card")

  const merged = new Map<DbId, BlockWithRepr>()
  for (const block of [...(tagged || []), ...stateBlocks]) {
    if (!block) continue
    merged.set(block.id, block as BlockWithRepr)
  }
  return Array.from(merged.values())
}

/**
 * 收集所有待复习的卡片
 * @param pluginName - 插件名称（用于日志），可选
 * @returns ReviewCard 数组
 */
export async function collectReviewCards(pluginName: string = "srs-plugin"): Promise<ReviewCard[]> {
  const blocks = await collectSrsBlocks(pluginName)
  const now = new Date()
  const cards: ReviewCard[] = []

  for (const block of blocks) {
    if (!isSrsCardBlock(block)) continue
    const { front, back } = resolveFrontBack(block)
    const hasSrsProps = block.properties?.some(prop => prop.name.startsWith("srs."))
    const srsState = hasSrsProps
      ? await loadCardSrsState(block.id)
      : await writeInitialSrsState(block.id, now)

    // 从标签属性系统读取 deck 名称
    const deckName = extractDeckName(block)

    cards.push({
      id: block.id,
      front,
      back,
      srs: srsState,
      isNew: !srsState.lastReviewed || srsState.reps === 0,
      deck: deckName
    })
  }

  return cards
}

/**
 * 构建复习队列
 * 使用 2:1 策略交错到期卡片和新卡片
 * 
 * @param cards - ReviewCard 数组
 * @returns 排序后的复习队列
 */
export function buildReviewQueue(cards: ReviewCard[]): ReviewCard[] {
  const today = new Date()
  const dueCards = cards.filter(card => !card.isNew && card.srs.due.getTime() <= today.getTime())
  const newCards = cards.filter(card => card.isNew)

  const queue: ReviewCard[] = []
  let dueIndex = 0
  let newIndex = 0

  while (dueIndex < dueCards.length || newIndex < newCards.length) {
    for (let i = 0; i < 2 && dueIndex < dueCards.length; i++) {
      queue.push(dueCards[dueIndex++])
    }
    if (newIndex < newCards.length) {
      queue.push(newCards[newIndex++])
    }
  }

  return queue
}
