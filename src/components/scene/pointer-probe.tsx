'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Raycaster, Vector2 } from 'three'
import { sceneState } from '@/lib/scene-state'

const MAX_HIT_DISTANCE = 70

/** Raycasts the cursor against the volume proxies every frame and publishes a smoothed world-space hit. */
export function PointerProbe() {
  const raycaster = useMemo(() => new Raycaster(), [])
  const ndc = useMemo(() => new Vector2(), [])

  useFrame(({ camera }, delta) => {
    const canHit = sceneState.pointerActive && !sceneState.isTouch && sceneState.proxies.size > 0
    const hits = canHit ? castRay() : []
    const hit = hits[0]

    if (hit && hit.distance < MAX_HIT_DISTANCE) {
      if (sceneState.hitStrength < 0.05) sceneState.hit.copy(hit.point)
      else sceneState.hit.lerp(hit.point, 1 - Math.exp(-delta * 14))
      sceneState.hitStrength = MathUtils.damp(sceneState.hitStrength, 1, 6, delta)
      return
    }
    sceneState.hitStrength = MathUtils.damp(sceneState.hitStrength, 0, 4, delta)

    function castRay() {
      ndc.set(sceneState.pointer.x, sceneState.pointer.y)
      raycaster.setFromCamera(ndc, camera)
      return raycaster.intersectObjects([...sceneState.proxies], false)
    }
  })

  return null
}
