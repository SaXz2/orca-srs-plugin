/**
 * 方向卡复习渲染器
 *
 * 功能：
 * - 根据复习方向显示问题和答案
 * - 正向：左边是问题，右边是答案
 * - 反向：右边是问题，左边是答案
 */

const { useState, useMemo } = window.React
const { useSnapshot } = window.Valtio
const { Button } = orca.components

import type { DbId } from "../orca.d.ts"
import type { Grade, SrsState } from "../srs/types"
import { extractDirectionInfo } from "../srs/directionUtils"
import { useReviewShortcuts } from "../hooks/useReviewShortcuts"
import { previewIntervals, formatInterval } from "../srs/algorithm"

interface DirectionCardReviewRendererProps {
  blockId: DbId
  onGrade: (grade: Grade) => Promise<void> | void
  onBury?: () => void
  onSuspend?: () => void
  onClose?: () => void
  srsInfo?: Partial<SrsState>
  isGrading?: boolean
  onJumpToCard?: (blockId: DbId) => void
  inSidePanel?: boolean
  panelId?: string
  pluginName: string
  reviewDirection: "forward" | "backward" // 当前复习的方向
}

export default function DirectionCardReviewRenderer({
  blockId,
  onGrade,
  onBury,
  onSuspend,
  onClose,
  srsInfo,
  isGrading = false,
  onJumpToCard,
  inSidePanel = false,
  panelId,
  pluginName,
  reviewDirection,
}: DirectionCardReviewRendererProps) {
  const [showAnswer, setShowAnswer] = useState(false)

  const snapshot = useSnapshot(orca.state)
  const block = useMemo(() => {
    return snapshot?.blocks?.[blockId]
  }, [snapshot?.blocks, blockId])

  // 解析方向卡内容
  const dirInfo = useMemo(() => {
    return extractDirectionInfo(block?.content, pluginName)
  }, [block?.content, pluginName])

  // 处理评分
  const handleGrade = async (grade: Grade) => {
    if (isGrading) return
    await onGrade(grade)
    setShowAnswer(false)
  }

  // 快捷键支持（空格显示答案，1-4 评分，b 埋藏，s 暂停）
  useReviewShortcuts({
    showAnswer,
    isGrading,
    onShowAnswer: () => setShowAnswer(true),
    onGrade: handleGrade,
    onBury,
    onSuspend,
  })

  // 预览间隔
  const intervals = useMemo(() => {
    const fullState: SrsState | null = srsInfo
      ? {
          stability: srsInfo.stability ?? 0,
          difficulty: srsInfo.difficulty ?? 0,
          interval: srsInfo.interval ?? 0,
          due: srsInfo.due ?? new Date(),
          lastReviewed: srsInfo.lastReviewed ?? null,
          reps: srsInfo.reps ?? 0,
          lapses: srsInfo.lapses ?? 0,
          state: srsInfo.state,
        }
      : null
    return previewIntervals(fullState)
  }, [srsInfo])

  if (!dirInfo) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        无法解析方向卡内容
      </div>
    )
  }

  // 根据复习方向决定问题和答案
  const question =
    reviewDirection === "forward" ? dirInfo.leftText : dirInfo.rightText
  const answer =
    reviewDirection === "forward" ? dirInfo.rightText : dirInfo.leftText

  const arrowIcon =
    reviewDirection === "forward" ? "ti-arrow-right" : "ti-arrow-left"
  const dirLabel = reviewDirection === "forward" ? "正向" : "反向"
  const dirColor = reviewDirection === "forward" 
    ? "var(--orca-color-primary-5)" 
    : "var(--orca-color-warning-5)"
  const dirBgColor = reviewDirection === "forward"
    ? "var(--orca-color-primary-1)"
    : "var(--orca-color-warning-1)"

  return (
    <div
      className="srs-direction-card-container"
      style={{
        backgroundColor: "var(--orca-color-bg-1)",
        borderRadius: "12px",
        padding: "16px",
        width: inSidePanel ? "100%" : "90%",
        minWidth: inSidePanel ? "0" : "600px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      }}
    >
      {/* 卡片类型标识 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: "500",
            color: dirColor,
            backgroundColor: dirBgColor,
            padding: "4px 10px",
            borderRadius: "6px",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <i className={`ti ${arrowIcon}`} />
          方向卡 ({dirLabel})
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {onBury && (
            <Button
              variant="soft"
              onClick={onBury}
              title="埋藏到明天 (B)"
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i className="ti ti-calendar-pause" />
              埋藏
            </Button>
          )}
          {onSuspend && (
            <Button
              variant="soft"
              onClick={onSuspend}
              title="暂停卡片 (S)"
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i className="ti ti-player-pause" />
              暂停
            </Button>
          )}
          {blockId && onJumpToCard && (
            <Button
              variant="soft"
              onClick={() => onJumpToCard(blockId)}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <i className="ti ti-arrow-right" />
              跳转到卡片
            </Button>
          )}
        </div>
      </div>

      {/* 题目区域 */}
      <div
        className="srs-direction-question"
        style={{
          marginBottom: "16px",
          padding: "20px",
          backgroundColor: "var(--orca-color-bg-2)",
          borderRadius: "8px",
          minHeight: "100px",
          fontSize: "18px",
          lineHeight: "1.8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
        }}
      >
        {reviewDirection === "forward" ? (
          <>
            <span style={{ fontWeight: 500 }}>{question}</span>
            <i
              className={`ti ${arrowIcon}`}
              style={{
                fontSize: "20px",
                color: dirColor,
              }}
            />
            {showAnswer ? (
              <span
                style={{
                  fontWeight: 600,
                  color: dirColor,
                  backgroundColor: dirBgColor,
                  padding: "4px 12px",
                  borderRadius: "6px",
                }}
              >
                {answer}
              </span>
            ) : (
              <span
                style={{
                  color: "var(--orca-color-text-2)",
                  backgroundColor: "var(--orca-color-bg-3)",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px dashed var(--orca-color-border-1)",
                }}
              >
                ❓
              </span>
            )}
          </>
        ) : (
          <>
            {showAnswer ? (
              <span
                style={{
                  fontWeight: 600,
                  color: dirColor,
                  backgroundColor: dirBgColor,
                  padding: "4px 12px",
                  borderRadius: "6px",
                }}
              >
                {answer}
              </span>
            ) : (
              <span
                style={{
                  color: "var(--orca-color-text-2)",
                  backgroundColor: "var(--orca-color-bg-3)",
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "1px dashed var(--orca-color-border-1)",
                }}
              >
                ❓
              </span>
            )}
            <i
              className={`ti ${arrowIcon}`}
              style={{
                fontSize: "20px",
                color: dirColor,
              }}
            />
            <span style={{ fontWeight: 500 }}>{question}</span>
          </>
        )}
      </div>

      {/* 显示答案 / 评分按钮 */}
      {!showAnswer ? (
        <div style={{ textAlign: "center", marginBottom: "12px" }}>
          <Button
            variant="solid"
            onClick={() => setShowAnswer(true)}
            style={{
              padding: "12px 32px",
              fontSize: "16px",
            }}
          >
            显示答案
          </Button>
        </div>
      ) : (
        <div
          className="srs-card-grade-buttons"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "8px",
            marginTop: "16px",
          }}
        >
          <Button
            variant="dangerous"
            onClick={() => handleGrade("again")}
            style={{
              padding: "12px 8px",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {formatInterval(intervals.again)}
            </span>
            <span style={{ fontSize: "12px", opacity: 0.8 }}>忘记</span>
          </Button>

          <Button
            variant="soft"
            onClick={() => handleGrade("hard")}
            style={{
              padding: "12px 8px",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {formatInterval(intervals.hard)}
            </span>
            <span style={{ fontSize: "12px", opacity: 0.8 }}>困难</span>
          </Button>

          <Button
            variant="solid"
            onClick={() => handleGrade("good")}
            style={{
              padding: "12px 8px",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {formatInterval(intervals.good)}
            </span>
            <span style={{ fontSize: "12px", opacity: 0.8 }}>良好</span>
          </Button>

          <Button
            variant="solid"
            onClick={() => handleGrade("easy")}
            style={{
              padding: "12px 8px",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              backgroundColor: "var(--orca-color-primary-5)",
              opacity: 0.9,
            }}
          >
            <span style={{ fontWeight: 600 }}>
              {formatInterval(intervals.easy)}
            </span>
            <span style={{ fontSize: "12px", opacity: 0.8 }}>简单</span>
          </Button>
        </div>
      )}

      {/* 提示文本 */}
      <div
        style={{
          marginTop: "16px",
          textAlign: "center",
          fontSize: "12px",
          color: "var(--orca-color-text-2)",
          opacity: 0.7,
        }}
      >
        {!showAnswer ? '点击"显示答案"查看内容' : "根据记忆程度选择评分"}
      </div>
    </div>
  )
}
