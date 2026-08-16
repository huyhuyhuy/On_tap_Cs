import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadCatalog } from '../data'
import { formatReview, loadStats, rollupPrefix } from '../stats'
import type { Catalog, StatRollup } from '../types'

export default function Home() {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [review, setReview] = useState<StatRollup | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCatalog()
      .then(setCatalog)
      .catch((err: Error) => setError(err.message))
    setReview(rollupPrefix(loadStats(), ''))
  }, [])

  if (error) return <p className="status error">{error}</p>
  if (!catalog || !review) return <p className="status">Đang tải…</p>

  return (
    <div className="page home">
      <header className="hero">
        <h1>Ôn tập C#</h1>
        <p className="lede">
          {catalog.topicCount} chủ đề · {catalog.questionCount} câu hỏi.
        </p>
      </header>

      <div className="home-grid">
        <Link className="home-tile accent-blue" to="/topics">
          <span className="home-tile-mark" aria-hidden="true">
            01
          </span>
          <span className="home-tile-title">Theo chủ đề</span>
          <span className="home-tile-sub">{catalog.topicCount} chủ đề</span>
        </Link>
        <Link className="home-tile accent-cyan" to="/mix/random">
          <span className="home-tile-mark" aria-hidden="true">
            ?
          </span>
          <span className="home-tile-title">Ngẫu nhiên</span>
          <span className="home-tile-sub">10–15 câu</span>
        </Link>
        <Link className="home-tile accent-red" to="/mix/review">
          <span className="home-tile-mark" aria-hidden="true">
            !
          </span>
          <span className="home-tile-title">Cần ôn lại</span>
          <span className={`home-tile-sub ${review.needReview ? 'tone-bad' : ''}`.trim()}>
            {review.touched ? formatReview(review) : 'câu đang sai'}
          </span>
        </Link>
        <Link className="home-tile accent-green" to="/stats">
          <span className="home-tile-mark" aria-hidden="true">
            ≡
          </span>
          <span className="home-tile-title">Thống kê</span>
          <span className="home-tile-sub">trên máy này</span>
        </Link>
      </div>

      <p className="home-source">
        <a
          href="https://www.sanfoundry.com/1000-csharp-questions-answers/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Nguồn: Sanfoundry
        </a>
      </p>
    </div>
  )
}
