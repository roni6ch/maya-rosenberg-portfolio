'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, ShaderMaterial, Vector3 } from 'three'
import type { Points } from 'three'
import type { VolumeSpec } from '@/lib/scene-layout'
import { sceneState } from '@/lib/scene-state'

interface IntroParticlesProps {
  boxes: VolumeSpec[]
  count: number
}

const vertexShader = /* glsl */ `
  attribute vec3 aTarget;
  attribute float aSeed;
  uniform float uIntro;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uMouse;
  uniform float uMouseStrength;
  varying float vAlpha;

  void main() {
    float t = clamp((uIntro - aSeed * 0.35) / 0.65, 0.0, 1.0);
    float e = t * t * (3.0 - 2.0 * t);
    e = e * e * (3.0 - 2.0 * e);

    float angle = (1.0 - e) * (2.2 + aSeed * 3.2);
    float c = cos(angle);
    float s = sin(angle);
    vec3 start = position;
    start.xz = mat2(c, -s, s, c) * start.xz;

    vec3 p = mix(start, aTarget, e);
    p += vec3(sin(uTime * 0.6 + aSeed * 40.0), cos(uTime * 0.5 + aSeed * 31.0), sin(uTime * 0.4 + aSeed * 17.0)) * 0.05 * e;

    vec3 away = p - uMouse;
    float push = smoothstep(2.2, 0.0, length(away)) * 0.7 * uMouseStrength * e;
    p += normalize(away + vec3(0.0001)) * push;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(uSize * uPixelRatio * (0.6 + aSeed) * (14.0 / max(-mv.z, 1.0)), 5.0 * uPixelRatio);

    float fadeIn = smoothstep(0.0, 0.08, uIntro);
    // the particles are an intro-only effect: they dissolve as the buildings take over, so no stray dots remain while scrolling
    float settle = 1.0 - smoothstep(0.82, 1.0, uIntro);
    vAlpha = fadeIn * mix(0.7, 0.0, e) * settle * smoothstep(1.5, 6.0, -mv.z);
  }
`

const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    gl_FragColor = vec4(uColor, vAlpha * smoothstep(0.5, 0.15, d));
  }
`

function randomOnSphere({ radius }: { radius: number }) {
  const u = Math.random() * 2 - 1
  const angle = Math.random() * Math.PI * 2
  const r = Math.sqrt(1 - u * u)
  return new Vector3(r * Math.cos(angle) * radius, u * radius * 0.7 + 4, r * Math.sin(angle) * radius)
}

function sampleSurface({ boxes, count }: { boxes: VolumeSpec[]; count: number }) {
  const areas = boxes.map(({ size: [w, h, d] }) => 2 * (w * h + h * d + w * d))
  const total = areas.reduce((sum, area) => sum + area, 0)
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    let pick = Math.random() * total
    let index = 0
    while (index < boxes.length - 1 && pick > areas[index]) pick -= areas[index++]
    const box = boxes[index]
    const [w, h, d] = box.size
    const faceArea = [w * h, w * h, h * d, h * d, w * d, w * d]
    let face = Math.random() * (faceArea[0] + faceArea[2] + faceArea[4]) * 2
    let faceIndex = 0
    while (faceIndex < 5 && face > faceArea[faceIndex]) face -= faceArea[faceIndex++]
    const a = Math.random() - 0.5
    const b = Math.random()
    const local =
      faceIndex < 2
        ? [a * w, b * h, (faceIndex === 0 ? 0.5 : -0.5) * d]
        : faceIndex < 4
          ? [(faceIndex === 2 ? 0.5 : -0.5) * w, b * h, a * d]
          : [a * w, (faceIndex === 4 ? 1 : 0) * h, (Math.random() - 0.5) * d]
    out[i * 3] = box.position[0] + local[0]
    out[i * 3 + 1] = box.position[1] + local[1]
    out[i * 3 + 2] = box.position[2] + local[2]
  }
  return out
}

export function IntroParticles({ boxes, count }: IntroParticlesProps) {
  const pointsRef = useRef<Points>(null)
  const gl = useThree((state) => state.gl)

  const { geometry, material } = useMemo(() => {
    const starts = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const point = randomOnSphere({ radius: 14 + Math.random() * 26 })
      starts.set([point.x, point.y, point.z], i * 3)
      seeds[i] = Math.random()
    }
    const buffer = new BufferGeometry()
    buffer.setAttribute('position', new BufferAttribute(starts, 3))
    buffer.setAttribute('aTarget', new BufferAttribute(sampleSurface({ boxes, count }), 3))
    buffer.setAttribute('aSeed', new BufferAttribute(seeds, 1))

    const shader = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uIntro: { value: 0 },
        uTime: { value: 0 },
        uSize: { value: 3.2 },
        uPixelRatio: { value: 1 },
        uMouse: { value: new Vector3() },
        uMouseStrength: { value: 0 },
        uColor: { value: new Color('#ffcf9a') }
      }
    })
    return { geometry: buffer, material: shader }
  }, [boxes, count])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material]
  )

  useFrame((state) => {
    const { uniforms } = material
    uniforms.uTime.value = state.clock.elapsedTime
    uniforms.uIntro.value = sceneState.intro
    uniforms.uPixelRatio.value = gl.getPixelRatio()
    uniforms.uMouse.value.copy(sceneState.hit)
    uniforms.uMouseStrength.value = sceneState.hitStrength
    geometry.setDrawRange(0, Math.floor(count * sceneState.qualityRatio))
    if (pointsRef.current) pointsRef.current.visible = sceneState.intro < 0.995
  })

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
}
