'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, Color, CylinderGeometry, InstancedMesh, MathUtils, MeshStandardMaterial, Object3D, SphereGeometry } from 'three'
import type { BufferGeometry, Group } from 'three'
import type { PropKind, PropSpec } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'

interface LandscapeProps {
  props: PropSpec[]
  castShadow?: boolean
  receiveShadow?: boolean
}

const dummy = new Object3D()
const tint = new Color()

interface KindGroup {
  kind: PropKind
  specs: PropSpec[]
}

const SPHERE_KINDS = new Set<PropKind>(['canopy', 'lampHead'])
const CYLINDER_KINDS = new Set<PropKind>(['trunk', 'lamp'])

function groupByKind({ props }: { props: PropSpec[] }) {
  const groups = new Map<PropKind, KindGroup>()
  for (const spec of props) {
    const group = groups.get(spec.kind)
    if (group) group.specs.push(spec)
    else groups.set(spec.kind, { kind: spec.kind, specs: [spec] })
  }
  return [...groups.values()]
}

function createGeometry({ kind }: { kind: PropKind }) {
  if (SPHERE_KINDS.has(kind)) return new SphereGeometry(0.5, 14, 10)
  if (CYLINDER_KINDS.has(kind)) {
    const geometry = new CylinderGeometry(0.5, 0.5, 1, 8, 1)
    geometry.translate(0, 0.5, 0)
    return geometry
  }
  const geometry = new BoxGeometry(1, 1, 1)
  geometry.translate(0, 0.5, 0)
  return geometry
}

function createMaterial({ kind }: { kind: PropKind }) {
  if (kind === 'lampHead')
    return new MeshStandardMaterial({ color: '#f3e6c8', roughness: 0.28, metalness: 0.35, emissive: '#e8c888', emissiveIntensity: 0.45 })
  if (kind === 'canopy') return new MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.02, flatShading: true })
  if (kind === 'plaza') return new MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, metalness: 0.04 })
  return new MeshStandardMaterial({ color: '#ffffff', roughness: 0.86, metalness: 0.05 })
}

/** Instanced landscaping and street furniture — olive canopies, limestone planters, brass lamp heads. */
export function Landscape({ props, castShadow = true, receiveShadow = true }: LandscapeProps) {
  const groupRef = useRef<Group>(null)

  const built = useMemo(() => {
    const geometries: BufferGeometry[] = []
    const materials: MeshStandardMaterial[] = []
    const meshes: InstancedMesh[] = []

    for (const chunk of groupByKind({ props })) {
      const geometry = createGeometry({ kind: chunk.kind })
      const material = createMaterial({ kind: chunk.kind })
      geometries.push(geometry)
      materials.push(material)
      const mesh = new InstancedMesh(geometry, material, chunk.specs.length)
      mesh.castShadow = chunk.kind !== 'plaza' && chunk.kind !== 'lampHead' && castShadow
      mesh.receiveShadow = receiveShadow
      mesh.frustumCulled = true
      chunk.specs.forEach((spec, index) => {
        dummy.position.set(...spec.position)
        dummy.rotation.set(0, spec.rotationY, 0)
        dummy.scale.set(0, 0, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
        mesh.setColorAt(index, tint.set(spec.tint))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.userData = { specs: chunk.specs, settled: false }
      meshes.push(mesh)
    }

    return { geometries, materials, meshes }
  }, [props, castShadow, receiveShadow])

  useEffect(
    () => () => {
      built.geometries.forEach((geometry) => geometry.dispose())
      built.materials.forEach((material) => material.dispose())
      built.meshes.forEach((mesh) => mesh.dispose())
    },
    [built]
  )

  useFrame(() => {
    const intro = sceneState.intro
    for (const mesh of built.meshes) {
      const specs = mesh.userData.specs as PropSpec[]
      if (mesh.userData.settled && intro >= 1) continue
      specs.forEach((spec, index) => {
        const reveal = MathUtils.smoothstep(intro, spec.delay, spec.delay + 0.4)
        const eased = 1 - Math.pow(1 - reveal, 3)
        dummy.position.set(...spec.position)
        dummy.rotation.set(0, spec.rotationY, 0)
        dummy.scale.set(spec.size[0] * eased, spec.size[1] * eased, spec.size[2] * eased)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (intro >= 1) mesh.userData.settled = true
    }
  })

  return (
    <group ref={groupRef}>
      {built.meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
    </group>
  )
}
