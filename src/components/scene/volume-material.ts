import { MeshDepthMaterial, MeshStandardMaterial, RGBADepthPacking, Vector3 } from 'three'
import type { WebGLProgramParametersWithUniforms } from 'three'

const NOISE_GLSL = /* glsl */ `
float hash31(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float valueNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash31(i), hash31(i + vec3(1,0,0)), f.x), mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x), mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y),
    f.z
  );
}
`

/** Intro growth shared by the visible and the shadow-depth material, so shadows grow with the buildings. */
const REVEAL_GLSL = /* glsl */ `
  float reveal = smoothstep(aParams.x, aParams.x + 0.45, uIntro);
  reveal = 1.0 - pow(1.0 - reveal, 3.0);
  transformed.y *= reveal;
`

const FACADE_VARYINGS_GLSL = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vObjNormal;
  flat varying vec3 vInstScale;
  flat varying vec4 vParams;
  varying float vWorldY;
`

const FACADE_FRAGMENT_GLSL = /* glsl */ `
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
`

/**
 * Procedural facade: window grid with per-window lit/unlit state, panel seams, edge lines, a fake ground
 * occlusion gradient and glossy glass. Everything is derived from instance data, so one draw call per chunk.
 */
const FACADE_COLOR_GLSL = /* glsl */ `
  #include <color_fragment>
  float viewDist = length(vViewPosition);
  float detail = 1.0 - smoothstep(26.0, 72.0, viewDist);
  vec3 an = abs(vObjNormal);
  vec3 halfSize = vInstScale * 0.5;
  vec3 centered = vLocal - vec3(0.0, halfSize.y, 0.0);
  vec3 edgeDist3 = halfSize - abs(centered);
  float isTop = step(0.6, an.y);
  vec2 cell = vec2(0.4, 0.34);
  #ifdef CYLINDER
    float columns = max(5.0, floor(6.2831853 * halfSize.x / cell.x));
    float turn = atan(vLocal.z, vLocal.x) / 6.2831853 + 0.5;
    vec2 face = vec2(turn * columns * cell.x, vLocal.y);
    float edgeDist = min(vLocal.y, vInstScale.y - vLocal.y);
  #else
    vec2 face = an.x > 0.5 ? vec2(vLocal.z, vLocal.y) : vec2(vLocal.x, vLocal.y);
    vec2 edgePair = an.x > 0.5 ? edgeDist3.yz : (an.y > 0.5 ? edgeDist3.xz : edgeDist3.xy);
    float edgeDist = min(edgePair.x, edgePair.y);
  #endif
  vec2 cellId = floor(face / cell);
  vec2 cellUv = fract(face / cell);
  float windowX = smoothstep(0.12, 0.17, cellUv.x) * (1.0 - smoothstep(0.83, 0.88, cellUv.x));
  float windowY = smoothstep(0.16, 0.22, cellUv.y) * (1.0 - smoothstep(0.8, 0.86, cellUv.y));
  float seedOffset = vParams.y * 91.7;
  float hasWindow = step(hash21(cellId + seedOffset), vParams.z)
    * (1.0 - isTop)
    * step(0.35, vLocal.y)
    * step(vLocal.y, vInstScale.y - 0.12);
  // beyond ~20 units a window is only a handful of pixels: replace the per-cell random pattern with its average so the skyline cannot shimmer or speckle
  float farBlend = smoothstep(16.0, 52.0, viewDist);
  float nearMask = hasWindow * windowX * windowY;
  float averageMask = vParams.z * 0.5 * (1.0 - isTop) * step(0.35, vLocal.y);
  float winMask = mix(nearMask, averageMask, farBlend);
  float litRoll = hash21(cellId * 1.31 + seedOffset + 7.7);
  float flicker = 0.92 + 0.08 * sin(uTime * 0.35 + litRoll * 40.0);
  float litAmount = mix(step(litRoll, 0.05 + 0.1 * vParams.w) * flicker, (0.05 + 0.1 * vParams.w) * 0.7, farBlend);
  float winLit = winMask * litAmount;
  float edgeLine = 1.0 - smoothstep(0.0, 0.02 + fwidth(edgeDist) * 1.2, edgeDist);
  float seam = (1.0 - smoothstep(0.0, 0.035, cellUv.y)) * (1.0 - isTop) * detail * 0.28;
  float groundAo = mix(0.4, 1.0, smoothstep(0.0, 1.9, vWorldY));

  diffuseColor.rgb *= groundAo * (1.0 - seam);
  diffuseColor.rgb += edgeLine * 0.04;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.58, 0.66, 0.72), winMask);
`

const FILMIC_GLSL = /* glsl */ `
  {
    vec3 x = gl_FragColor.rgb * 0.95;
    gl_FragColor.rgb = clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
`

export interface VolumeUniforms {
  uTime: { value: number }
  uIntro: { value: number }
  uMouse: { value: Vector3 }
  uMouseStrength: { value: number }
}

interface CreateVolumeMaterialsParams {
  /** cursor displacement only reads well on the near, high-segment geometry */
  displace: boolean
}

interface VolumeMaterials {
  box: MeshStandardMaterial
  cylinder: MeshStandardMaterial
  depth: MeshDepthMaterial
  uniforms: VolumeUniforms
  dispose: () => void
}

/**
 * PBR standard materials (box = faceted, cylinder = smooth) patched with:
 * - intro "growth" per instance (aParams.x = delay)
 * - procedural facade / edges / glass / lit windows (aParams.zw = window density, glow)
 * - cursor-driven displacement along the face normal
 * - a filmic curve baked in (the photo planes stay untouched by the post stack)
 * plus a matching depth material so shadows follow the growth.
 * Instance attribute aParams = (delay, seed, windowDensity, emissive).
 */
export function createVolumeMaterials({ displace }: CreateVolumeMaterialsParams): VolumeMaterials {
  const uniforms: VolumeUniforms = {
    uTime: { value: 0 },
    uIntro: { value: 0 },
    uMouse: { value: new Vector3(0, 2, 0) },
    uMouseStrength: { value: 0 }
  }

  function patch({ shader }: { shader: WebGLProgramParametersWithUniforms }) {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        attribute vec4 aParams;
        uniform float uTime;
        uniform float uIntro;
        uniform vec3 uMouse;
        uniform float uMouseStrength;
        ${FACADE_VARYINGS_GLSL}
        ${NOISE_GLSL}`
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vec3 instScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vInstScale = instScale;
        vLocal = position * instScale;
        vObjNormal = normal;
        vParams = aParams;
        ${REVEAL_GLSL}
        vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldY = worldPos.y;
        ${
          displace
            ? /* glsl */ `
        float mouseDistance = distance(worldPos.xyz, uMouse);
        float falloff = smoothstep(2.8, 0.0, mouseDistance) * uMouseStrength;
        float wobble = valueNoise(worldPos.xyz * 1.6 + vec3(0.0, uTime * 0.7, 0.0));
        transformed += objectNormal * (falloff * (0.25 + 0.75 * wobble) * 0.9) / instScale;`
            : ''
        }`
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uTime;
        ${FACADE_VARYINGS_GLSL}
        ${FACADE_FRAGMENT_GLSL}`
      )
      .replace('#include <color_fragment>', FACADE_COLOR_GLSL)
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.08, winMask);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        /* glsl */ `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.85, winMask * (1.0 - winLit));`
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        vec3 litColor = mix(vec3(1.0, 0.92, 0.78), vec3(0.82, 0.9, 1.0), step(0.8, hash21(cellId + seedOffset + 3.3)) * (1.0 - farBlend));
        totalEmissiveRadiance += litColor * winLit * (0.18 + 0.22 * vParams.w) * vParams.w;
        totalEmissiveRadiance += vec3(0.95, 0.88, 0.76) * edgeLine * detail * 0.04;`
      )
      .replace('#include <tonemapping_fragment>', FILMIC_GLSL)
  }

  const box = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.05, flatShading: true })
  box.onBeforeCompile = (shader) => patch({ shader })

  const cylinder = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.78, metalness: 0.1 })
  cylinder.defines = { ...cylinder.defines, CYLINDER: '' }
  cylinder.onBeforeCompile = (shader) => patch({ shader })

  const depth = new MeshDepthMaterial({ depthPacking: RGBADepthPacking })
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aParams;\nuniform float uIntro;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${REVEAL_GLSL}`)
  }

  return {
    box,
    cylinder,
    depth,
    uniforms,
    dispose: () => {
      box.dispose()
      cylinder.dispose()
      depth.dispose()
    }
  }
}
