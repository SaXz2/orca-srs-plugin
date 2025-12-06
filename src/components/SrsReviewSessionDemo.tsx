/**
 * SRS 复习会话演示组件
 *
 * 功能：
 * - 维护一组假数据卡片
 * - 依次显示每张卡片（复用 SrsCardDemo）
 * - 用户评分后自动切换到下一张
 * - 所有卡片复习完毕后显示结束界面
 */

// 从全局 window 对象获取 React（Orca 插件约定）
const { useState } = window.React
const { Button, ModalOverlay } = orca.components

// 导入单卡组件
import SrsCardDemo from "./SrsCardDemo"

// 卡片数据类型
type Card = {
  id: number
  front: string
  back: string
}

// 组件 Props 类型定义
type SrsReviewSessionDemoProps = {
  onClose?: () => void  // 关闭回调
}

/**
 * 假数据：演示用的卡片列表
 */
const demoCards: Card[] = [
  {
    id: 1,
    front: "What is quantum entanglement?",
    back: "Quantum entanglement is a physical phenomenon where pairs or groups of particles are generated or interact in ways such that the quantum state of each particle cannot be described independently of the state of the others, even when separated by large distances."
  },
  {
    id: 2,
    front: "What is superposition?",
    back: "Superposition is the ability of a quantum system to be in multiple states at the same time until it is measured. For example, Schrödinger's cat is in a superposition of both alive and dead states until observed."
  },
  {
    id: 3,
    front: "什么是时间复杂度？",
    back: "时间复杂度是算法执行所需时间与输入数据规模之间的关系，通常用大O表示法描述。例如 O(n) 表示线性时间，O(log n) 表示对数时间。"
  },
  {
    id: 4,
    front: "什么是闭包（Closure）？",
    back: "闭包是指一个函数能够访问其外部作用域中的变量，即使外部函数已经执行完毕。闭包常用于数据封装和创建私有变量。"
  },
  {
    id: 5,
    front: "What is the difference between let and const in JavaScript?",
    back: "'let' declares a variable that can be reassigned, while 'const' declares a constant reference that cannot be reassigned. However, for objects and arrays declared with const, their contents can still be modified."
  }
]

export default function SrsReviewSessionDemo({
  onClose
}: SrsReviewSessionDemoProps) {
  // 状态：当前卡片索引（从 0 开始）
  const [currentIndex, setCurrentIndex] = useState(0)

  // 状态：已完成的卡片数量（用于统计）
  const [reviewedCount, setReviewedCount] = useState(0)

  // 计算总卡片数
  const totalCards = demoCards.length

  // 获取当前卡片
  const currentCard = demoCards[currentIndex]

  // 判断是否已完成所有卡片
  const isSessionComplete = currentIndex >= totalCards

  /**
   * 处理用户对当前卡片的评分
   * @param grade 评分等级
   */
  const handleGrade = (grade: "again" | "hard" | "good" | "easy") => {
    // 打印日志：卡片 id + 评分
    console.log(`[SRS Review Session] 卡片 #${currentCard.id} 评分: ${grade}`)

    // 增加已复习计数
    setReviewedCount((prev: number) => prev + 1)

    // 切换到下一张卡片
    setTimeout(() => {
      setCurrentIndex((prev: number) => prev + 1)
    }, 300) // 延迟 300ms，让用户看到评分反馈
  }

  /**
   * 处理复习会话结束后的操作
   */
  const handleFinishSession = () => {
    console.log(`[SRS Review Session] 本次复习会话结束，共复习 ${reviewedCount} 张卡片`)

    // 显示通知
    orca.notify(
      "success",
      `本次复习完成！共复习了 ${reviewedCount} 张卡片`,
      { title: "SRS 复习会话" }
    )

    // 关闭会话
    if (onClose) {
      onClose()
    }
  }

  // ========================================
  // 渲染：复习结束界面
  // ========================================
  if (isSessionComplete) {
    return (
      <ModalOverlay
        visible={true}
        canClose={true}
        onClose={onClose}
        className="srs-session-complete-modal"
      >
        <div className="srs-session-complete-container" style={{
          backgroundColor: 'var(--orca-color-bg-1)',
          borderRadius: '12px',
          padding: '48px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          textAlign: 'center'
        }}>
          {/* 完成图标 */}
          <div style={{
            fontSize: '64px',
            marginBottom: '24px'
          }}>
            🎉
          </div>

          {/* 标题 */}
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: 'var(--orca-color-text-1)',
            marginBottom: '16px'
          }}>
            本次复习结束！
          </h2>

          {/* 统计信息 */}
          <div style={{
            fontSize: '16px',
            color: 'var(--orca-color-text-2)',
            marginBottom: '32px',
            lineHeight: '1.6'
          }}>
            <p>共复习了 <strong style={{ color: 'var(--orca-color-primary-5)' }}>{reviewedCount}</strong> 张卡片</p>
            <p style={{ marginTop: '8px' }}>坚持复习，持续进步！</p>
          </div>

          {/* 完成按钮 */}
          <Button
            variant="solid"
            onClick={handleFinishSession}
            style={{
              padding: '12px 32px',
              fontSize: '16px'
            }}
          >
            完成
          </Button>
        </div>
      </ModalOverlay>
    )
  }

  // ========================================
  // 渲染：正在进行的复习会话
  // ========================================
  return (
    <div className="srs-review-session">
      {/* 复习进度条 */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        backgroundColor: 'var(--orca-color-bg-2)',
        zIndex: 10000
      }}>
        <div style={{
          height: '100%',
          width: `${(currentIndex / totalCards) * 100}%`,
          backgroundColor: 'var(--orca-color-primary-5)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* 进度文字提示 */}
      <div style={{
        position: 'fixed',
        top: '12px',
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 16px',
        backgroundColor: 'var(--orca-color-bg-1)',
        borderRadius: '20px',
        fontSize: '14px',
        color: 'var(--orca-color-text-2)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 10001
      }}>
        卡片 {currentIndex + 1} / {totalCards}
      </div>

      {/* 当前卡片（复用 SrsCardDemo 组件） */}
      <SrsCardDemo
        front={currentCard.front}
        back={currentCard.back}
        onGrade={handleGrade}
        onClose={onClose}
      />
    </div>
  )
}
