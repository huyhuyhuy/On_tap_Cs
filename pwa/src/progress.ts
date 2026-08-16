import type { LessonProgress, ProgressMap } from './types'

const STORAGE_KEY = 'ontap-cs-progress-v1'

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as ProgressMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function saveLessonProgress(key: string, entry: LessonProgress): void {
  const all = loadProgress()
  const prev = all[key]
  const bestTotal = prev ? Math.max(prev.bestTotal, entry.bestTotal) : entry.bestTotal
  const bestCorrect = prev
    ? Math.max(prev.bestCorrect, entry.bestCorrect)
    : entry.bestCorrect
  all[key] = {
    bestCorrect,
    bestTotal,
    completed: Boolean(prev?.completed || entry.completed),
    lastAt: entry.lastAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function topicStats(
  lessonKeys: string[],
  progress: ProgressMap,
): { done: number; total: number } {
  const total = lessonKeys.length
  const done = lessonKeys.filter((key) => progress[key]?.completed).length
  return { done, total }
}
