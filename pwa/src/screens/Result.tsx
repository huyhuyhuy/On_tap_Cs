import { useMemo } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import type { QuizAnswer } from '../types'

type Session = {
  topicId: string
  lessonId: string
  topicTitle: string
  lessonTitle: string
  answers: QuizAnswer[]
  retry: boolean
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

  if (!session || session.topicId !== topicId || session.lessonId !== lessonId) {
    return (
      <p className="status">
        Chưa có kết quả bài này.{' '}
        <Link to={topicId ? `/topic/${topicId}` : '/'}>Quay lại</Link>
      </p>
    )
  }

  const result = session
  const total = result.answers.length
  const correct = result.answers.filter((a) => a.correct).length
  const wrong = result.answers.filter((a) => !a.correct)
  const pct = total ? Math.round((correct / total) * 100) : 0

  function retryWrong() {
    navigate(`/quiz/${result.topicId}/${result.lessonId}`, {
      state: { numbers: wrong.map((a) => a.number) },
    })
  }

  return (
    <div className="page">
      <nav className="crumb">
        <Link to="/">Chủ đề</Link>
        <span>/</span>
        <Link to={`/topic/${result.topicId}`}>{result.topicTitle}</Link>
      </nav>

      <header className="hero compact">
        <p className="kicker">{result.lessonTitle}</p>
        <h1>Tổng kết</h1>
      </header>

      <section className="score-card">
        <p className="score-big">
          {correct}/{total}
        </p>
        <p className="score-pct">{pct}% đúng</p>
        <p className="score-note">
          {pct === 100
            ? 'Làm tốt. Có thể chuyển bài tiếp theo.'
            : pct >= 70
              ? 'Khá ổn. Nên xem lại các câu sai.'
              : 'Nên làm lại bài này.'}
        </p>
      </section>

      {wrong.length > 0 ? (
        <section className="wrong-list">
          <h2>Câu sai ({wrong.length})</h2>
          <ol>
            {wrong.map((item) => (
              <li key={item.number}>
                Câu {item.number}: chọn {item.selected.toUpperCase()}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <p className="status">Không có câu sai.</p>
      )}

      <div className="actions">
        <Link className="btn primary" to={`/quiz/${result.topicId}/${result.lessonId}`}>
          Làm lại cả bài
        </Link>
        {wrong.length > 0 ? (
          <button type="button" className="btn" onClick={retryWrong}>
            Làm lại câu sai
          </button>
        ) : null}
        <Link className="btn" to={`/topic/${result.topicId}`}>
          Về chủ đề
        </Link>
      </div>
    </div>
  )
}
