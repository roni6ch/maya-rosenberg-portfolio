'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useIntroDone } from '@/lib/scene-state'

interface HeroOverlayProps {
  tagline: string
}

export function HeroOverlay({ tagline }: HeroOverlayProps) {
  const introDone = useIntroDone()
  const scrollFadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    const tween = gsap.to(scrollFadeRef.current, {
      opacity: 0,
      y: -60,
      ease: 'none',
      scrollTrigger: { trigger: '#journey', start: 'top top', end: '+=55%', scrub: true }
    })
    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <div ref={scrollFadeRef} className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] mix-blend-difference md:px-12 md:pb-14">
      <div className={`flex items-end justify-between gap-6 transition-all duration-[1600ms] ease-out ${introDone ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}>
        <div>
          <p className="mb-4 text-[10px] font-light uppercase tracking-[0.5em] text-white/70">{tagline}</p>
          <h1 className="text-[clamp(2.2rem,11vw,7.5rem)] font-extralight uppercase leading-[0.95] tracking-[0.08em] text-white">
            Maya
            <br />
            Rosenberg
          </h1>
        </div>
        <div className="hidden items-center gap-4 pb-2 md:flex">
          <span className="text-[10px] font-light uppercase tracking-[0.4em] text-white/70">Scroll</span>
          <span className="scroll-cue block h-12 w-px bg-white/50" />
        </div>
      </div>
    </div>
  )
}
