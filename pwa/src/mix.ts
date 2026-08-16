import { displayTitle, loadLesson } from './data'
import { loadStats, parseStatKey, stillWrong } from './stats'
import type { Catalog, MixItem, MixMode } from './types'

function shuffle<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const a = next[i]
    const b = next[j]
    if (a === undefined || b === undefined) continue
    next[i] = b
    next[j] = a
  }
  return next
}

function mixSize(maxAvailable: number): number {
  if (maxAvailable <= 0) return 0
  const want = 10 + Math.floor(Math.random() * 6)
  return Math.min(want, maxAvailable)
}

export async function buildMix(catalog: Catalog, mode: MixMode): Promise<MixItem[]> {
  if (mode === 'review') return buildReviewMix(catalog)
  return buildRandomMix(catalog)
}

async function buildRandomMix(catalog: Catalog): Promise<MixItem[]> {
  const slots = catalog.topics.flatMap((topic) =>
    topic.lessons.map((lesson) => ({ topic, lesson })),
  )
  const picked = shuffle(slots).slice(0, mixSize(slots.length))
  const files = await Promise.all(picked.map((slot) => loadLesson(slot.lesson.path)))
  return picked.map((slot, index) => {
    const questions = files[index]?.questions ?? []
    const question = questions[Math.floor(Math.random() * questions.length)]
    if (!question) {
      throw new Error('Không lấy được câu hỏi.')
    }
    return {
      topicId: slot.topic.id,
      lessonId: slot.lesson.id,
      path: slot.lesson.path,
      topicTitle: slot.topic.title,
      lessonTitle: displayTitle(slot.lesson.title),
      question,
    }
  })
}

async function buildReviewMix(catalog: Catalog): Promise<MixItem[]> {
  const stats = loadStats()
  const refs = Object.entries(stats)
    .filter(([, stat]) => stillWrong(stat))
    .map(([key]) => parseStatKey(key))
    .filter((ref): ref is NonNullable<typeof ref> => ref !== null)
  const picked = shuffle(refs).slice(0, mixSize(refs.length))
  if (!picked.length) return []

  const paths = new Map<string, string>()
  const titles = new Map<string, { topicTitle: string; lessonTitle: string }>()
  for (const topic of catalog.topics) {
    for (const lesson of topic.lessons) {
      const id = `${topic.id}/${lesson.id}`
      paths.set(id, lesson.path)
      titles.set(id, {
        topicTitle: topic.title,
        lessonTitle: displayTitle(lesson.title),
      })
    }
  }

  const uniquePaths = [
    ...new Set(
      picked
        .map((ref) => paths.get(`${ref.topicId}/${ref.lessonId}`))
        .filter((path): path is string => Boolean(path)),
    ),
  ]
  const files = await Promise.all(uniquePaths.map((path) => loadLesson(path)))
  const byPath = new Map(uniquePaths.map((path, index) => [path, files[index]]))

  const items: MixItem[] = []
  for (const ref of picked) {
    const id = `${ref.topicId}/${ref.lessonId}`
    const path = paths.get(id)
    const meta = titles.get(id)
    if (!path || !meta) continue
    const question = byPath.get(path)?.questions.find((q) => q.number === ref.number)
    if (!question) continue
    items.push({
      topicId: ref.topicId,
      lessonId: ref.lessonId,
      path,
      topicTitle: meta.topicTitle,
      lessonTitle: meta.lessonTitle,
      question,
    })
  }
  return items
}
