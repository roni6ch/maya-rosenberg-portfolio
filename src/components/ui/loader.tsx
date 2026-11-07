'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { startIntro, useSceneReady } from '@/lib/scene-state'

const MIN_DISPLAY_SECONDS = 0.9
const MAX_WAIT_MS = 8000

export function Loader() {
  const isReady = useSceneReady()
  const [isForced, setIsForced] = useState(false)
  const [isHidden, setIsHidden] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isReady) return
    const timeout = setTimeout(() => setIsForced(true), MAX_WAIT_MS)
    return () => clearTimeout(timeout)
  }, [isReady])

  const shouldStart = isReady || isForced
  useEffect(() => {
    if (!shouldStart || !rootRef.current || !contentRef.current) return
    const timeline = gsap.timeline({ delay: MIN_DISPLAY_SECONDS, onComplete: () => setIsHidden(true) })
    timeline
      .to(contentRef.current, { opacity: 0, y: -12, duration: 0.6, ease: 'power2.in' })
      .add(() => startIntro(), '<0.25')
      .to(rootRef.current, { opacity: 0, duration: 1.1, ease: 'power1.inOut' }, '<0.1')
    return () => {
      timeline.kill()
    }
  }, [shouldStart])

  if (isHidden) return null

  return (
    <div ref={rootRef} className="fixed inset-0 z-50 grid place-items-center bg-paper" role="status" aria-label="Loading">
      <div ref={contentRef} className="flex flex-col items-center gap-6">
        <p className="text-[11px] font-extralight uppercase tracking-[0.5em] text-ink">Maya Rosenberg</p>
        <div className="relative h-px w-40 overflow-hidden bg-ink/10">
          <div className="loader-line absolute inset-y-0 left-0 w-full bg-ink" />
        </div>
        <p className="text-[10px] font-extralight uppercase tracking-[0.4em] text-ink/45">Architect</p>
      </div>
    </div>
  )
}
