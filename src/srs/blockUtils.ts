/**
 * 块处理工具函数
 * 
 * 提供 Orca 块对象的类型判断、文本提取和内容解析功能
 */

import type { Block, Repr } from "../orca.d.ts"

/**
 * 扩展 Block 类型以包含 _repr 属性（运行时存在但类型定义中缺失）
 */
export type BlockWithRepr = Block & { _repr?: Repr }

/**
 * 去除文本中的 # 标签，用于展示时的视觉过滤
 * @param text - 原始文本
 * @returns 去除标签后的文本
 */
export function removeHashTags(text: string): string {
  if (!text) return text
  return text.replace(/#[\w/\u4e00-\u9fa5]+/g, "").trim()
}

/**
 * 判断块是否为 SRS 卡片块
 * @param block - 块对象
 * @returns 是否为 SRS 卡片
 */
export function isSrsCardBlock(block: BlockWithRepr): boolean {
  return (
    block._repr?.type === "srs.card" ||
    block.properties?.some(prop => prop.name === "srs.isCard")
  )
}

/**
 * 获取块的第一个子块的文本内容
 * @param block - 父块对象
 * @returns 子块文本，如果不存在则返回默认值
 */
export function getFirstChildText(block: BlockWithRepr): string {
  if (!block?.children || block.children.length === 0) return "（无答案）"
  const firstChildId = block.children[0]
  const firstChild = orca.state.blocks?.[firstChildId] as BlockWithRepr | undefined
  return firstChild?.text || "（无答案）"
}

/**
 * 解析块的正反面内容（题目和答案）
 * @param block - 块对象
 * @returns 包含 front（题目）和 back（答案）的对象
 */
export function resolveFrontBack(block: BlockWithRepr): { front: string; back: string } {
  const frontRaw = block._repr?.front ?? block.text ?? "（无题目）"
  const backRaw = block._repr?.back ?? getFirstChildText(block)
  const front = removeHashTags(frontRaw)
  const back = removeHashTags(backRaw)
  return { front, back }
}
