'use client'

import { useEffect } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { EXIT_RUNWAY } from '@/lib/scene-layout'
import type { SceneLayout } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'

/** Fraction of a project's scroll span (centred on its stop) spent dwelling in front of the photos. */
const DWELL_SHARE = 0.36
/** Slow creep along the spline while dwelling, in world units, so the frame never feels frozen. */
const DWELL_DRIFT_UNITS = 1.4
const SCRUB_SECONDS = 1.1

interface UseCameraTimelineParams {
  layout: SceneLayout
}

/**
 * One GSAP timeline, scrubbed by the journey's scroll progress, that animates the camera's spline parameter:
 * eased travel between projects, a slow drift while dwelling at each one, and a long exit.
 * The render loop only reads `sceneState.cameraU`.
 */
export function useCameraTimeline({ layout }: UseCameraTimelineParams) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    sceneState.cameraU = 0

    const { anchors, length } = layout
    const spacing = 1 / (anchors.length + EXIT_RUNWAY)
    const halfDwell = spacing * DWELL_SHARE * 0.5
    const drift = DWELL_DRIFT_UNITS / length

    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: '#journey',
        start: 'top top',
        end: 'bottom bottom',
        scrub: sceneState.reducedMotion ? true : SCRUB_SECONDS
      }
    })

    let previousU = 0
    let previousTime = 0
    for (const anchor of anchors) {
      const arriveTime = anchor.stop - halfDwell
      const leaveTime = anchor.stop + halfDwell
      timeline.fromTo(
        sceneState,
        { cameraU: previousU },
        { cameraU: anchor.u, duration: arriveTime - previousTime, ease: 'power3.inOut', immediateRender: false },
        previousTime
      )
      timeline.fromTo(
        sceneState,
        { cameraU: anchor.u },
        { cameraU: anchor.u + drift, duration: leaveTime - arriveTime, ease: 'none', immediateRender: false },
        arriveTime
      )
      previousU = anchor.u + drift
      previousTime = leaveTime
    }
    timeline.fromTo(
      sceneState,
      { cameraU: previousU },
      { cameraU: 1, duration: 1 - previousTime, ease: 'power2.inOut', immediateRender: false },
      previousTime
    )

    return () => {
      timeline.scrollTrigger?.kill()
      timeline.kill()
    }
  }, [layout])
}
