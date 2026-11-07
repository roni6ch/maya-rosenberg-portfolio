'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BackSide, Color } from 'three'
import type { DirectionalLight, Mesh } from 'three'
import { sceneState } from '@/lib/scene-state'

const KEY_OFFSET = { x: -22, y: 28, z: 16 }
const SHADOW_EXTENT = 38
const SHADOW_SNAP = 0.5

interface KeyLightProps {
  castShadow: boolean
}

/** Late-morning Mediterranean sun that rides along the spline; shadow frustum is texel-snapped. */
export function KeyLight({ castShadow }: KeyLightProps) {
  const scene = useThree((state) => state.scene)
  const lightRef = useRef<DirectionalLight>(null)
  const frameCount = useRef(0)

  useEffect(() => {
    const light = lightRef.current
    if (!light) return
    light.shadow.autoUpdate = false
    scene.add(light.target)
    return () => {
      scene.remove(light.target)
    }
  }, [scene])

  useFrame(() => {
    const light = lightRef.current
    if (!light) return
    const x = Math.round(sceneState.cameraTarget.x / SHADOW_SNAP) * SHADOW_SNAP
    const z = Math.round(sceneState.cameraTarget.z / SHADOW_SNAP) * SHADOW_SNAP
    light.target.position.set(x, 0, z)
    light.position.set(x + KEY_OFFSET.x, KEY_OFFSET.y, z + KEY_OFFSET.z)
    light.target.updateMatrixWorld()
    frameCount.current += 1
    light.shadow.needsUpdate = frameCount.current % 2 === 0
  })

  return (
    <directionalLight
      ref={lightRef}
      color="#fff1dc"
      intensity={3.2}
      castShadow={castShadow}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-SHADOW_EXTENT}
      shadow-camera-right={SHADOW_EXTENT}
      shadow-camera-top={SHADOW_EXTENT}
      shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={0.5}
      shadow-camera-far={110}
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
    />
  )
}

/** Cool sky bounce + warm ground bounce + a procedural daylight environment (no remote HDR). */
export function SceneLights() {
  return (
    <>
      <hemisphereLight args={['#b7c8dc', '#c9bba8', 1.15]} />
      <directionalLight position={[18, 10, -16]} color="#dce6f2" intensity={0.55} />
      <Environment resolution={256} frames={1} environmentIntensity={0.7}>
        <Lightformer form="rect" intensity={6.5} color="#fff4e0" position={[-12, 14, 8]} rotation-y={Math.PI / 3} scale={[16, 8, 1]} />
        <Lightformer form="rect" intensity={3.2} color="#c5d6ea" position={[12, 8, -10]} rotation-y={-Math.PI / 3} scale={[16, 7, 1]} />
        <Lightformer form="ring" intensity={2.8} color="#fffaf0" position={[0, 16, 0]} rotation-x={Math.PI / 2} scale={10} />
        <Lightformer form="rect" intensity={1.6} color="#f4eee4" position={[0, 3, 14]} scale={[20, 3, 1]} />
      </Environment>
    </>
  )
}

interface SunDiscProps {
  visible: boolean
}

/** Bright disc in the sun direction so the sky has a readable light source. */
export function SunDisc({ visible }: SunDiscProps) {
  const meshRef = useRef<Mesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.set(sceneState.cameraTarget.x + KEY_OFFSET.x * 3.2, KEY_OFFSET.y * 2.6, sceneState.cameraTarget.z + KEY_OFFSET.z * 3.2)
  })

  if (!visible) return null

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <sphereGeometry args={[2.6, 16, 16]} />
      <meshBasicMaterial color="#fff6e4" toneMapped={false} />
    </mesh>
  )
}

const horizonVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const horizonFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDirection;
  void main() {
    float h = vDirection.y;
    vec3 color = mix(uHorizon, uTop, smoothstep(0.0, 0.42, h));
    color = mix(color, uBottom, smoothstep(0.0, -0.22, h));
    float glow = exp(-pow(h * 4.2, 2.0));
    color += uHorizon * glow * 0.22;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** Inverted dome with a pale Mediterranean sky and a warm limestone horizon band. */
export function HorizonGlow() {
  const meshRef = useRef<Mesh>(null)
  const material = useMemo(
    () => ({
      uTop: { value: new Color('#8eabc4') },
      uHorizon: { value: new Color('#f0e6d4') },
      uBottom: { value: new Color('#d4cfc4') }
    }),
    []
  )

  useFrame(({ camera }) => {
    meshRef.current?.position.copy(camera.position)
  })

  return (
    <mesh ref={meshRef} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[190, 24, 16]} />
      <shaderMaterial
        uniforms={material}
        vertexShader={horizonVertex}
        fragmentShader={horizonFragment}
        side={BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  )
}
