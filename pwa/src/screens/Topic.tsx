import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { displayTitle, lessonKey, loadCatalog } from '../data'
import { loadProgress } from '../progress'
import type { Catalog, ProgressMap } from '../types'

export default function Topic() {
  const { topicId } = useParams()
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
  if (!catalog) return <p className="status">Đang tải…</p>

  const topic = catalog.topics.find((item) => item.id === topicId)
  if (!topic) {
    return (
      <p className="status error">
        Không tìm thấy chủ đề. <Link to="/">Về trang chủ</Link>
      </p>
    )
  }

  return (
    <div className="page">
      <Link className="back" to="/topics">
        ← Chủ đề
      </Link>
      <header className="hero compact">
        <h1>{topic.title}</h1>
        <p className="lede">{topic.blurb}</p>
      </header>

      <ol className="lesson-list">
        {topic.lessons.map((lesson, index) => {
          const key = lessonKey(topic.id, lesson.id)
          const rec = progress[key]
          const score = rec
            ? `${rec.bestCorrect}/${rec.bestTotal}`
            : null
          return (
            <li key={lesson.id}>
              <Link
                className="lesson-card"
                to={`/quiz/${topic.id}/${lesson.id}`}
              >
                <span className="lesson-index">{index + 1}</span>
                <span className="lesson-body">
                  <span className="lesson-title">{displayTitle(lesson.title)}</span>
                  <span className="lesson-meta">
                    {lesson.questionCount} câu
                    {rec?.completed ? ` · cao nhất ${score}` : ''}
                  </span>
                </span>
                <span className={`pill ${rec?.completed ? 'done' : ''}`}>
                  {rec?.completed ? 'Đã làm' : 'Bắt đầu'}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
