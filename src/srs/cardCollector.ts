/**
 * 卡片收集模块
 * 
 * 提供 SRS 卡片的收集、过滤和复习队列构建功能
 */

import type { Block, DbId } from "../orca.d.ts"
import type { ReviewCard } from "./types"
import { BlockWithRepr, isSrsCardBlock, resolveFrontBack } from "./blockUtils"
import { extractDeckName, extractCardType } from "./deckUtils"
import { loadCardSrsState, writeInitialSrsState, loadClozeSrsState, writeInitialClozeSrsState } from "./storage"
import { getAllClozeNumbers } from "./clozeUtils"

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
    .filter((b): b is BlockWithRepr => {
      if (!b) return false
      const reprType = (b as BlockWithRepr)._repr?.type
      // 支持两种卡片类型：basic 和 cloze
      return reprType === "srs.card" || reprType === "srs.cloze-card"
    })

  const merged = new Map<DbId, BlockWithRepr>()
  for (const block of [...(tagged || []), ...stateBlocks]) {
    if (!block) continue
    merged.set(block.id, block as BlockWithRepr)
  }
  return Array.from(merged.values())
}

/**
 * 收集所有待复习的卡片
 *
 * 对于 Cloze 卡片，为每个填空编号生成独立的 ReviewCard
 *
 * @param pluginName - 插件名称（用于日志），可选
 * @returns ReviewCard 数组
 */
export async function collectReviewCards(pluginName: string = "srs-plugin"): Promise<ReviewCard[]> {
  const blocks = await collectSrsBlocks(pluginName)
  const now = new Date()
  const cards: ReviewCard[] = []

  for (const block of blocks) {
    if (!isSrsCardBlock(block)) continue

    // 识别卡片类型
    const cardType = extractCardType(block)
    const deckName = extractDeckName(block)

    if (cardType === "cloze") {
      // Cloze 卡片：为每个填空编号生成独立的 ReviewCard
      const clozeNumbers = getAllClozeNumbers(block.content, pluginName)

      if (clozeNumbers.length === 0) {
        console.warn(`[${pluginName}] Cloze 卡片 #${block.id} 没有找到任何填空，跳过`)
        continue
      }

      for (const clozeNumber of clozeNumbers) {
        // 检查是否已有该填空的 SRS 属性
        const hasClozeSrsProps = block.properties?.some(
          prop => prop.name.startsWith(`srs.c${clozeNumber}.`)
        )

        const srsState = hasClozeSrsProps
          ? await loadClozeSrsState(block.id, clozeNumber)
          : await writeInitialClozeSrsState(block.id, clozeNumber, clozeNumber - 1)

        // front 使用块文本（将在渲染时隐藏对应填空）
        const front = block.text || ""

        cards.push({
          id: block.id,
          front,
          back: `（填空 c${clozeNumber}）`, // 填空卡不需要独立的 back
          srs: srsState,
          isNew: !srsState.lastReviewed || srsState.reps === 0,
          deck: deckName,
          clozeNumber // 关键：标记当前复习的填空编号
        })
      }
    } else {
      // Basic 卡片：传统的正面/反面模式
      const { front, back } = resolveFrontBack(block)
      const hasSrsProps = block.properties?.some(prop => prop.name.startsWith("srs."))
      const srsState = hasSrsProps
        ? await loadCardSrsState(block.id)
        : await writeInitialSrsState(block.id, now)

      cards.push({
        id: block.id,
        front,
        back,
        srs: srsState,
        isNew: !srsState.lastReviewed || srsState.reps === 0,
        deck: deckName
        // clozeNumber 为 undefined（非 cloze 卡片）
      })
    }
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
