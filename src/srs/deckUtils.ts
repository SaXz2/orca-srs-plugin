/**
 * Deck 管理工具函数
 * 
 * 提供从块中提取 deck 名称和计算 deck 统计信息的功能
 */

import type { Block } from "../orca.d.ts"
import type { ReviewCard, DeckInfo, DeckStats } from "./types"

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
export function extractDeckName(block: Block): string {
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

  // 处理多选类型（数组）和单选类型（字符串）
  if (Array.isArray(deckValue)) {
    // 多选类型：取数组的第一个值
    if (deckValue.length === 0 || !deckValue[0] || typeof deckValue[0] !== "string") {
      return "Default"
    }
    return deckValue[0].trim()
  } else if (typeof deckValue === "string") {
    // 单选类型：直接使用字符串
    if (deckValue.trim() === "") {
      return "Default"
    }
    return deckValue.trim()
  }

  // 其他类型：无效
  return "Default"
}

/**
 * 计算 deck 统计信息
 * 从 ReviewCard 列表中统计每个 deck 的卡片数量和到期情况
 * 
 * @param cards - ReviewCard 数组
 * @returns DeckStats 统计对象
 */
export function calculateDeckStats(cards: ReviewCard[]): DeckStats {
  const deckMap = new Map<string, DeckInfo>()

  // 遍历所有卡片，统计各 deck 信息
  for (const card of cards) {
    const deckName = card.deck

    if (!deckMap.has(deckName)) {
      deckMap.set(deckName, {
        name: deckName,
        totalCount: 0,
        newCount: 0,
        overdueCount: 0,
        todayCount: 0,
        futureCount: 0
      })
    }

    const deckInfo = deckMap.get(deckName)!
    deckInfo.totalCount++

    if (card.isNew) {
      deckInfo.newCount++
    } else {
      // 判断卡片属于哪个到期类别
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      if (card.srs.due < today) {
        deckInfo.overdueCount++
      } else if (card.srs.due >= today && card.srs.due < tomorrow) {
        deckInfo.todayCount++
      } else {
        deckInfo.futureCount++
      }
    }
  }

  const decks = Array.from(deckMap.values())

  // 排序：Default 在最前，其他按名称排序
  decks.sort((a, b) => {
    if (a.name === "Default" && b.name !== "Default") return -1
    if (a.name !== "Default" && b.name === "Default") return 1
    return a.name.localeCompare(b.name)
  })

  return {
    decks,
    totalCards: cards.length,
    totalNew: cards.filter(c => c.isNew).length,
    totalOverdue: cards.filter(c => {
      if (c.isNew) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return c.srs.due < today
    }).length
  }
}
