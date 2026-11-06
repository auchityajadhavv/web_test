import { useEffect, useRef } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { usePageVisible } from "../hooks/usePageVisible";

type Point = { x: number; y: number; z: number };
type Ring = {
  radius: number;
  tilt: number;
  turn: number;
  speed: number;
  phase: number;
};
const TAU = Math.PI * 2;
const RINGS: Ring[] = [
  { radius: 2.2, tilt: 1.14, turn: -0.34, speed: 0.31, phase: 0.5 },
  { radius: 2.5, tilt: 0.5, turn: 0.76, speed: -0.23, phase: 3.4 },
  { radius: 1.9, tilt: 1.53, turn: -0.72, speed: 0.38, phase: 4.5 },
];
function pointOnRing(angle: number, ring: Ring, yaw: number): Point {
  const x = Math.cos(angle) * ring.radius;
  const y = Math.sin(angle) * ring.radius * Math.cos(ring.tilt);
  const z = Math.sin(angle) * ring.radius * Math.sin(ring.tilt);
  const rx = x * Math.cos(ring.turn) - y * Math.sin(ring.turn);
  const ry = x * Math.sin(ring.turn) + y * Math.cos(ring.turn);
  return {
    x: rx * Math.cos(yaw) + z * Math.sin(yaw),
    y: ry,
    z: -rx * Math.sin(yaw) + z * Math.cos(yaw),
  };
}

/** Project real 3D ring coordinates onto a small canvas, with depth and occlusion. */
export default function OrbitVisual({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const pageVisible = usePageVisible();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    let width = 0;
    let height = 0;
    let inView = false;
    let disposed = false;
    let lastFrame = 0;
    let elapsed = 0;
    let lastTick = 0;
    const pointer = { x: 0, y: 0 };
    const ratio = Math.min(devicePixelRatio || 1, compact ? 2 : 1.75);
    const fps = compact || (navigator.hardwareConcurrency || 8) <= 4 ? 30 : 45;
    const segments = compact ? 64 : 128;

    function paint(time: number) {
      if (!ctx || !width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const size = Math.min(width, height);
      const scale = size * 0.155;
      const centerX = width * 0.5;
      const centerY = height * 0.5;
      const yaw = -0.4 + time * 0.07 + pointer.x * 0.1;
      const coreRadius = size * (compact ? 0.105 : 0.078);
      const project = (p: Point) => {
        const perspective = 8 / (8 - p.z);
        return {
          x: centerX + p.x * scale * perspective,
          y: centerY + p.y * scale * perspective,
          z: p.z,
        };
      };
      if (!compact) {
        const halo = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          size * 0.38,
        );
        halo.addColorStop(0, "rgba(143,105,209,.1)");
        halo.addColorStop(0.4, "rgba(107,69,164,.045)");
        halo.addColorStop(1, "rgba(107,69,164,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, width, height);
      }
      const lines: { a: Point; b: Point; depth: number }[] = [];
      const particles: Point[] = [];
      for (const ring of RINGS) {
        for (let i = 0; i < segments; i++) {
          const a = pointOnRing((i / segments) * TAU, ring, yaw);
          const b = pointOnRing(((i + 1) / segments) * TAU, ring, yaw);
          lines.push({ a: project(a), b: project(b), depth: (a.z + b.z) / 2 });
        }
        particles.push(
          project(pointOnRing(time * ring.speed + ring.phase, ring, yaw)),
        );
      }
      lines.sort((a, b) => a.depth - b.depth);
      const drawLines = (front: boolean) => {
        ctx.lineCap = "round";
        for (const line of lines) {
          if (line.depth >= 0 !== front) continue;
          const light = Math.max(0.16, Math.min(0.78, 0.4 + line.depth * 0.14));
          ctx.strokeStyle = `rgba(189,168,224,${light})`;
          ctx.lineWidth = compact ? 0.8 : 0.65 + (line.depth + 3) * 0.1;
          ctx.beginPath();
          ctx.moveTo(line.a.x, line.a.y);
          ctx.lineTo(line.b.x, line.b.y);
          ctx.stroke();
        }
      };
      const drawParticles = (front: boolean) => {
        for (const p of particles) {
          if (p.z >= 0 !== front) continue;
          const radius = (compact ? 1.3 : 2.8) * (1 + p.z * 0.08);
          const glow = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            radius * 5,
          );
          glow.addColorStop(0, "rgba(222,205,255,.8)");
          glow.addColorStop(0.18, "rgba(172,135,232,.3)");
          glow.addColorStop(1, "rgba(153,110,217,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 5, 0, TAU);
          ctx.fill();
          ctx.fillStyle = front ? "#f3ecff" : "#9d86b8";
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, TAU);
          ctx.fill();
        }
      };
      drawLines(false);
      drawParticles(false);
      const sphere = ctx.createRadialGradient(
        centerX - coreRadius * 0.34,
        centerY - coreRadius * 0.38,
        coreRadius * 0.02,
        centerX + coreRadius * 0.18,
        centerY + coreRadius * 0.15,
        coreRadius * 1.1,
      );
      sphere.addColorStop(0, "#e9e0fa");
      sphere.addColorStop(0.18, "#b4a0d2");
      sphere.addColorStop(0.48, "#67517f");
      sphere.addColorStop(0.78, "#24192f");
      sphere.addColorStop(1, "#0a0710");
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(centerX, centerY, coreRadius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(204,180,240,.2)";
      ctx.lineWidth = 0.65;
      ctx.stroke();
      drawLines(true);
      drawParticles(true);
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTick = 0;
      canvas!.dataset.motion = reduced ? "reduced" : "paused";
    }
    function tick(now: number) {
      if (disposed || !inView || !pageVisible || reduced) {
        stop();
        return;
      }
      if (lastTick) elapsed += Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;
      if (now - lastFrame >= 1000 / fps) {
        paint(elapsed);
        lastFrame = now;
      }
      frame = requestAnimationFrame(tick);
    }
    function start() {
      stop();
      if (inView && pageVisible && !reduced && !disposed) {
        canvas!.dataset.motion = "playing";
        frame = requestAnimationFrame(tick);
      }
    }
    const resize = () => {
      const box = canvas.getBoundingClientRect();
      width = box.width;
      height = box.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      paint(reduced ? 0 : elapsed);
    };
    const move = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(canvas);
    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        start();
      },
      { threshold: 0.01 },
    );
    observer.observe(canvas);
    if (!compact && !reduced)
      window.addEventListener("pointermove", move, { passive: true });
    resize();
    return () => {
      disposed = true;
      stop();
      observer.disconnect();
      sizeObserver.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, [compact, reduced, pageVisible]);
  return (
    <canvas
      ref={ref}
      className={`orbit-visual ${className}`}
      data-orbit={compact ? "mark" : "hero"}
      aria-hidden="true"
    />
  );
}
