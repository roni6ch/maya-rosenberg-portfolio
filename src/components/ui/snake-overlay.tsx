'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { sceneState } from '@/lib/scene-state'

/** Viewport-locked serpentine line, drawn from cameraU and shifted with pointer parallax. */
export function SnakeOverlay() {
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const pathNode = pathRef.current
    const svgNode = svgRef.current
    if (!pathNode || !svgNode) return
    const line: SVGPathElement = pathNode
    const overlay: SVGSVGElement = svgNode

    const length = line.getTotalLength()
    line.style.strokeDasharray = `${length}`
    line.style.strokeDashoffset = `${length}`

    let frame = 0
    function tick() {
      const drawn = Math.min(1, sceneState.intro * 0.16 + sceneState.cameraU * 0.84)
      line.style.strokeDashoffset = `${length * (1 - drawn)}`
      const parallax = sceneState.pointerActive && !sceneState.isTouch ? 1 : 0
      overlay.style.transform = `translate3d(${sceneState.pointer.x * 18 * parallax}px, ${-sceneState.pointer.y * 10 * parallax}px, 0)`
      const fade = sceneState.progress < 0.88 ? 1 : Math.max(0, 1 - (sceneState.progress - 0.88) / 0.1)
      overlay.style.opacity = String(fade)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <svg
      ref={svgRef}
      className="snake-overlay pointer-events-none fixed inset-0 z-[12] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        ref={pathRef}
        d="M 12 4 C 28 14, 72 10, 86 22 C 98 32, 70 40, 48 46 C 18 54, 8 64, 22 74 C 38 86, 78 80, 92 96"
        fill="none"
        stroke="#8a7d6e"
        strokeWidth="0.28"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

interface SnakeTrailProps {
  target: string
}

/** Page-height trail that weaves through the 2D sections after the 3D journey. */
export function SnakeTrail({ target }: SnakeTrailProps) {
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    const root = document.querySelector(target)
    if (!path || !root) return
    gsap.registerPlugin(ScrollTrigger)
    const length = path.getTotalLength()
    const tween = gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      {
        strokeDashoffset: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: root,
          start: 'top 80%',
          end: 'bottom bottom',
          scrub: 1.15
        }
      }
    )
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [target])

  return (
    <svg className="pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <path
        ref={pathRef}
        d="M 78 0 C 90 8, 86 16, 62 20 C 28 26, 18 34, 38 42 C 62 50, 88 56, 70 64 C 46 74, 12 78, 24 88 C 36 96, 68 94, 82 100"
        fill="none"
        stroke="#b7aea0"
        strokeWidth="0.22"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
