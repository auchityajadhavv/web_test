import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { useInView } from '../hooks/useInView'
import { useReducedMotion } from '../hooks/useReducedMotion'
import Reveal from '../components/Reveal'
import './MumbaiMap.css'

// Bundle the module worker explicitly; dependency prebundling changes import.meta.url.
maplibregl.setWorkerUrl(mapWorkerUrl)

const MUMBAI: [number, number] = [72.8777, 19.076]

// featured "store" pins — show how a live venue appears on the map (label card)
const STORES: { name: string; rating: string; count: string; lng: number; lat: number; live?: boolean }[] = [
  { name: 'Lumière Bistro', rating: '4.9', count: '340', lng: 72.8296, lat: 18.922, live: true },
  { name: 'The Gilded Fork', rating: '4.8', count: '212', lng: 72.8656, lat: 19.0596 },
  { name: 'Aurelia', rating: '5.0', count: '176', lng: 72.8265, lat: 19.0455 },
]

// ambient venues — simple pulsing dots across the city
const PINS: [number, number][] = [
  [72.8347, 18.9548], [72.8258, 19.0176], [72.8479, 19.0176], [72.8377, 19.1136],
  [72.8697, 19.1197], [72.8895, 19.0896], [72.8547, 19.033], [72.8106, 18.9388],
  [72.88, 19.06], [72.845, 19.09],
]

export default function MumbaiMap() {
  const [boxRef, inView] = useInView<HTMLDivElement>({ rootMargin: '150px' })
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const reduced = useReducedMotion()
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    if (!inView || mapRef.current || !mapEl.current) return

    let map: maplibregl.Map
    try { map = new maplibregl.Map({
      container: mapEl.current,
      style: 'https://tiles.openfreemap.org/styles/dark',
      center: MUMBAI,
      zoom: 11,
      pitch: 55,
      bearing: -18,
      attributionControl: {},
      interactive: true,
    }) } catch { setUnavailable(true); return }
    mapRef.current = map

    // zoom + move: buttons for zoom, drag to pan, pinch/double-click to zoom.
    // scroll-zoom is off so the wheel keeps scrolling the page, not the map.
    map.scrollZoom.disable()
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'top-right')

    let spinning = !reduced
    let frame = 0
    let disposed = false
    let loaded = false
    let onScreen = false
    const stopSpin = () => { spinning = false; cancelAnimationFrame(frame) }
    map.on('dragstart', stopSpin)
    map.on('zoomstart', stopSpin)

    map.on('load', () => {
      if (disposed) return
      loaded = true
      map.resize()

      try {
        if (map.getSource('openmaptiles')) map.addLayer({
          id: 'revora-buildings',
          type: 'fill-extrusion',
          source: 'openmaptiles',
          'source-layer': 'building',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': '#26242c',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': 0.85,
          },
        })
      } catch {
        /* source-layer name varies by style; safe to skip */
      }

      // ambient dots
      PINS.forEach(([lng, lat]) => {
        const el = document.createElement('div')
        el.className = 'mm-pin' + (reduced ? '' : ' mm-pin--pulse')
        new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
      })

      // featured store markers — a pin + a glass label card (this is the demo of
      // how a real store shows up once it joins)
      STORES.forEach((s) => {
        const el = document.createElement('div')
        el.className = 'mm-store' + (s.live ? ' is-live' : '')
        el.innerHTML = `
          <div class="mm-store__card">
            <span class="mm-store__logo">${s.name[0]}</span>
            <span class="mm-store__info">
              <span class="mm-store__name">${s.name}</span>
              <span class="mm-store__meta">${s.rating} · ${s.count}${s.live ? ' · Revora' : ''}</span>
            </span>
          </div>
          <div class="mm-store__pin${reduced ? '' : ' mm-store__pin--pulse'}"></div>`
        new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([s.lng, s.lat]).addTo(map)
      })

      startSpin()
    })
    const spin = () => {
      if (disposed || !spinning || !onScreen || document.hidden) { frame = 0; return }
      map.setBearing(map.getBearing() + 0.02)
      frame = requestAnimationFrame(spin)
    }
    const startSpin = () => {
      if (loaded && spinning && onScreen && !document.hidden && !frame) frame = requestAnimationFrame(spin)
    }
    const visibility = () => {
      cancelAnimationFrame(frame); frame = 0
      startSpin()
    }
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; visibility() })
    observer.observe(mapEl.current)
    document.addEventListener('visibilitychange', visibility)

    map.on('error', () => {
      setUnavailable(true)
    })
    const onResize = () => map.resize()
    window.addEventListener('resize', onResize)
    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      map.remove()
      mapRef.current = null
    }
  }, [inView, reduced])

  return (
    <section className="section mm" id="map">
      <div className="container">
        <Reveal className="mm__head">
          <span className="eyebrow">On the map</span>
          <h2 className="h2">Picture your venue on the map.</h2>
          <p className="lead mm__lead">Explore an illustrative Mumbai map. Venue names, ratings, and pins are sample data, not customer locations.</p>
        </Reveal>

        <Reveal className="mm__box" delay={80}>
          <div className="mm__inner" ref={boxRef}>
            <div className="mm__canvas" ref={mapEl} aria-label="Illustrative map with sample venues across Mumbai" />
            {unavailable && <p className="mm__fallback" role="status">The interactive map is unavailable. The locations shown are illustrative examples.</p>}
            <div className="mm__badge glass">
              <span className="mm__badgeDot" />
              <span>Sample locations</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
