import type { Catalog, LessonFile } from './types'

const BASE = `${import.meta.env.BASE_URL}data`.replace(/\/+$/, '')

export function lessonKey(topicId: string, lessonId: string): string {
  return `${topicId}/${lessonId}`
}

async function fetchJson<T>(url: string, failMessage: string): Promise<T> {
  const res = await fetch(url)
  const text = await res.text()
  if (!res.ok || text.trimStart().startsWith('<')) {
    throw new Error(failMessage)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(failMessage)
  }
}

export async function loadCatalog(): Promise<Catalog> {
  return fetchJson<Catalog>(`${BASE}/index.json`, 'Không tải được danh mục bài.')
}

export async function loadLesson(path: string): Promise<LessonFile> {
  const encoded = path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')
  return fetchJson<LessonFile>(`${BASE}/${encoded}`, 'Không tải được bài học.')
}

export function displayTitle(raw: string): string {
  return raw
    .replace(/^C# (Multiple Choice Questions|Questions? & Answers?)\s*[–-]\s*/i, '')
    .replace(/\s*[–-]\s*Sanfoundry$/i, '')
    .trim()
}
