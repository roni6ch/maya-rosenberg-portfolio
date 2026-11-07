'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, MathUtils, Vector3 } from 'three'
import type { LineBasicMaterial, Mesh } from 'three'
import type { SceneLayout } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'

const UP = new Vector3(0, 1, 0)
const PATH_HALF_WIDTH = 1.7
const PATH_Y = 0.035

interface GroundProps {
  receiveShadow: boolean
}

/** Dark concrete ground that follows the camera so it always fills the frame. */
export function Ground({ receiveShadow }: GroundProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.x = Math.round(sceneState.cameraTarget.x / 20) * 20
    mesh.position.z = Math.round(sceneState.cameraTarget.z / 20) * 20
  })

  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} receiveShadow={receiveShadow}>
      <planeGeometry args={[520, 520]} />
      <meshStandardMaterial color="#101116" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}

interface PathwayProps {
  layout: SceneLayout
  receiveShadow: boolean
}

/** A glossy road ribbon laid along the camera spline, with warm edge lines, so the journey reads as a street. */
export function Pathway({ layout, receiveShadow }: PathwayProps) {
  const { ribbon, edges } = useMemo(() => {
    const steps = Math.ceil(layout.length)
    const positions = new Float32Array((steps + 1) * 2 * 3)
    const normals = new Float32Array((steps + 1) * 2 * 3)
    const indices: number[] = []
    const edgePositions: number[] = []
    const point = new Vector3()
    const tangent = new Vector3()
    const right = new Vector3()
    let previous: Vector3[] | null = null

    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      layout.curve.getPointAt(u, point)
      layout.curve.getTangentAt(u, tangent).normalize()
      tangent.y = 0
      right.crossVectors(tangent.normalize(), UP).normalize()
      const left = new Vector3(point.x - right.x * PATH_HALF_WIDTH, PATH_Y, point.z - right.z * PATH_HALF_WIDTH)
      const rightPoint = new Vector3(point.x + right.x * PATH_HALF_WIDTH, PATH_Y, point.z + right.z * PATH_HALF_WIDTH)
      positions.set([left.x, left.y, left.z, rightPoint.x, rightPoint.y, rightPoint.z], i * 6)
      normals.set([0, 1, 0, 0, 1, 0], i * 6)
      if (i > 0) {
        const a = (i - 1) * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
      if (previous) edgePositions.push(...previous[0].toArray(), ...left.toArray(), ...previous[1].toArray(), ...rightPoint.toArray())
      previous = [left, rightPoint]
    }

    const ribbonGeometry = new BufferGeometry()
    ribbonGeometry.setAttribute('position', new BufferAttribute(positions, 3))
    ribbonGeometry.setAttribute('normal', new BufferAttribute(normals, 3))
    ribbonGeometry.setIndex(indices)
    const edgeGeometry = new BufferGeometry()
    edgeGeometry.setAttribute('position', new BufferAttribute(new Float32Array(edgePositions), 3))
    return { ribbon: ribbonGeometry, edges: edgeGeometry }
  }, [layout])

  useEffect(
    () => () => {
      ribbon.dispose()
      edges.dispose()
    },
    [ribbon, edges]
  )

  return (
    <group>
      <mesh geometry={ribbon} receiveShadow={receiveShadow} frustumCulled={false}>
        <meshStandardMaterial color="#17181d" roughness={0.32} metalness={0.25} />
      </mesh>
      <lineSegments geometry={edges} frustumCulled={false}>
        <lineBasicMaterial color="#c79a64" transparent opacity={0.3} toneMapped={false} />
      </lineSegments>
    </group>
  )
}

interface StructuralFramesProps {
  frames: Float32Array
}

/** Structural skeletons (columns, beams, bracing) drawn as fine warm lines; fades in with the intro. */
export function StructuralFrames({ frames }: StructuralFramesProps) {
  const materialRef = useRef<LineBasicMaterial>(null)
  const geometry = useMemo(() => {
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(frames, 3))
    return buffer
  }, [frames])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const material = materialRef.current
    if (!material) return
    material.opacity = 0.62 * MathUtils.smoothstep(sceneState.intro, 0.45, 0.95)
  })

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial ref={materialRef} color="#efcfa4" transparent opacity={0} toneMapped={false} depthWrite={false} />
    </lineSegments>
  )
}
