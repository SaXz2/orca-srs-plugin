/**
 * 卡片浏览器管理模块
 * 
 * 提供卡片浏览器的打开和关闭功能
 */

import SrsCardBrowser from "../components/SrsCardBrowser"

// 用于存储当前显示的卡片浏览器组件的容器和 root
let cardBrowserContainer: HTMLDivElement | null = null
let cardBrowserRoot: any = null

/**
 * 打开卡片浏览器
 * 如果浏览器已打开，会先关闭再重新打开
 * 
 * @param pluginName - 插件名称（用于日志）
 */
export function openCardBrowser(pluginName: string) {
  // 如果浏览器已经打开，先关闭
  if (cardBrowserContainer) {
    closeCardBrowser(pluginName)
  }

  // 创建容器
  cardBrowserContainer = document.createElement("div")
  cardBrowserContainer.id = "srs-card-browser-container"
  document.body.appendChild(cardBrowserContainer)

  // 使用 React 18 的 createRoot API 渲染组件
  const React = window.React
  const { createRoot } = window
  cardBrowserRoot = createRoot(cardBrowserContainer)

  cardBrowserRoot.render(
    React.createElement(SrsCardBrowser, {
      onClose: () => {
        console.log(`[${pluginName}] 用户关闭卡片浏览器`)
        closeCardBrowser(pluginName)
      }
    })
  )

  console.log(`[${pluginName}] 卡片浏览器已打开`)
}

/**
 * 关闭卡片浏览器
 * 
 * @param pluginName - 插件名称（用于日志）
 */
export function closeCardBrowser(pluginName: string) {
  if (cardBrowserRoot) {
    cardBrowserRoot.unmount()
    cardBrowserRoot = null
  }

  if (cardBrowserContainer) {
    cardBrowserContainer.remove()
    cardBrowserContainer = null
  }

  console.log(`[${pluginName}] 卡片浏览器已关闭`)
}
