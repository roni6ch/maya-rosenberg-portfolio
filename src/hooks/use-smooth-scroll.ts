'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { sceneState, scrollApi, useIntroDone } from '@/lib/scene-state'

const LOCK_CLASS = 'is-intro'

/** Lenis smooth scroll wired into GSAP's ticker, and a ScrollTrigger that feeds the 3D camera progress. */
export function useSmoothScroll() {
  const introDone = useIntroDone()

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    document.documentElement.classList.add(LOCK_CLASS)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    sceneState.reducedMotion = reduced

    let lenis: Lenis | null = null
    let tick: ((time: number) => void) | null = null
    if (!reduced) {
      lenis = new Lenis({ duration: 1.25, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true })
      lenis.on('scroll', ScrollTrigger.update)
      tick = (time) => lenis?.raf(time * 1000)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
      scrollApi.lenis = lenis
    }

    const trigger = ScrollTrigger.create({
      trigger: '#journey',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        sceneState.progress = self.progress
      }
    })

    return () => {
      trigger.kill()
      if (tick) gsap.ticker.remove(tick)
      lenis?.destroy()
      scrollApi.lenis = null
    }
  }, [])

  useEffect(() => {
    if (!introDone) return
    document.documentElement.classList.remove(LOCK_CLASS)
    ScrollTrigger.refresh()
  }, [introDone])
}

interface ScrollToParams {
  target: string
}

export function scrollToSection({ target }: ScrollToParams) {
  const element = document.querySelector(target)
  if (!element) return
  if (scrollApi.lenis) return scrollApi.lenis.scrollTo(element as HTMLElement, { duration: 2 })
  element.scrollIntoView({ behavior: 'smooth' })
}
