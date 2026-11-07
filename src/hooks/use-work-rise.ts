'use client'

import { useEffect } from 'react'
import type { RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Lusion-style "work" list: everything travels from the bottom up and is tied to the scrollbar (scrubbed, so it reverses too).
 * Markup contract:
 *  - [data-rise]                a card; optional data-speed="0..1" makes it drift upward faster than its neighbours
 *  - [data-rise-media]          inside a card: wipes open from the bottom edge while the photo settles
 *  - [data-rise-line]           text line (put it inside an overflow-hidden wrapper) that slides up out of its mask
 */
const CARD_SELECTOR = '[data-rise]'
const MEDIA_SELECTOR = '[data-rise-media]'
const LINE_SELECTOR = '[data-rise-line]'
const IMAGE_SELECTOR = 'img:not([aria-hidden])'

const CARD_ENTRY_Y_PERCENT = 24
const IMAGE_ENTRY_SCALE = 1.55
const IMAGE_BASE_SCALE = 1.2
const IMAGE_PARALLAX_PERCENT = 8
const SPEED_TRAVEL_PX = 70
const CLIP_CLOSED = 'inset(100% 0% 0% 0%)'
const CLIP_OPEN = 'inset(0% 0% 0% 0%)'

interface UseWorkRiseParams {
  rootRef: RefObject<HTMLElement>
}

export function useWorkRise({ rootRef }: UseWorkRiseParams) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    gsap.registerPlugin(ScrollTrigger)

    const mm = gsap.matchMedia(root)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      root.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach((card) => setupCard({ card }))
      root.querySelectorAll<HTMLElement>(LINE_SELECTOR).forEach((line) => setupLine({ line, isInsideCard: Boolean(line.closest(CARD_SELECTOR)) }))
    })

    ScrollTrigger.refresh()
    return () => mm.revert()
  }, [rootRef])
}

function setupCard({ card }: { card: HTMLElement }) {
  const media = card.querySelector<HTMLElement>(MEDIA_SELECTOR)
  const image = media?.querySelector<HTMLElement>(IMAGE_SELECTOR) ?? null
  const speed = Number(card.dataset.speed ?? 0)

  gsap.set(card, { yPercent: CARD_ENTRY_Y_PERCENT, opacity: 0, willChange: 'transform' })
  if (media) gsap.set(media, { clipPath: CLIP_CLOSED })
  if (image) gsap.set(image, { scale: IMAGE_ENTRY_SCALE, transformOrigin: '50% 50%' })

  const entry = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: card, start: 'top 105%', end: 'top 50%', scrub: 0.7 }
  })
  entry.to(card, { yPercent: 0, duration: 1 }, 0)
  entry.to(card, { opacity: 1, duration: 0.35, ease: 'none' }, 0)
  if (media) entry.to(media, { clipPath: CLIP_OPEN, duration: 0.9, ease: 'power2.inOut' }, 0.05)
  if (image) entry.to(image, { scale: IMAGE_BASE_SCALE, duration: 1 }, 0)

  if (image) {
    gsap.fromTo(
      image,
      { yPercent: -IMAGE_PARALLAX_PERCENT },
      { yPercent: IMAGE_PARALLAX_PERCENT, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } }
    )
  }

  if (speed) {
    gsap.fromTo(
      card,
      { y: speed * SPEED_TRAVEL_PX },
      { y: -speed * SPEED_TRAVEL_PX, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: 0.5 } }
    )
  }
}

function setupLine({ line, isInsideCard }: { line: HTMLElement; isInsideCard: boolean }) {
  const trigger = isInsideCard ? (line.closest(CARD_SELECTOR) as HTMLElement) : line
  gsap.set(line, { yPercent: 115 })
  gsap.to(line, {
    yPercent: 0,
    duration: 1.1,
    ease: 'expo.out',
    delay: isInsideCard ? 0.15 : 0,
    scrollTrigger: { trigger, start: isInsideCard ? 'top 62%' : 'top 90%', toggleActions: 'play none none reverse' }
  })
}
