'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { useRemoteTexture } from '@/hooks/use-remote-texture'
import { sceneState } from '@/lib/scene-state'

interface ImagePlaneProps {
  url: string
  position: Vector3
  /** the plane faces this point (the camera dwell position) */
  faceTo: Vector3
  width: number
  maxHeight: number
  enabled: boolean
  /** seed for idle float + parallax so planes don't move in lockstep */
  phase: number
}

const FALLBACK_COLOR = '#2a2b31'
/** warm hairline border around each photo, in world units */
const FRAME_PADDING = 0.06
const FRAME_OPACITY = 0.7

export function ImagePlane({ url, position, faceTo, width, maxHeight, enabled, phase }: ImagePlaneProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const materialRef = useRef<MeshBasicMaterial>(null)
  const frameMaterialRef = useRef<MeshBasicMaterial>(null)
  const { texture, status, aspect } = useRemoteTexture({ url, enabled })

  const size = useMemo(() => {
    const height = Math.min(maxHeight, width / aspect)
    return { width: Math.min(width, height * aspect), height }
  }, [aspect, maxHeight, width])

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.position.copy(position)
    group.lookAt(faceTo)
  }, [position, faceTo])

  useLayoutEffect(() => {
    if (materialRef.current) materialRef.current.needsUpdate = true
  }, [texture])

  useFrame((state, delta) => {
    const material = materialRef.current
    const mesh = meshRef.current
    if (!material || !mesh) return
    const visible = enabled && (status === 'ready' || status === 'error')
    const target = visible ? 1 : 0
    material.opacity = MathUtils.damp(material.opacity, target, 2.6, delta)
    mesh.visible = material.opacity > 0.01
    if (frameMaterialRef.current) frameMaterialRef.current.opacity = material.opacity * FRAME_OPACITY

    const time = state.clock.elapsedTime
    mesh.position.y = Math.sin(time * 0.5 + phase) * 0.12
    const parallax = sceneState.pointerActive && !sceneState.isTouch ? 1 : 0
    mesh.rotation.y = MathUtils.damp(mesh.rotation.y, sceneState.pointer.x * 0.08 * parallax, 3, delta)
    mesh.rotation.x = MathUtils.damp(mesh.rotation.x, -sceneState.pointer.y * 0.05 * parallax, 3, delta)
  })

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} scale={[size.width, size.height, 1]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          map={status === 'ready' ? texture : null}
          color={status === 'ready' ? '#ffffff' : FALLBACK_COLOR}
          transparent
          opacity={0}
          toneMapped={false}
        />
        <mesh position-z={-0.004} scale={[1 + FRAME_PADDING / size.width, 1 + FRAME_PADDING / size.height, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial ref={frameMaterialRef} color="#f0d6ad" transparent opacity={0} toneMapped={false} depthWrite={false} />
        </mesh>
      </mesh>
    </group>
  )
}
