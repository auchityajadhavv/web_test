import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import AmbientFallback from '../components/AmbientFallback'
import { usePageVisible } from '../hooks/usePageVisible'
import { useReducedMotion } from '../hooks/useReducedMotion'
import './AmbientField.css'

function softTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, '#fff')
  gr.addColorStop(0.22, 'rgba(255,255,255,0.8)')
  gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr
  g.fillRect(0, 0, 128, 128)
  const t = new THREE.Texture(c)
  t.needsUpdate = true
  return t
}

const RINGS = [
  { r: 1.9, rot: [1.3, 0.3, 0.0], color: '#c4a6ff', speed: 0.65, phase: 0 },
  { r: 2.5, rot: [1.0, -0.5, 0.4], color: '#9a7fd6', speed: -0.5, phase: 1.6 },
  { r: 3.2, rot: [1.5, 0.5, -0.3], color: '#8b5cf6', speed: 0.4, phase: 3.1 },
  { r: 4.0, rot: [0.9, 0.9, 0.2], color: '#7c3aed', speed: -0.3, phase: 4.7 },
  { r: 4.9, rot: [1.4, -0.3, -0.5], color: '#a78bfa', speed: 0.22, phase: 5.9 },
]

function Orbit({ tex, reduced, low }: { tex: THREE.Texture; reduced: boolean; low: boolean }) {
  const group = useRef<THREE.Group>(null)
  const electrons = useRef<(THREE.Group | null)[]>([])
  // fewer rings / segments / trail on low-power devices
  const rings = low ? RINGS.slice(0, 3) : RINGS
  const seg = low ? 90 : 140
  const trail = low ? [0, 1] : [0, 1, 2, 3]

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (group.current && !reduced) {
      group.current.rotation.y = t * 0.05
      group.current.rotation.x = Math.sin(t * 0.07) * 0.12
    }
    rings.forEach((ring, i) => {
      const e = electrons.current[i]
      if (!e) return
      const a = reduced ? ring.phase : t * ring.speed + ring.phase
      // position each electron (with its trail) around its ring
      e.children.forEach((child, k) => {
        const ang = a - k * 0.16 * Math.sign(ring.speed || 1)
        child.position.set(Math.cos(ang) * ring.r, Math.sin(ang) * ring.r, 0)
        const m = (child as THREE.Sprite).material as THREE.SpriteMaterial
        m.opacity = (k === 0 ? 1 : 0.5 - k * 0.11) // head bright, trail fades
      })
    })
  })

  return (
    <group ref={group} position={[2.3, 0.2, 0]}>
      {/* luminous core */}
      <sprite scale={[2.4, 2.4, 1]}>
        <spriteMaterial map={tex} color="#b79dff" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite scale={[0.85, 0.85, 1]}>
        <spriteMaterial map={tex} color="#ffffff" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>

      {rings.map((ring, i) => (
        <group key={i} rotation={ring.rot as [number, number, number]}>
          {/* the ring + a soft halo behind it */}
          <mesh>
            <torusGeometry args={[ring.r, 0.006, 8, seg]} />
            <meshBasicMaterial color={ring.color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          <mesh>
            <torusGeometry args={[ring.r, 0.05, 8, seg]} />
            <meshBasicMaterial color={ring.color} transparent opacity={0.08} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
          {/* electron with a short trailing comet */}
          <group ref={(el) => (electrons.current[i] = el)}>
            {trail.map((k) => (
              <sprite key={k} scale={k === 0 ? [0.5, 0.5, 1] : [0.34 - k * 0.05, 0.34 - k * 0.05, 1]}>
                <spriteMaterial map={tex} color={k === 0 ? '#ffffff' : ring.color} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </sprite>
            ))}
          </group>
        </group>
      ))}
    </group>
  )
}

function Nebula({ tex, reduced }: { tex: THREE.Texture; reduced: boolean }) {
  const refs = useRef<(THREE.Sprite | null)[]>([])
  const blobs = useMemo(
    () => [
      { p: [3.5, 1.5, -7], s: 13, color: '#3a1d6e' },
      { p: [-1, -2, -9], s: 16, color: '#241145' },
      { p: [5, -1.5, -6], s: 9, color: '#5b2a8f' },
    ],
    [],
  )
  useFrame((state) => {
    if (reduced) return
    const t = state.clock.elapsedTime
    refs.current.forEach((s, i) => {
      if (!s) return
      s.position.x = blobs[i].p[0] + Math.sin(t * 0.05 + i) * 0.6
      s.position.y = blobs[i].p[1] + Math.cos(t * 0.04 + i) * 0.5
    })
  })
  return (
    <>
      {blobs.map((b, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)} position={b.p as [number, number, number]} scale={[b.s, b.s, 1]}>
          <spriteMaterial map={tex} color={b.color} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

function Stardust({ tex, reduced, count, spread, depth, size, opacity }: { tex: THREE.Texture; reduced: boolean; count: number; spread: number; depth: number; size: number; opacity: number }) {
  const ref = useRef<THREE.Points>(null)
  const { positions, colors } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const pal = [
      [0.6, 0.5, 0.85],
      [0.75, 0.68, 0.95],
      [0.95, 0.92, 1],
    ]
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread
      positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7
      positions[i * 3 + 2] = -Math.random() * depth - 1
      const c = pal[(Math.random() * pal.length) | 0]
      colors[i * 3] = c[0]
      colors[i * 3 + 1] = c[1]
      colors[i * 3 + 2] = c[2]
    }
    return { positions, colors }
  }, [count, spread, depth])
  useFrame((state) => {
    if (ref.current && !reduced) ref.current.rotation.y = state.clock.elapsedTime * 0.01
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} vertexColors opacity={opacity} sizeAttenuation />
    </points>
  )
}

const pointer = { x: 0, y: 0 }

function Rig({ reduced }: { reduced: boolean }) {
  const { camera } = useThree()
  useFrame(() => {
    if (reduced) return
    camera.position.x += (pointer.x * 1.2 - camera.position.x) * 0.04
    camera.position.y += (-pointer.y * 0.8 - camera.position.y) * 0.04
    camera.lookAt(1.2, 0, 0)
  })
  return null
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')))
  } catch {
    return false
  }
}

export default function AmbientField() {
  const reduced = useReducedMotion()
  const tex = useMemo(() => softTexture(), [])
  const wrapRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(true)
  const webgl = useMemo(() => hasWebGL(), [])

  // lighter scene on small screens / low-core devices
  const low = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (window.innerWidth < 720 || (navigator.hardwareConcurrency || 8) <= 4),
    [],
  )

  // pause the render loop entirely once the hero scrolls offscreen
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.01 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [])
  useEffect(() => () => tex.dispose(), [tex])
  const visible = usePageVisible()
  if (!webgl) return <AmbientFallback />

  return (
    <div className="ambient" aria-hidden="true" ref={wrapRef}>
      <Canvas
        frameloop={!active || !visible ? 'never' : reduced ? 'demand' : 'always'}
        dpr={low ? [1, 1.5] : [1, 2]}
        camera={{ position: [0, 0, 9], fov: 46 }}
        gl={{ alpha: true, antialias: !low, powerPreference: 'high-performance' }}
      >
        {!low && <Nebula tex={tex} reduced={reduced} />}
        <Stardust tex={tex} reduced={reduced} count={low ? 40 : 90} spread={26} depth={16} size={0.05} opacity={0.5} />
        <Stardust tex={tex} reduced={reduced} count={low ? 80 : 180} spread={20} depth={9} size={0.09} opacity={0.9} />
        <Orbit tex={tex} reduced={reduced} low={low} />
        <Rig reduced={reduced} />
      </Canvas>
    </div>
  )
}
