import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import CodeBlock from '../CodeBlock'
import { newRunId } from '../celebrate'
import { hasExplanation, loadCatalog } from '../data'
import { buildMix } from '../mix'
import { recordAttempt } from '../stats'
import type { MixAnswer, MixItem, MixMode } from '../types'

type LocationState = {
  items?: MixItem[]
}

const SESSION_KEY = 'ontap-cs-mix-session'

function isMode(value: string | undefined): value is MixMode {
  return value === 'random' || value === 'review'
}

export default function Mix() {
  const { mode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const retryItems = (location.state as LocationState | null)?.items

  const [items, setItems] = useState<MixItem[] | null>(null)
  const [error, setError] = useState('')
  const [empty, setEmpty] = useState(false)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<MixAnswer[]>([])
  const [showExplain, setShowExplain] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const explainRef = useRef<HTMLDivElement>(null)
  const userToggledExplain = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (!isMode(mode)) {
        setError('Không tìm thấy đề.')
        return
      }
      try {
        if (retryItems?.length) {
          if (cancelled) return
          setItems(retryItems)
          setEmpty(false)
          setIndex(0)
          setPicked(null)
          setAnswers([])
          setShowExplain(false)
          return
        }
        const catalog = await loadCatalog()
        const mix = await buildMix(catalog, mode)
        if (cancelled) return
        if (!mix.length) {
          setEmpty(true)
          setItems([])
          return
        }
        setEmpty(false)
        setItems(mix)
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
  }, [mode, retryItems])

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

  if (!isMode(mode)) {
    return (
      <p className="status error">
        Không tìm thấy đề. <Link to="/">Về trang chủ</Link>
      </p>
    )
  }

  if (error) {
    return (
      <p className="status error">
        {error} <Link to="/">Về trang chủ</Link>
      </p>
    )
  }

  if (empty) {
    return (
      <div className="page">
        <Link className="back" to="/">
          ← Trang chủ
        </Link>
        <header className="hero compact">
          <h1>Chưa có câu cần ôn</h1>
          <p className="lede">Làm vài bài theo chủ đề, câu sai sẽ hiện ở đây.</p>
        </header>
        <div className="actions">
          <Link className="btn primary" to="/topics">
            Học theo chủ đề
          </Link>
        </div>
      </div>
    )
  }

  if (!items) return <p className="status">Đang soạn đề…</p>
  if (!items.length) return <p className="status">Đang soạn đề…</p>

  const queue = items
  const current = queue[index]
  if (!current) return <p className="status">Đang soạn đề…</p>

  const question = current.question
  const revealed = picked !== null
  const isCorrect = picked === question.answer
  const hasExplain = hasExplanation(question.explanation)
  const pct = Math.round(((index + (revealed ? 1 : 0)) / queue.length) * 100)

  function choose(key: string) {
    if (picked) return
    const correct = key === question.answer
    setPicked(key)
    recordAttempt(current.topicId, current.lessonId, question.number, correct)
    setAnswers((prev) => [
      ...prev,
      {
        topicId: current.topicId,
        lessonId: current.lessonId,
        lessonTitle: current.lessonTitle,
        number: question.number,
        selected: key,
        correct,
      },
    ])
  }

  function goNext() {
    if (index + 1 < queue.length) {
      setIndex((n) => n + 1)
      setPicked(null)
      setShowExplain(false)
      return
    }
    const session = {
      mode,
      items: queue,
      answers,
      runId: newRunId(),
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    navigate(`/mix/${mode}/result`, { replace: true, state: session })
  }

  return (
    <div className="quiz-shell">
      <header className="quiz-top">
        <Link className="back" to="/">
          ← Trang chủ
        </Link>
        <div className="quiz-head">
          <div className="quiz-head-row">
            <p className="quiz-head-lesson" title={current.lessonTitle}>
              {current.lessonTitle}
            </p>
            <p className="quiz-progress">
              {index + 1} / {queue.length}
              {retryItems?.length ? ' · làm lại' : ''}
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
            {index + 1}. {question.question}
          </h1>
          {question.code ? <CodeBlock code={question.code} /> : null}

          <ul className="options">
            {question.options.map((option) => {
              let cls = 'option'
              if (revealed) {
                if (option.key === question.answer) cls += ' correct'
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
              <pre className="explain">{question.explanation}</pre>
            </div>
          ) : null}
        </article>
      </div>

      {revealed ? (
        <footer className="quiz-dock">
          <div className="quiz-dock-inner">
            <div className="quiz-dock-status-row">
              <p className="quiz-dock-status">
                {isCorrect
                  ? 'Đúng'
                  : `Sai — đáp án đúng là ${question.answer.toUpperCase()}`}
              </p>
              {current.sourceUrl && question.origin !== 'local' ? (
                <a
                  className="source-link"
                  href={current.sourceUrl}
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
