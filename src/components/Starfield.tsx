import { useEffect, useRef } from 'react'
import { usePageVisible } from '../hooks/usePageVisible'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './Starfield.css'

type Star = { x: number; y: number; z: number; r: number; tw: number }

/**
 * Deep-space starfield fixed behind everything. Lightweight 2D canvas (no WebGL
 * dependency, so it never breaks the page). Subtle, slow drift — comforting, not busy.
 * No purple: stars are warm-white / faint lilac only at very low alpha.
 */
export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const visible = usePageVisible()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    let stars: Star[] = []
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const build = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(220, Math.round((w * h) / 9000))
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.3 + Math.random() * 0.7, // depth → parallax + size
        r: Math.random() * 1.3 + 0.2,
        tw: Math.random() * Math.PI * 2, // twinkle phase
      }))
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.0012 + s.tw)
        const alpha = (0.25 + s.z * 0.55) * twinkle
        // occasional faint lilac star for depth, most are warm-white
        const lilac = s.tw > 5.6
        ctx.beginPath()
        ctx.fillStyle = lilac
          ? `rgba(196,166,255,${alpha * 0.6})`
          : `rgba(233,230,245,${alpha})`
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = (t: number) => {
      // slow downward-left drift for a "floating through space" feel
      for (const s of stars) {
        s.y += s.z * 0.045
        s.x -= s.z * 0.02
        if (s.y > h + 2) s.y = -2
        if (s.x < -2) s.x = w + 2
      }
      draw(t)
      raf = requestAnimationFrame(tick)
    }

    build()
    if (reduced || !visible) {
      draw(0)
    } else {
      raf = requestAnimationFrame(tick)
    }

    const onResize = () => { build(); if (reduced || !visible) draw(0) }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [reduced, visible])

  return (
    <div className="starfield" aria-hidden="true">
      <canvas ref={canvasRef} />
      <div className="starfield__vignette" />
    </div>
  )
}
