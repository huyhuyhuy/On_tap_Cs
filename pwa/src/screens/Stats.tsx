import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { displayTitle, lessonKey, loadCatalog, loadLesson } from '../data'
import { loadProgress, topicStats } from '../progress'
import {
  combinedTone,
  emptyStat,
  formatLessonStat,
  formatQuestionStat,
  formatTopicStat,
  loadStats,
  questionStatKey,
  questionTone,
  rollupPrefix,
  sortByWeakness,
  stillWrong,
} from '../stats'
import type { Catalog, LessonFile, ProgressMap, StatsMap } from '../types'

export default function Stats() {
  const { topicId, lessonId } = useParams()
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [stats, setStats] = useState<StatsMap>({})
  const [progress, setProgress] = useState<ProgressMap>({})
  const [lesson, setLesson] = useState<LessonFile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err: Error) => setError(err.message))
    setStats(loadStats())
    setProgress(loadProgress())
  }, [])

  useEffect(() => {
    let cancelled = false
    setLesson(null)
    if (!catalog || !topicId || !lessonId) return
    const found = catalog.topics
      .find((item) => item.id === topicId)
      ?.lessons.find((item) => item.id === lessonId)
    if (!found) return
    loadLesson(found.path)
      .then((file) => {
        if (!cancelled) setLesson(file)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [catalog, topicId, lessonId])

  const topic = catalog?.topics.find((item) => item.id === topicId)
  const lessonMeta = topic?.lessons.find((item) => item.id === lessonId)

  if (error) return <p className="status error">{error}</p>
  if (!catalog) return <p className="status">Đang tải…</p>
  if (topicId && !topic) {
    return (
      <p className="status error">
        Không tìm thấy chủ đề. <Link to="/stats">Quay lại</Link>
      </p>
    )
  }
  if (lessonId && topic && !lessonMeta) {
    return (
      <p className="status error">
        Không tìm thấy bài. <Link to={`/stats/${topic.id}`}>Quay lại</Link>
      </p>
    )
  }

  if (topic && lessonMeta) {
    const rows = sortByWeakness(
      (lesson ?? { questions: [] as LessonFile['questions'] }).questions.map(
        (question) => {
          const stat =
            stats[questionStatKey(topic.id, lessonMeta.id, question.number)] ??
            emptyStat()
          return {
            question,
            stat,
            needReview: stillWrong(stat) ? 1 : 0,
          }
        },
      ),
      (row) => ({
        needReview: row.needReview,
        wrong: row.stat.wrong,
        seen: row.stat.seen,
      }),
    )
    const rollup = rollupPrefix(stats, `${topic.id}/${lessonMeta.id}/`)
    const completed = Boolean(progress[lessonKey(topic.id, lessonMeta.id)]?.completed)
    const reviewNumbers = rows
      .filter((row) => row.needReview)
      .map((row) => row.question.number)

    return (
      <div className="page">
        <Link className="back" to={`/stats/${topic.id}`}>
          ← {topic.title}
        </Link>
        <header className="hero compact">
          <p className="kicker">Bài</p>
          <h1>{displayTitle(lessonMeta.title)}</h1>
          <p className={`lede ${combinedTone(completed ? 1 : 0, 1, rollup)}`.trim()}>
            {formatLessonStat(completed, rollup)}
          </p>
        </header>
        {reviewNumbers.length > 0 ? (
          <div className="actions">
            <Link
              className="btn primary"
              to={`/quiz/${topic.id}/${lessonMeta.id}`}
              state={{ numbers: reviewNumbers }}
            >
              Ôn các câu cần ôn
            </Link>
          </div>
        ) : null}
        {!lesson ? (
          <p className="status">Đang tải câu hỏi…</p>
        ) : (
          <ol className="lesson-list">
            {rows.map((row) => (
              <li key={row.question.number}>
                <Link
                  className="lesson-card"
                  to={`/quiz/${topic.id}/${lessonMeta.id}`}
                  state={{ numbers: [row.question.number] }}
                >
                  <span className="lesson-index">{row.question.number}</span>
                  <span className="lesson-body">
                    <span className="lesson-title">
                      {row.question.question}
                    </span>
                    <span className={`lesson-meta ${questionTone(row.stat)}`.trim()}>
                      {formatQuestionStat(row.stat)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  }

  if (topic) {
    const topicRollup = rollupPrefix(stats, `${topic.id}/`)
    const topicKeys = topic.lessons.map((item) => lessonKey(topic.id, item.id))
    const { done, total } = topicStats(topicKeys, progress)
    const rows = sortByWeakness(
      topic.lessons.map((item, index) => ({
        lesson: item,
        index,
        completed: Boolean(progress[lessonKey(topic.id, item.id)]?.completed),
        rollup: rollupPrefix(stats, `${topic.id}/${item.id}/`),
      })),
      (row) => ({
        needReview: row.rollup.needReview,
        wrong: row.rollup.wrong,
        seen: row.rollup.seen,
      }),
    )

    return (
      <div className="page">
        <Link className="back" to="/stats">
          ← Thống kê
        </Link>
        <header className="hero compact">
          <p className="kicker">Nhóm</p>
          <h1>{topic.title}</h1>
          <p className={`lede ${combinedTone(done, total, topicRollup)}`.trim()}>
            {formatTopicStat(done, total, topicRollup)}
          </p>
        </header>
        <ol className="lesson-list">
          {rows.map((row) => (
            <li key={row.lesson.id}>
              <Link className="lesson-card" to={`/stats/${topic.id}/${row.lesson.id}`}>
                <span className="lesson-index">{row.index + 1}</span>
                <span className="lesson-body">
                  <span className="lesson-title">
                    {displayTitle(row.lesson.title)}
                  </span>
                  <span className="lesson-meta">
                    {row.lesson.questionCount} câu ·{' '}
                    <span className={combinedTone(row.completed ? 1 : 0, 1, row.rollup)}>
                      {formatLessonStat(row.completed, row.rollup)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  const rows = sortByWeakness(
    catalog.topics.map((item) => {
      const keys = item.lessons.map((lesson) => lessonKey(item.id, lesson.id))
      const { done, total } = topicStats(keys, progress)
      const rollup = rollupPrefix(stats, `${item.id}/`)
      return { topic: item, done, total, rollup }
    }),
    (row) => ({
      needReview: row.rollup.needReview,
      wrong: row.rollup.wrong,
      seen: row.rollup.seen,
    }),
  )

  return (
    <div className="page">
      <Link className="back" to="/">
        ← Trang chủ
      </Link>
      <ol className="topic-list">
        {rows.map((row) => (
          <li key={row.topic.id}>
            <Link className="topic-card" to={`/stats/${row.topic.id}`}>
              <span className="topic-index">
                {String(row.topic.order).padStart(2, '0')}
              </span>
              <span className="topic-body">
                <span className="topic-title">{row.topic.title}</span>
                <span className={`topic-meta ${combinedTone(row.done, row.total, row.rollup)}`.trim()}>
                  {formatTopicStat(row.done, row.total, row.rollup)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
