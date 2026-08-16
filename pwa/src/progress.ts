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

export function saveLessonProgress(
  key: string,
  entry: LessonProgress,
  mode: 'full' | 'retry' = 'full',
): void {
  const all = loadProgress()
  const prev = all[key]
  let bestCorrect = prev?.bestCorrect ?? 0
  let bestTotal = prev?.bestTotal ?? 0

  if (mode === 'full') {
    if (!prev?.bestTotal || isBetterFullScore(entry, prev)) {
      bestCorrect = entry.bestCorrect
      bestTotal = entry.bestTotal
    }
  }

  all[key] = {
    bestCorrect,
    bestTotal,
    completed: Boolean(prev?.completed || entry.completed),
    lastAt: entry.lastAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

function isBetterFullScore(entry: LessonProgress, prev: LessonProgress): boolean {
  const next = entry.bestTotal ? entry.bestCorrect / entry.bestTotal : 0
  const old = prev.bestTotal ? prev.bestCorrect / prev.bestTotal : 0
  if (next !== old) return next > old
  return entry.bestCorrect > prev.bestCorrect
}

export function topicStats(
  lessonKeys: string[],
  progress: ProgressMap,
): { done: number; total: number } {
  const total = lessonKeys.length
  const done = lessonKeys.filter((key) => progress[key]?.completed).length
  return { done, total }
}
