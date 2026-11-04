import { lazy, Suspense } from 'react'
import { useInView } from '../hooks/useInView'

const MumbaiMap = lazy(() => import('../map/MumbaiMap'))

export default function DeferredMap() {
  const [ref, visible] = useInView<HTMLDivElement>({ rootMargin: '300px' })
  return <div ref={ref} style={{ minHeight: '60vh' }}>
    {visible && <Suspense fallback={<p className="container">Loading example map…</p>}><MumbaiMap /></Suspense>}
  </div>
}
