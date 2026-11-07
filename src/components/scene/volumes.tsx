'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BoxGeometry, Color, CylinderGeometry, InstancedBufferAttribute, InstancedMesh, MathUtils, Object3D } from 'three'
import type { BufferGeometry, Group } from 'three'
import type { VolumeKind, VolumeSpec } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'
import { createVolumeMaterials } from './volume-material'

interface VolumesProps {
  volumes: VolumeSpec[]
  /** hero cluster tilts toward the cursor */
  tilt?: boolean
  /** subdivisions per box edge (cursor displacement needs a few; far geometry needs none) */
  segments?: number
  /** register invisible proxies so the pointer probe can raycast these volumes */
  interactive?: boolean
  castShadow?: boolean
  receiveShadow?: boolean
}

interface VolumeChunk {
  kind: VolumeKind
  specs: VolumeSpec[]
}

const dummy = new Object3D()
const tint = new Color()
const BOUNDS_PADDING = 5
const GOLDEN = 0.6180339887

/** Groups volumes by (kind, chunk) so each group is one instanced draw call that frustum-culls on its own. */
function groupVolumes({ volumes }: { volumes: VolumeSpec[] }) {
  const groups = new Map<string, VolumeChunk>()
  for (const spec of volumes) {
    const key = `${spec.kind}:${spec.chunk}`
    const group = groups.get(key)
    if (group) group.specs.push(spec)
    else groups.set(key, { kind: spec.kind, specs: [spec] })
  }
  return [...groups.values()]
}

function createGeometry({ kind, segments }: { kind: VolumeKind; segments: number }) {
  const geometry = kind === 'cylinder' ? new CylinderGeometry(0.5, 0.5, 1, 20, 1) : new BoxGeometry(1, 1, 1, segments, segments, segments)
  geometry.translate(0, 0.5, 0)
  return geometry
}

export function Volumes({ volumes, tilt = false, segments = 4, interactive = false, castShadow = true, receiveShadow = true }: VolumesProps) {
  const groupRef = useRef<Group>(null)

  const built = useMemo(() => {
    const materials = createVolumeMaterials({ displace: interactive })
    const proxyGeometry = new BoxGeometry(1, 1, 1)
    proxyGeometry.translate(0, 0.5, 0)
    const geometries: BufferGeometry[] = [proxyGeometry]
    const meshes: InstancedMesh[] = []
    const proxies: InstancedMesh[] = []

    for (const chunk of groupVolumes({ volumes })) {
      const geometry = createGeometry({ kind: chunk.kind, segments })
      geometries.push(geometry)
      const params = new Float32Array(chunk.specs.length * 4)
      chunk.specs.forEach((spec, index) => params.set([spec.delay, (index * GOLDEN) % 1, spec.windowDensity, spec.emissive], index * 4))
      geometry.setAttribute('aParams', new InstancedBufferAttribute(params, 4))

      const mesh = new InstancedMesh(geometry, chunk.kind === 'cylinder' ? materials.cylinder : materials.box, chunk.specs.length)
      mesh.customDepthMaterial = materials.depth
      mesh.castShadow = castShadow
      mesh.receiveShadow = receiveShadow
      const proxy = interactive ? new InstancedMesh(proxyGeometry, undefined, chunk.specs.length) : null
      if (proxy) proxy.visible = false

      chunk.specs.forEach((spec, index) => {
        dummy.position.set(...spec.position)
        dummy.rotation.set(0, spec.rotationY, 0)
        dummy.scale.set(...spec.size)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
        proxy?.setMatrixAt(index, dummy.matrix)
        mesh.setColorAt(index, tint.set(spec.tint))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      mesh.computeBoundingSphere()
      if (mesh.boundingSphere) mesh.boundingSphere.radius += BOUNDS_PADDING
      meshes.push(mesh)
      if (proxy) {
        proxy.instanceMatrix.needsUpdate = true
        proxy.computeBoundingSphere()
        proxy.frustumCulled = false
        proxies.push(proxy)
      }
    }
    return { materials, geometries, meshes, proxies }
  }, [volumes, segments, interactive, castShadow, receiveShadow])

  useEffect(() => {
    const { proxies } = built
    proxies.forEach((proxy) => sceneState.proxies.add(proxy))
    return () => {
      proxies.forEach((proxy) => sceneState.proxies.delete(proxy))
    }
  }, [built])

  useEffect(
    () => () => {
      built.geometries.forEach((geometry) => geometry.dispose())
      built.materials.dispose()
      built.meshes.forEach((mesh) => mesh.dispose())
    },
    [built]
  )

  useFrame((state, delta) => {
    const { uniforms } = built.materials
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uIntro.value = sceneState.intro
    uniforms.uMouse.value.copy(sceneState.hit)
    uniforms.uMouseStrength.value = interactive ? sceneState.hitStrength : 0

    const group = groupRef.current
    if (!tilt || !group) return
    const enabled = sceneState.pointerActive && !sceneState.isTouch
    const targetY = enabled ? sceneState.pointer.x * 0.07 : 0
    const targetX = enabled ? -sceneState.pointer.y * 0.035 : 0
    group.rotation.y = MathUtils.damp(group.rotation.y, targetY, 2.5, delta)
    group.rotation.x = MathUtils.damp(group.rotation.x, targetX, 2.5, delta)
  })

  return (
    <group ref={groupRef}>
      {built.meshes.map((mesh) => (
        <primitive key={mesh.uuid} object={mesh} />
      ))}
      {built.proxies.map((proxy) => (
        <primitive key={proxy.uuid} object={proxy} />
      ))}
    </group>
  )
}
