import type { Catalog, LessonFile } from './types'

const BASE = `${import.meta.env.BASE_URL}data`

export function lessonKey(topicId: string, lessonId: string): string {
  return `${topicId}/${lessonId}`
}

export async function loadCatalog(): Promise<Catalog> {
  const res = await fetch(`${BASE}/index.json`)
  if (!res.ok) throw new Error('Không tải được danh mục bài.')
  return res.json()
}

export async function loadLesson(path: string): Promise<LessonFile> {
  const encoded = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  const res = await fetch(`${BASE}/${encoded}`)
  if (!res.ok) throw new Error('Không tải được bài học.')
  return res.json()
}

export function displayTitle(raw: string): string {
  return raw
    .replace(/^C# (Multiple Choice Questions|Questions? & Answers?)\s*[–-]\s*/i, '')
    .replace(/\s*[–-]\s*Sanfoundry$/i, '')
    .trim()
}
