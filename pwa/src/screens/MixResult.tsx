import { useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { maybeCelebrate } from '../celebrate'
import type { MixAnswer, MixItem, MixMode } from '../types'

type Session = {
  mode: MixMode
  items: MixItem[]
  answers: MixAnswer[]
  runId?: string
}

const SESSION_KEY = 'ontap-cs-mix-session'

function readSession(state: unknown): Session | null {
  if (state && typeof state === 'object' && 'answers' in state && 'items' in state) {
    return state as Session
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export default function MixResult() {
  const { mode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const session = useMemo(() => readSession(location.state), [location.state])
  const matched = Boolean(session) && session?.mode === mode
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
        Chưa có kết quả đề này. <Link to="/">Về trang chủ</Link>
      </p>
    )
  }

  const result = session
  const correct = result.answers.filter((a) => a.correct).length
  const wrong = result.answers.filter((a) => !a.correct)

  function retryWrong() {
    const wrongItems = result.items.filter((_, index) => {
      const answer = result.answers[index]
      return Boolean(answer && !answer.correct)
    })
    navigate(`/mix/${result.mode}`, { state: { items: wrongItems } })
  }

  return (
    <div className="page">
      <Link className="back" to="/">
        ← Trang chủ
      </Link>

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
            {wrong.map((item) => {
              const source = result.items.find(
                (mix) =>
                  mix.topicId === item.topicId &&
                  mix.lessonId === item.lessonId &&
                  mix.question.number === item.number,
              )
              const lessonTitle = item.lessonTitle || source?.lessonTitle
              return (
                <li key={`${item.topicId}/${item.lessonId}/${item.number}`}>
                  {lessonTitle ? `${lessonTitle} · ` : ''}
                  câu {item.number}
                </li>
              )
            })}
          </ol>
        </section>
      ) : (
        <p className="status">Không có câu sai.</p>
      )}

      <div className="actions equal">
        <Link className="btn primary" to={`/mix/${result.mode}`}>
          Làm đề mới
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
