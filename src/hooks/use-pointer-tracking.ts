'use client'

import { useEffect } from 'react'
import { sceneState } from '@/lib/scene-state'

/** Normalised (-1..1) cursor position, shared with the render loop without React state. */
export function usePointerTracking() {
  useEffect(() => {
    function onMove(event: PointerEvent) {
      sceneState.isTouch = event.pointerType === 'touch'
      sceneState.pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      sceneState.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1)
      sceneState.pointerActive = true
    }
    function onLeave() {
      sceneState.pointerActive = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [])
}
