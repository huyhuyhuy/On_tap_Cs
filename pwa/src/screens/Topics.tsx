import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCatalog, lessonKey } from '../data'
import { loadProgress, topicStats } from '../progress'
import type { Catalog, ProgressMap } from '../types'

export default function Topics() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [progress, setProgress] = useState<ProgressMap>({})
  const [error, setError] = useState('')

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err: Error) => setError(err.message))
    setProgress(loadProgress())
  }, [])

  if (error) return <p className="status error">{error}</p>
  if (!catalog) return <p className="status">Đang tải danh mục…</p>

  return (
    <div className="page">
      <Link className="back" to="/">
        ← Trang chủ
      </Link>
      <header className="hero compact">
        {/* <p className="kicker">Học theo chủ đề</p> */}
        <h1>11 chủ đề</h1>
        <p className="lede">
          {catalog.questionCount} câu. Từ cơ bản, đến nâng cao.
        </p>
      </header>

      <ol className="topic-list">
        {catalog.topics.map((topic, index) => {
          const keys = topic.lessons.map((lesson) =>
            lessonKey(topic.id, lesson.id),
          )
          const { done, total } = topicStats(keys, progress)
          const pct = total ? Math.round((done / total) * 100) : 0
          return (
            <li key={topic.id}>
              <Link className="topic-card" to={`/topic/${topic.id}`}>
                <span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
                <span className="topic-body">
                  <span className="topic-title">{topic.title}</span>
                  <span className="topic-blurb">{topic.blurb}</span>
                  <span className="topic-meta">
                    {topic.lessons.length} bài · {topic.questionCount} câu
                    {done > 0 ? ` · đã xong ${done}/${total}` : ''}
                  </span>
                  <span className="bar" aria-hidden="true">
                    <span className="bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
