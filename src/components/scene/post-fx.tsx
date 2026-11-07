'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, Noise, SMAA, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import type { DepthOfFieldEffect } from 'postprocessing'
import { sceneState } from '@/lib/scene-state'

export type QualityTier = 'high' | 'mid' | 'low'

const BASE_BOKEH = 2.4
const VELOCITY_BOKEH = 3.4
const BASE_FOCUS_RANGE = 9
const VELOCITY_FOCUS_RANGE = -3

interface PostFxProps {
  tier: QualityTier
}

/**
 * high: depth of field + bloom + vignette + grain + SMAA
 * mid:  vignette + SMAA (no depth of field / bloom)
 * low:  nothing (native MSAA only)
 * The composer renders linear HDR; the building shader applies its own filmic curve, so photos are never tone-mapped.
 */
export function PostFx({ tier }: PostFxProps) {
  if (tier === 'low') return null
  if (tier === 'mid') return <MidEffects />
  return <HighEffects />
}

function MidEffects() {
  return (
    <EffectComposer multisampling={0}>
      <Vignette offset={0.3} darkness={0.6} />
      <SMAA />
    </EffectComposer>
  )
}

function HighEffects() {
  const depthOfFieldRef = useRef<DepthOfFieldEffect>(null)

  /** Rack focus: the plane of focus follows the photo wall while dwelling and slides ahead while travelling. */
  useFrame(() => {
    const effect = depthOfFieldRef.current
    if (!effect) return
    effect.cocMaterial.focusDistance = sceneState.focusDistance
    effect.cocMaterial.focusRange = BASE_FOCUS_RANGE + sceneState.velocity * VELOCITY_FOCUS_RANGE
    effect.bokehScale = BASE_BOKEH + sceneState.velocity * VELOCITY_BOKEH
  })

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField ref={depthOfFieldRef} focusDistance={24} focusRange={BASE_FOCUS_RANGE} bokehScale={BASE_BOKEH} resolutionScale={0.5} />
      <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.88} luminanceSmoothing={0.25} radius={0.72} />
      <Vignette offset={0.28} darkness={0.7} />
      <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <SMAA />
    </EffectComposer>
  )
}
