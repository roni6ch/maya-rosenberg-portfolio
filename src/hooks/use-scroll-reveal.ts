'use client'

import { useEffect } from 'react'
import type { RefObject } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/**
 * Markup contract (all optional except data-reveal):
 *  - [data-reveal]            card/blocks that stagger in (value "soft" = fade + rise only)
 *  - [data-reveal-media]      wrapper inside a card that wipes open (clip-path) while its <img> settles
 *  - [data-reveal-line]       text lines inside a card that stagger after the card
 */
const REVEAL_SELECTOR = '[data-reveal]'
const MEDIA_SELECTOR = '[data-reveal-media]'
const LINE_SELECTOR = '[data-reveal-line]'
const IMAGE_SELECTOR = 'img:not([aria-hidden])'

const IMAGE_BASE_SCALE = 1.15
const IMAGE_ENTRY_SCALE = 1.4
const PARALLAX_PERCENT = 7
const CLIP_CLOSED = 'inset(100% 0% 0% 0%)'
const CLIP_OPEN = 'inset(0% 0% 0% 0%)'

interface UseScrollRevealParams {
  /** container whose descendants are revealed */
  rootRef: RefObject<HTMLElement>
  /** element that actually scrolls (defaults to the window, used by Lenis) */
  scrollerRef?: RefObject<HTMLElement>
  /** re-runs the setup when the revealed content changes (e.g. the open project id) */
  contentKey?: string | number
  enabled?: boolean
}

interface RevealParts {
  card: HTMLElement
  media: HTMLElement | null
  image: HTMLElement | null
  lines: HTMLElement[]
  isSoft: boolean
}

function getParts({ card }: { card: HTMLElement }): RevealParts {
  const media = card.querySelector<HTMLElement>(MEDIA_SELECTOR)
  return {
    card,
    media,
    image: media?.querySelector<HTMLElement>(IMAGE_SELECTOR) ?? null,
    lines: Array.from(card.querySelectorAll<HTMLElement>(LINE_SELECTOR)),
    isSoft: card.dataset.reveal === 'soft'
  }
}

/** Lusion-style staggered card entry (translate + scale + opacity + clip wipe) with scrubbed image parallax. */
export function useScrollReveal({ rootRef, scrollerRef, contentKey, enabled = true }: UseScrollRevealParams) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return
    gsap.registerPlugin(ScrollTrigger)
    const scroller = scrollerRef?.current ?? undefined

    const mm = gsap.matchMedia(root)
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cards = Array.from(root.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
      if (!cards.length) return
      const partsByCard = new Map(cards.map((card) => [card, getParts({ card })]))

      partsByCard.forEach(({ card, media, image, lines, isSoft }) => {
        gsap.set(card, { opacity: 0, y: isSoft ? 48 : 90, scale: isSoft ? 1 : 0.94, willChange: 'transform, opacity' })
        if (media) gsap.set(media, { clipPath: CLIP_CLOSED })
        if (image) gsap.set(image, { scale: IMAGE_ENTRY_SCALE, yPercent: 0, transformOrigin: '50% 50%' })
        if (lines.length) gsap.set(lines, { opacity: 0, y: 26 })

        if (!image) return
        gsap.fromTo(
          image,
          { yPercent: -PARALLAX_PERCENT },
          { yPercent: PARALLAX_PERCENT, ease: 'none', scrollTrigger: { trigger: card, scroller, start: 'top bottom', end: 'bottom top', scrub: true } }
        )
      })

      ScrollTrigger.batch(cards, {
        scroller,
        start: 'top 90%',
        once: true,
        interval: 0.08,
        batchMax: 6,
        onEnter: (batch) => {
          const targets = batch as HTMLElement[]
          const timeline = gsap.timeline({
            onComplete: () => {
              gsap.set(targets, { clearProps: 'willChange' })
            }
          })
          targets.forEach((card, index) => {
            const parts = partsByCard.get(card)
            if (!parts) return
            const at = index * 0.12
            timeline.to(card, { opacity: 1, y: 0, scale: 1, duration: 1.15, ease: 'expo.out' }, at)
            if (parts.media) timeline.to(parts.media, { clipPath: CLIP_OPEN, duration: 1.3, ease: 'expo.inOut' }, at + 0.05)
            if (parts.image) timeline.to(parts.image, { scale: IMAGE_BASE_SCALE, duration: 1.8, ease: 'expo.out' }, at + 0.05)
            if (parts.lines.length) timeline.to(parts.lines, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, at + 0.35)
          })
        }
      })
    })

    ScrollTrigger.refresh()
    return () => mm.revert()
  }, [rootRef, scrollerRef, contentKey, enabled])
}
