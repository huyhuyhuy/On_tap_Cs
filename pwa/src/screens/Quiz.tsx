import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { newRunId } from '../celebrate'
import { displayTitle, hasExplanation, lessonKey, loadCatalog, loadLesson } from '../data'
import { saveLessonProgress } from '../progress'
import { recordAttempt } from '../stats'
import type { LessonFile, LessonMeta, QuizAnswer, TopicMeta } from '../types'

type LocationState = {
  numbers?: number[]
}

const SESSION_KEY = 'ontap-cs-last-session'

export default function Quiz() {
  const { topicId, lessonId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const retryNumbers = (location.state as LocationState | null)?.numbers

  const [topic, setTopic] = useState<TopicMeta | null>(null)
  const [lessonMeta, setLessonMeta] = useState<LessonMeta | null>(null)
  const [lesson, setLesson] = useState<LessonFile | null>(null)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<QuizAnswer[]>([])
  const [showExplain, setShowExplain] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const explainRef = useRef<HTMLDivElement>(null)
  const userToggledExplain = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!topicId || !lessonId) return
      try {
        const catalog = await loadCatalog()
        const foundTopic = catalog.topics.find((item) => item.id === topicId)
        const foundLesson = foundTopic?.lessons.find((item) => item.id === lessonId)
        if (!foundTopic || !foundLesson) {
          throw new Error('Không tìm thấy bài.')
        }
        const file = await loadLesson(foundLesson.path)
        if (cancelled) return
        setTopic(foundTopic)
        setLessonMeta(foundLesson)
        setLesson(file)
        setIndex(0)
        setPicked(null)
        setAnswers([])
        setShowExplain(false)
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [topicId, lessonId, retryNumbers])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setShowExplain(false)
  }, [index])

  useLayoutEffect(() => {
    if (!userToggledExplain.current) return
    userToggledExplain.current = false
    const scroller = scrollRef.current
    if (!scroller) return
    if (showExplain && explainRef.current) {
      const panel = explainRef.current
      const top =
        scroller.scrollTop +
        panel.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        8
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      return
    }
    scroller.scrollTo({ top: 0, behavior: 'smooth' })
  }, [showExplain])

  const queue = useMemo(() => {
    if (!lesson) return []
    if (retryNumbers?.length) {
      const wanted = new Set(retryNumbers)
      return lesson.questions.filter((q) => wanted.has(q.number))
    }
    return lesson.questions
  }, [lesson, retryNumbers])

  if (error) {
    return (
      <p className="status error">
        {error} <Link to="/">Về trang chủ</Link>
      </p>
    )
  }
  if (!topic || !lessonMeta || !lesson) {
    return <p className="status">Đang tải câu hỏi…</p>
  }
  if (queue.length === 0) {
    return (
      <p className="status error">
        Không có câu hỏi.{' '}
        <Link to={`/topic/${topic.id}`}>Quay lại</Link>
      </p>
    )
  }

  const current = queue[index]
  const revealed = picked !== null
  const isCorrect = picked === current.answer
  const hasExplain = hasExplanation(current.explanation)
  const pct = Math.round(((index + (revealed ? 1 : 0)) / queue.length) * 100)

  function choose(key: string) {
    if (picked || !topicId || !lessonId) return
    const correct = key === current.answer
    setPicked(key)
    recordAttempt(topicId, lessonId, current.number, correct)
    setAnswers((prev) => [
      ...prev,
      {
        number: current.number,
        selected: key,
        correct,
      },
    ])
  }

  function goNext() {
    if (!topicId || !lessonId || !topic || !lessonMeta) return
    if (index + 1 < queue.length) {
      setIndex((n) => n + 1)
      setPicked(null)
      setShowExplain(false)
      return
    }
    const nextAnswers = answers
    const correctCount = nextAnswers.filter((a) => a.correct).length
    saveLessonProgress(
      lessonKey(topicId, lessonId),
      {
        bestCorrect: correctCount,
        bestTotal: nextAnswers.length,
        completed: true,
        lastAt: new Date().toISOString(),
      },
      retryNumbers?.length ? 'retry' : 'full',
    )
    const session = {
      topicId,
      lessonId,
      topicTitle: topic.title,
      lessonTitle: displayTitle(lessonMeta.title),
      answers: nextAnswers,
      retry: Boolean(retryNumbers?.length),
      runId: newRunId(),
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    navigate(`/quiz/${topicId}/${lessonId}/result`, { replace: true, state: session })
  }

  return (
    <div className="quiz-shell">
      <header className="quiz-top">
        <Link className="back" to={`/topic/${topic.id}`}>
          ← {topic.title}
        </Link>
        <div className="quiz-head">
          <div className="quiz-head-row">
            <p className="kicker" title={displayTitle(lessonMeta.title)}>
              {displayTitle(lessonMeta.title)}
            </p>
            <p className="quiz-progress">
              {index + 1} / {queue.length}
              {retryNumbers?.length ? ' · làm lại' : ''}
            </p>
          </div>
          <div className="bar" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <div className="quiz-scroll" ref={scrollRef}>
        <article className="question-card">
          <h1 className="question-text">
            {index + 1}. {current.question}
          </h1>
          {current.code ? <pre className="code-block">{current.code}</pre> : null}

          <ul className="options">
            {current.options.map((option) => {
              let cls = 'option'
              if (revealed) {
                if (option.key === current.answer) cls += ' correct'
                else if (option.key === picked) cls += ' wrong'
              } else if (picked === option.key) {
                cls += ' selected'
              }
              return (
                <li key={option.key}>
                  <button
                    type="button"
                    className={cls}
                    disabled={revealed}
                    onClick={() => choose(option.key)}
                  >
                    <span className="opt-key">{option.key.toUpperCase()}</span>
                    <span className="opt-text">{option.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>

          {revealed && showExplain && hasExplain ? (
            <div className="feedback" ref={explainRef}>
              <p className="feedback-title">Giải thích</p>
              <pre className="explain">{current.explanation}</pre>
            </div>
          ) : null}
        </article>
      </div>

      {revealed ? (
        <footer className="quiz-dock">
          <div className="quiz-dock-inner">
            <div className="quiz-dock-status-row">
              <p className="quiz-dock-status">
                {isCorrect ? 'Đúng' : `Sai — đáp án đúng là ${current.answer.toUpperCase()}`}
              </p>
              {lesson.sourceUrl ? (
                <a
                  className="source-link"
                  href={lesson.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Nguồn Sanfoundry"
                >
                  <span aria-hidden="true">↗</span> Sanfoundry
                </a>
              ) : null}
            </div>
            <div className="quiz-dock-actions">
              <button
                type="button"
                className={`btn explain-btn${showExplain ? ' on' : ''}`}
                disabled={!hasExplain}
                onClick={() => {
                  userToggledExplain.current = true
                  setShowExplain((open) => !open)
                }}
              >
                Giải thích
              </button>
              <button type="button" className="btn primary" onClick={goNext}>
                {index + 1 < queue.length ? 'Câu tiếp' : 'Xem tổng kết'}
              </button>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  )
}
