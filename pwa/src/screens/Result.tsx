import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { maybeCelebrate } from '../celebrate'
import type { QuizAnswer } from '../types'

type Session = {
  topicId: string
  lessonId: string
  topicTitle: string
  lessonTitle: string
  answers: QuizAnswer[]
  retry: boolean
  runId?: string
}

const SESSION_KEY = 'ontap-cs-last-session'

function readSession(state: unknown): Session | null {
  if (state && typeof state === 'object' && 'answers' in state) {
    return state as Session
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export default function Result() {
  const { topicId, lessonId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useMemo(() => readSession(location.state), [location.state])
  const matched =
    Boolean(session) && session?.topicId === topicId && session?.lessonId === lessonId
  const total = session?.answers.length ?? 0
  const pct = total
    ? Math.round(
        ((session?.answers.filter((a) => a.correct).length ?? 0) / total) * 100,
      )
    : 0

  useEffect(() => {
    if (!matched) return
    maybeCelebrate(session?.runId, pct)
  }, [matched, session?.runId, pct])

  if (!session || !matched) {
    return (
      <p className="status">
        Chưa có kết quả bài này.{' '}
        <Link to={topicId ? `/topic/${topicId}` : '/'}>Quay lại</Link>
      </p>
    )
  }

  const result = session
  const correct = result.answers.filter((a) => a.correct).length
  const wrong = result.answers.filter((a) => !a.correct)

  function retryWrong() {
    navigate(`/quiz/${result.topicId}/${result.lessonId}`, {
      state: { numbers: wrong.map((a) => a.number) },
    })
  }

  return (
    <div className="page">
      <Link className="back" to={`/topic/${result.topicId}`}>
        ← {result.topicTitle}
      </Link>

      <header className="hero compact result-head">
        <p className="kicker">{result.lessonTitle}</p>
      </header>

      <section className="score-card">
        <p className="score-big">
          {correct}/{total}
        </p>
        <p className="score-pct">{pct}% đúng</p>
      </section>

      {wrong.length > 0 ? (
        <section className="wrong-list">
          <h2>Câu sai ({wrong.length})</h2>
          <ol>
            {wrong.map((item) => (
              <li key={item.number}>
                Câu {item.number}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="status">Không có câu sai.</p>
      )}

      <div className="actions equal">
        <Link className="btn primary" to={`/quiz/${result.topicId}/${result.lessonId}`}>
          Làm lại cả bài
        </Link>
        {wrong.length > 0 ? (
          <button type="button" className="btn" onClick={retryWrong}>
            Làm lại câu sai
          </button>
        ) : null}
      </div>
    </div>
  )
}
