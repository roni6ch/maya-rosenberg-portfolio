'use client'

import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, Vector3 } from 'three'
import type { PerspectiveCamera } from 'three'
import type { SceneLayout } from '@/lib/scene-layout'
import { sceneState, setActiveIndex, setNearIndex } from '@/lib/scene-state'

interface CameraRigProps {
  layout: SceneLayout
}

const INTRO_OFFSET = new Vector3(7, 11, 34)
const HERO_LOOK = new Vector3(0, 3, 0)
const BASE_FOV = 42
const FOV_KICK = 8
/** world units per second that count as "full speed" for velocity-driven effects */
const FULL_SPEED = 20
const ROLL_SAMPLE = 0.004
const ROLL_GAIN = 46
const MAX_ROLL = 0.1
/** the camera counts as dwelling at a project when it is this close (world units along the spline) */
const DWELL_RADIUS = 7

function easeInOutCubic({ t }: { t: number }) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Drives the camera from the scroll timeline: spline position, a look-at that yaws toward the photo wall,
 * banking from the path's curvature, a velocity-driven FOV kick, cursor parallax and the intro fly-in.
 * Also publishes the look/focus targets that the key light, ground and depth of field follow.
 */
export function CameraRig({ layout }: CameraRigProps) {
  const vectors = useMemo(
    () => ({ position: new Vector3(), look: new Vector3(), focus: new Vector3(), tangentA: new Vector3(), tangentB: new Vector3() }),
    []
  )
  const motion = useMemo(() => ({ previousU: 0, roll: 0, fov: BASE_FOV }), [])

  useFrame((state, delta) => {
    const camera = state.camera as PerspectiveCamera
    const u = MathUtils.clamp(sceneState.cameraU, 0, 1)

    layout.curve.getPointAt(u, vectors.position)
    layout.getLookTarget({ u, out: vectors.look, focusOut: vectors.focus })

    const speed = (Math.abs(u - motion.previousU) * layout.length) / Math.max(delta, 1 / 240)
    motion.previousU = u
    sceneState.velocity = MathUtils.damp(sceneState.velocity, MathUtils.clamp(speed / FULL_SPEED, 0, 1), 4, delta)

    const flight = easeInOutCubic({ t: MathUtils.clamp(sceneState.intro / 0.88, 0, 1) })
    const parallax = sceneState.pointerActive && !sceneState.isTouch ? 1 : 0
    vectors.look.x += sceneState.pointer.x * 1.3 * parallax * flight
    vectors.look.y += sceneState.pointer.y * 0.7 * parallax * flight
    vectors.position.x += sceneState.pointer.x * 0.35 * parallax * flight
    vectors.position.y += Math.sin(state.clock.elapsedTime * 0.45) * 0.05 * flight

    vectors.position.addScaledVector(INTRO_OFFSET, 1 - flight)
    vectors.look.lerpVectors(HERO_LOOK, vectors.look, flight)
    vectors.focus.lerpVectors(HERO_LOOK, vectors.focus, flight)

    camera.position.copy(vectors.position)
    camera.lookAt(vectors.look)

    layout.curve.getTangentAt(u, vectors.tangentA)
    layout.curve.getTangentAt(Math.min(1, u + ROLL_SAMPLE), vectors.tangentB)
    const turn = vectors.tangentA.x * vectors.tangentB.z - vectors.tangentA.z * vectors.tangentB.x
    const targetRoll = MathUtils.clamp(turn * ROLL_GAIN, -MAX_ROLL, MAX_ROLL) * flight
    motion.roll = MathUtils.damp(motion.roll, targetRoll, 2.5, delta)
    camera.rotateZ(motion.roll)

    motion.fov = MathUtils.damp(motion.fov, BASE_FOV + sceneState.velocity * FOV_KICK, 3, delta)
    if (Math.abs(camera.fov - motion.fov) > 0.01) {
      camera.fov = motion.fov
      camera.updateProjectionMatrix()
    }

    sceneState.cameraTarget.copy(vectors.look)
    sceneState.focusDistance = MathUtils.damp(sceneState.focusDistance, camera.position.distanceTo(vectors.focus), 3.2, delta)

    updateActiveProject(u)
  })

  function updateActiveProject(u: number) {
    let nearest = 0
    let nearestDistance = Infinity
    layout.anchors.forEach((anchor, index) => {
      const distance = Math.abs(u - anchor.u) * layout.length
      if (distance >= nearestDistance) return
      nearest = index
      nearestDistance = distance
    })
    setNearIndex({ index: nearest })
    setActiveIndex({ index: nearestDistance < DWELL_RADIUS ? nearest : -1 })
  }

  return null
}
