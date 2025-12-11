/**
 * 复习快捷键 Hook
 *
 * 为 SRS 复习界面提供键盘快捷键支持（与 Anki 一致）：
 * - 空格：显示答案
 * - 1：again（忘记）
 * - 2：hard（困难）
 * - 3：good（良好）
 * - 4：easy（简单）
 */

import type { Grade } from "../srs/types"

const { useEffect, useCallback } = window.React

/**
 * 快捷键配置
 */
const SHORTCUTS: Record<string, Grade | "showAnswer"> = {
  " ": "showAnswer",  // 空格显示答案
  "1": "again",       // 忘记
  "2": "hard",        // 困难
  "3": "good",        // 良好
  "4": "easy",        // 简单
}

type UseReviewShortcutsOptions = {
  /** 答案是否已显示 */
  showAnswer: boolean
  /** 是否正在评分中（防止重复触发） */
  isGrading: boolean
  /** 显示答案的回调 */
  onShowAnswer: () => void
  /** 评分回调 */
  onGrade: (grade: Grade) => void
  /** 是否启用快捷键（默认 true） */
  enabled?: boolean
}

/**
 * 使用复习快捷键
 *
 * @param options - 快捷键配置选项
 *
 * @example
 * ```tsx
 * useReviewShortcuts({
 *   showAnswer,
 *   isGrading,
 *   onShowAnswer: () => setShowAnswer(true),
 *   onGrade: handleGrade,
 * })
 * ```
 */
export function useReviewShortcuts({
  showAnswer,
  isGrading,
  onShowAnswer,
  onGrade,
  enabled = true,
}: UseReviewShortcutsOptions): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 如果快捷键被禁用，直接返回
      if (!enabled) return

      // 忽略来自输入框的按键事件
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      const action = SHORTCUTS[event.key]
      if (!action) return

      // 阻止默认行为（如空格滚动页面）
      event.preventDefault()
      event.stopPropagation()

      if (action === "showAnswer") {
        // 空格键：显示答案（仅在答案未显示时有效）
        if (!showAnswer && !isGrading) {
          onShowAnswer()
        }
      } else {
        // 数字键 1-4：评分（仅在答案已显示且未在评分中时有效）
        if (showAnswer && !isGrading) {
          onGrade(action)
        }
      }
    },
    [showAnswer, isGrading, onShowAnswer, onGrade, enabled]
  )

  useEffect(() => {
    if (!enabled) return

    // 添加全局键盘事件监听
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [handleKeyDown, enabled])
}

export default useReviewShortcuts
