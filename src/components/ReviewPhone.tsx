import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useInView } from '../hooks/useInView'
import './Logo.css'
import './ReviewPhone.css'

/* ---- review writer (ported from the REVORA review page) ---- */
const TIERS = ['Poor', 'Fair', 'Good', 'Great', 'Exceptional']
const tierOf = (v: number) => TIERS[Math.min(4, Math.floor(Math.max(0, v) * 5))]
const band = (v: number) => (v >= 0.8 ? 'high' : v >= 0.55 ? 'mid' : 'low') as 'high' | 'mid' | 'low'
const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const OPENERS = {
  high: ['Had a genuinely lovely time', 'Really enjoyed the whole experience', 'A brilliant visit from start to finish'],
  mid: ['Had a pleasant time', 'A decent experience overall', 'Enjoyed my visit on the whole'],
  low: ['Mixed feelings after this visit', 'It was an okay experience'],
}
const CLAUSE: Record<string, Record<string, string[]>> = {
  food: {
    high: ['the food was excellent', 'the dishes were full of flavour', 'every plate was spot on'],
    mid: ['the food was enjoyable', 'the food was solid'],
    low: ['the food was a little underwhelming'],
  },
  service: {
    high: ['the service was warm and attentive', 'the team looked after us beautifully', 'staff couldn’t have been kinder'],
    mid: ['the service was fine', 'the team were pleasant enough'],
    low: ['service was a bit slow'],
  },
  ambience: {
    high: ['the atmosphere was gorgeous', 'the space felt relaxed and stylish', 'loved the ambience'],
    mid: ['the setting was pleasant', 'nice enough atmosphere'],
    low: ['the ambience felt a little flat'],
  },
}
const CLOSER = {
  high: ['Would happily come back.', 'Highly recommend.', 'Will definitely return.'],
  mid: ['Would come again.', 'Worth a visit.'],
  low: ['Hope it sharpens up — might give it another go.'],
}

function writeReview(state: Record<string, number>) {
  const { food, service, ambience } = state
  const overall = (food + service + ambience) / 3
  const ob = band(overall)
  const cats = [
    ['food', food],
    ['service', service],
    ['ambience', ambience],
  ].sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][]
  const c1 = pick(CLAUSE[cats[0][0]][band(cats[0][1])])
  const c2 = pick(CLAUSE[cats[1][0]][band(cats[1][1])])
  const c3 = pick(CLAUSE[cats[2][0]][band(cats[2][1])])
  return `${pick(OPENERS[ob])}. ${cap(c1)}, and ${c2}. ${cap(c3)} too. ${pick(CLOSER[ob])}`
}

const METRICS = [
  { label: 'Food', key: 'food', target: 0.96 },
  { label: 'Service', key: 'service', target: 0.9 },
  { label: 'Ambience', key: 'ambience', target: 1.0 },
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

type Phase = 'rate' | 'review'

/**
 * A latest-iPhone frame running REVORA's guest review flow, hands-free:
 * the sliders slide themselves, then the flow drafts an AI review that types out.
 * Loops. Reduced-motion: shows the finished state, no motion.
 */
export default function ReviewPhone() {
  const [boxRef, inView] = useInView<HTMLDivElement>({ rootMargin: '-8% 0px' })
  const reduced = useReducedMotion()
  const [vals, setVals] = useState<Record<string, number>>({ food: 0, service: 0, ambience: 0 })
  const [phase, setPhase] = useState<Phase>('rate')
  const [typed, setTyped] = useState('')
  const finalState = useRef<Record<string, number>>({ food: 0.96, service: 0.9, ambience: 1.0 })
  const cancelled = useRef(false)

  useEffect(() => {
    if (!inView) return
    cancelled.current = false

    if (reduced) {
      const done = { food: 0.96, service: 0.9, ambience: 1.0 }
      setVals(done)
      setPhase('review')
      setTyped(writeReview(done))
      return
    }

    const animateSlider = (key: string, target: number, ms: number) =>
      new Promise<void>((resolve) => {
        const start = performance.now()
        const step = (t: number) => {
          if (cancelled.current) return resolve()
          const p = Math.min(1, (t - start) / ms)
          // ease-out
          const e = 1 - Math.pow(1 - p, 3)
          setVals((v) => ({ ...v, [key]: target * e }))
          if (p < 1) requestAnimationFrame(step)
          else resolve()
        }
        requestAnimationFrame(step)
      })

    const run = async () => {
      while (!cancelled.current) {
        // reset
        setPhase('rate')
        setTyped('')
        setVals({ food: 0, service: 0, ambience: 0 })
        await sleep(1000)
        // slide each rating in turn — calm, deliberate
        for (const m of METRICS) {
          if (cancelled.current) return
          await animateSlider(m.key, m.target, 1100)
          await sleep(520)
        }
        await sleep(900)
        if (cancelled.current) return
        // move to review + type it out
        const review = writeReview(finalState.current)
        setPhase('review')
        await sleep(700)
        for (let i = 1; i <= review.length; i++) {
          if (cancelled.current) return
          setTyped(review.slice(0, i))
          await sleep(32)
        }
        await sleep(5000) // hold so it can actually be read
      }
    }
    run()

    return () => {
      cancelled.current = true
    }
  }, [inView, reduced])

  const overall = ((finalState.current.food + finalState.current.service + finalState.current.ambience) / 3).toFixed(1)

  return (
    <div className="phone" ref={boxRef}>
      <div className="phone__frame">
        <div className="phone__island" />
        <div className="phone__screen">
          <div className={`rp ${phase === 'review' ? 'is-review' : ''}`}>
            {/* header — brand + the orbiting mark (same as the logo) */}
            <div className="rp__head">
              <span className="rp__brand">REVORA</span>
              <span className={`logo__mark rp__mark ${reduced ? 'is-static' : ''}`} aria-hidden="true">
                <span className="logo__sphere">
                  <i className="logo__ring" />
                  <i className="logo__ring logo__ring--tilt" />
                  <span className="logo__dotWrap">
                    <b className="logo__dot" />
                  </span>
                </span>
              </span>
            </div>

            {phase === 'rate' ? (
              <div className="rp__rate">
                <h3 className="rp__title">How was your experience today?</h3>
                <p className="rp__sub">Three quiet questions.</p>
                <div className="rp__cards">
                  {METRICS.map((m) => {
                    const v = vals[m.key]
                    return (
                      <div className={`rp__card ${v > 0.02 ? 'is-active' : ''}`} key={m.key}>
                        <div className="rp__cardTop">
                          <span className="rp__cardName">{m.label}</span>
                          {/* keyed span → replays the flip whenever the tier word changes */}
                          <span className="rp__cardTier" key={tierOf(v)}>
                            {tierOf(v)}
                          </span>
                        </div>
                        <div className="rp__slider" style={{ ['--v' as string]: v }}>
                          <div className="rp__rail">
                            <div className="rp__fill" />
                          </div>
                          <div className="rp__orb" />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="rp__cta">Continue</div>
              </div>
            ) : (
              <div className="rp__review">
                <h3 className="rp__title">One tap from the world seeing it</h3>
                <div className="rp__chips">
                  {METRICS.map((m) => (
                    <span className="rp__chip" key={m.key}>
                      {m.label} · <b>{tierOf(finalState.current[m.key])}</b>
                    </span>
                  ))}
                </div>
                <div className="rp__card rp__reviewCard">
                  <div className="rp__reviewLabel">
                    <span>Suggested review</span>
                    <span className="mono rp__ai">Example · {overall}</span>
                  </div>
                  <p className="rp__reviewText">
                    {typed}
                    {typed.length < 120 && <span className="rp__caret" />}
                  </p>
                </div>
                <div className="rp__cta">Example review draft</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
