'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BackSide, Color } from 'three'
import type { DirectionalLight, Mesh } from 'three'
import { sceneState } from '@/lib/scene-state'

const KEY_OFFSET = { x: -15, y: 16, z: 10 }
const SHADOW_EXTENT = 38
const SHADOW_SNAP = 0.5

interface KeyLightProps {
  castShadow: boolean
}

/** Warm low-angle sun that rides along the spline; its shadow frustum is texel-snapped and refreshed every other frame. */
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
      color="#ffd7b0"
      intensity={2.6}
      castShadow={castShadow}
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-SHADOW_EXTENT}
      shadow-camera-right={SHADOW_EXTENT}
      shadow-camera-top={SHADOW_EXTENT}
      shadow-camera-bottom={-SHADOW_EXTENT}
      shadow-camera-near={0.5}
      shadow-camera-far={95}
      shadow-bias={-0.0004}
      shadow-normalBias={0.05}
    />
  )
}

/** Cool rim + sky/ground bounce + a procedural studio environment (no remote HDR) for glass and concrete reflections. */
export function SceneLights() {
  return (
    <>
      <hemisphereLight args={['#6f7f9c', '#1d1a18', 0.7]} />
      <directionalLight position={[16, 9, -18]} color="#93a8cf" intensity={0.9} />
      <Environment resolution={256} frames={1} environmentIntensity={0.45}>
        <Lightformer form="rect" intensity={4.5} color="#ffcf9f" position={[-9, 7, 7]} rotation-y={Math.PI / 3} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={3} color="#6c8bd0" position={[10, 5, -9]} rotation-y={-Math.PI / 3} scale={[14, 5, 1]} />
        <Lightformer form="ring" intensity={2.2} color="#ffe2bd" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={8} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[0, 2, 12]} scale={[18, 2, 1]} />
      </Environment>
    </>
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
    vec3 color = mix(uHorizon, uTop, smoothstep(0.0, 0.32, h));
    color = mix(color, uBottom, smoothstep(0.0, -0.25, h));
    float glow = exp(-pow(h * 5.5, 2.0));
    color += uHorizon * glow * 0.35;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`

/** Large inverted dome with a warm dusk band on the horizon; follows the camera so it never parallaxes. */
export function HorizonGlow() {
  const meshRef = useRef<Mesh>(null)
  const material = useMemo(
    () => ({
      uTop: { value: new Color('#07080b') },
      uHorizon: { value: new Color('#3a2a2c') },
      uBottom: { value: new Color('#0a0b0e') }
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
