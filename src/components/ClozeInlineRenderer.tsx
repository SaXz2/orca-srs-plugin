/**
 * Cloze 填空 Inline 渲染器
 *
 * 用于在编辑器中渲染 {cN:: 文本} 格式的填空标记
 * - 隐藏 {cN::} 符号
 * - 填空文本呈现浅灰色
 * - 底部显示蓝色下划线
 */

import type { ContentFragment } from "../orca.d.ts"

const { useRef } = window.React

interface ClozeInlineRendererProps {
  blockId: string
  data: ContentFragment
  index: number
}

/**
 * Cloze Inline 渲染器组件
 *
 * 接收的 data 格式：
 * {
 *   t: "插件名.cloze",
 *   v: "填空内容",
 *   clozeNumber: 1
 * }
 */
export default function ClozeInlineRenderer({
  blockId,
  data,
  index,
}: ClozeInlineRendererProps) {
  const ref = useRef<HTMLSpanElement>(null)

  // 从 data 中提取填空内容和编号
  const clozeText = data.v || ""
  const clozeNumber = (data as any).clozeNumber || 1

  return (
    <span
      ref={ref}
      className="orca-inline srs-cloze-inline"
      data-cloze-number={clozeNumber}
      style={{
        color: "#999", // 浅灰色
        borderBottom: "2px solid #4a90e2", // 蓝色下划线
        paddingBottom: "1px",
        cursor: "text"
      }}
      title={`Cloze ${clozeNumber}`}
    >
      {clozeText}
    </span>
  )
}
