'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CatmullRomCurve3, Color, TubeGeometry, Vector3 } from 'three'
import type { Mesh, ShaderMaterial } from 'three'
import type { SceneLayout } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'

interface SnakePathProps {
  layout: SceneLayout
}

const vertexShader = /* glsl */ `
  varying float vAlong;
  void main() {
    vAlong = uv.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform float uProgress;
  uniform float uIntro;
  uniform vec3 uBase;
  uniform vec3 uHead;
  varying float vAlong;
  void main() {
    float drawn = clamp(uIntro * 0.18 + uProgress * 0.82, 0.0, 1.0);
    float visible = 1.0 - smoothstep(drawn, drawn + 0.035, vAlong);
    float head = exp(-pow((vAlong - drawn) * 48.0, 2.0));
    vec3 color = mix(uBase, uHead, head);
    float alpha = visible * 0.78 + head * 0.95;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`

/** Gold architectural line along the camera spline, drawn in lockstep with ScrollTrigger / cameraU. */
export function SnakePath({ layout }: SnakePathProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const headRef = useRef<Mesh>(null)
  const headPos = useMemo(() => new Vector3(), [])

  const geometry = useMemo(() => {
    const points = layout.curve.getSpacedPoints(Math.max(32, Math.ceil(layout.length * 1.4)))
    points.forEach((point) => {
      point.y = 0.09
    })
    const curve = new CatmullRomCurve3(points, false, 'centripetal')
    return new TubeGeometry(curve, points.length, 0.05, 5, false)
  }, [layout])

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uIntro: { value: 0 },
      uBase: { value: new Color('#9a7b52') },
      uHead: { value: new Color('#f0d5a8') }
    }),
    []
  )

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry]
  )

  useFrame(() => {
    const material = materialRef.current
    if (material) {
      material.uniforms.uProgress.value = sceneState.cameraU
      material.uniforms.uIntro.value = sceneState.intro
    }
    const head = headRef.current
    if (!head) return
    const u = Math.min(0.999, Math.max(0.002, sceneState.cameraU))
    layout.curve.getPointAt(u, headPos)
    head.position.set(headPos.x, 0.14, headPos.z)
    const scale = 0.55 + sceneState.intro * 0.45
    head.scale.setScalar(scale)
    head.visible = sceneState.intro > 0.12
  })

  return (
    <group>
      <mesh geometry={geometry} frustumCulled={false}>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh ref={headRef} visible={false}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshBasicMaterial color="#f0d5a8" toneMapped={false} />
      </mesh>
    </group>
  )
}
