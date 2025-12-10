import type { DbId } from "../orca.d.ts"

/**
 * Flashcard Home 块管理器
 * 负责创建、复用和清理 Flashcard Home 特殊块
 */

let flashcardHomeBlockId: DbId | null = null
const STORAGE_KEY = "flashcardHomeBlockId"

/**
 * 获取或创建 Flashcard Home 块
 */
export async function getOrCreateFlashcardHomeBlock(pluginName: string): Promise<DbId> {
  if (flashcardHomeBlockId) {
    const existing = await resolveBlock(flashcardHomeBlockId)
    if (existing) return flashcardHomeBlockId
  }

  const storedId = await orca.plugins.getData(pluginName, STORAGE_KEY)
  if (typeof storedId === "number") {
    const existing = await resolveBlock(storedId)
    if (existing) {
      flashcardHomeBlockId = storedId
      return storedId
    }
  }

  const newId = await createFlashcardHomeBlock(pluginName)
  await orca.plugins.setData(pluginName, STORAGE_KEY, newId)
  flashcardHomeBlockId = newId
  return newId
}

/**
 * 创建 Flashcard Home 块
 */
async function createFlashcardHomeBlock(pluginName: string): Promise<DbId> {
  const blockId = await orca.commands.invokeEditorCommand(
    "core.editor.insertBlock",
    null,
    null,
    null,
    [{ t: "t", v: `[Flashcard Home - ${pluginName}]` }],
    { type: "srs.flashcard-home" }
  ) as DbId

  await orca.commands.invokeEditorCommand(
    "core.editor.setProperties",
    null,
    [blockId],
    [
      { name: "srs.isFlashcardHomeBlock", value: true, type: 4 },
      { name: "srs.pluginName", value: pluginName, type: 2 }
    ]
  )

  const block = orca.state.blocks?.[blockId] as any
  if (block) {
    block._repr = {
      type: "srs.flashcard-home"
    }
  }

  console.log(`[${pluginName}] 创建 Flashcard Home 块: #${blockId}`)
  return blockId
}

/**
 * 清理 Flashcard Home 块记录
 */
export async function cleanupFlashcardHomeBlock(pluginName: string): Promise<void> {
  if (flashcardHomeBlockId) {
    const block = orca.state.blocks?.[flashcardHomeBlockId] as any
    if (block && block._repr?.type === "srs.flashcard-home") {
      delete block._repr
    }
    flashcardHomeBlockId = null
  }

  await orca.plugins.removeData(pluginName, STORAGE_KEY)
}

async function resolveBlock(blockId: DbId) {
  const fromState = orca.state.blocks?.[blockId]
  if (fromState) return fromState
  try {
    const fetched = await orca.invokeBackend("get-block", blockId)
    return fetched
  } catch (error) {
    console.warn("[srs] 无法从后端获取 Flashcard Home 块:", error)
    return null
  }
}
