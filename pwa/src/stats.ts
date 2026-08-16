import type { QuestionStat, StatRollup, StatsMap } from './types'

const STORAGE_KEY = 'ontap-cs-stats-v1'

const EMPTY_STAT: QuestionStat = {
  seen: 0,
  wrong: 0,
  lastCorrect: true,
}

export function questionStatKey(
  topicId: string,
  lessonId: string,
  number: number,
): string {
  return `${topicId}/${lessonId}/${number}`
}

export function emptyStat(): QuestionStat {
  return { ...EMPTY_STAT }
}

export function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StatsMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveStats(all: StatsMap): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function recordAttempt(
  topicId: string,
  lessonId: string,
  number: number,
  correct: boolean,
): void {
  const all = loadStats()
  const key = questionStatKey(topicId, lessonId, number)
  const prev = all[key] ?? emptyStat()
  all[key] = {
    seen: prev.seen + 1,
    wrong: prev.wrong + (correct ? 0 : 1),
    lastCorrect: correct,
  }
  saveStats(all)
}

export function parseStatKey(
  key: string,
): { topicId: string; lessonId: string; number: number } | null {
  const parts = key.split('/')
  if (parts.length !== 3) return null
  const number = Number(parts[2])
  if (!Number.isInteger(number)) return null
  return { topicId: parts[0], lessonId: parts[1], number }
}

export function stillWrong(stat: QuestionStat): boolean {
  if (!stat.seen) return false
  if (typeof stat.lastCorrect === 'boolean') return !stat.lastCorrect
  return stat.wrong > 0
}

export function rollupPrefix(stats: StatsMap, prefix: string): StatRollup {
  let seen = 0
  let wrong = 0
  let touched = 0
  let needReview = 0
  for (const [key, value] of Object.entries(stats)) {
    if (!key.startsWith(prefix)) continue
    seen += value.seen
    wrong += value.wrong
    touched += 1
    if (stillWrong(value)) needReview += 1
  }
  return { seen, wrong, touched, needReview }
}

export function formatReview(rollup: StatRollup): string {
  if (!rollup.touched) return 'chưa làm'
  return `${rollup.needReview} câu cần ôn`
}

export function formatTopicStat(
  done: number,
  total: number,
  rollup: StatRollup,
): string {
  const bits: string[] = []
  if (done > 0) bits.push(`đã xong ${done}/${total}`)
  if (rollup.touched) bits.push(formatReview(rollup))
  else if (done === 0) bits.push('chưa làm')
  return bits.join(' · ')
}

export function formatLessonStat(completed: boolean, rollup: StatRollup): string {
  const bits: string[] = []
  if (completed) bits.push('đã làm')
  if (rollup.touched) bits.push(formatReview(rollup))
  else if (!completed) bits.push('chưa làm')
  return bits.join(' · ')
}

export function combinedTone(
  done: number,
  total: number,
  rollup: StatRollup,
): string {
  if (rollup.touched) return reviewTone(rollup)
  if (done > 0 && done === total) return 'tone-ok'
  if (done > 0) return 'tone-warn'
  return ''
}

export function formatQuestionStat(stat: QuestionStat): string {
  if (!stat.seen) return 'chưa làm'
  if (stillWrong(stat)) {
    return stat.wrong === 1 ? 'sai 1 lần' : `sai ${stat.wrong} lần`
  }
  return 'đã đúng'
}

export function reviewTone(rollup: StatRollup): string {
  if (!rollup.touched) return ''
  if (rollup.needReview === 0) return 'tone-ok'
  if (rollup.needReview <= 2) return 'tone-warn'
  return 'tone-bad'
}

export function questionTone(stat: QuestionStat): string {
  if (!stat.seen) return ''
  if (!stillWrong(stat)) return 'tone-ok'
  if (stat.wrong <= 2) return 'tone-warn'
  return 'tone-bad'
}

export function sortByWeakness<T>(
  items: T[],
  get: (item: T) => { needReview: number; wrong: number; seen: number },
): T[] {
  return [...items].sort((a, b) => {
    const left = get(a)
    const right = get(b)
    if (left.needReview !== right.needReview) {
      return right.needReview - left.needReview
    }
    if (left.wrong !== right.wrong) return right.wrong - left.wrong
    if (left.seen === 0 && right.seen !== 0) return 1
    if (right.seen === 0 && left.seen !== 0) return -1
    return 0
  })
}
