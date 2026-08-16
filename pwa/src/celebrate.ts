/** Đổi thành 90 khi xong test. Nổ khi `pct > CELEBRATE_MIN_PCT`. */
export const CELEBRATE_MIN_PCT = 90

const FIRED_KEY = 'ontap-cs-celebrated-run'

export function newRunId(): string {
  return crypto.randomUUID()
}

export function maybeCelebrate(runId: string | undefined, pct: number): void {
  if (!runId) return
  if (sessionStorage.getItem(FIRED_KEY) === runId) return
  sessionStorage.setItem(FIRED_KEY, runId)
  if (pct <= CELEBRATE_MIN_PCT) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const colors = ['#5b9dff', '#8ec0ff', '#3ecf8e', '#f0b429', '#ffffff']
  void import('canvas-confetti').then(({ default: confetti }) => {
    void confetti({
      particleCount: 90,
      spread: 72,
      origin: { x: 0.2, y: 0.65 },
      colors,
    })
    void confetti({
      particleCount: 90,
      spread: 72,
      origin: { x: 0.8, y: 0.65 },
      colors,
    })
  })
}
