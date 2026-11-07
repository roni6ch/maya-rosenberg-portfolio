'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, PerformanceMonitor } from '@react-three/drei'
import { NoToneMapping } from 'three'
import { useCameraTimeline } from '@/hooks/use-camera-timeline'
import { buildSceneLayout } from '@/lib/scene-layout'
import { markReady, sceneState, SCENE_BACKGROUND, setActiveIndex } from '@/lib/scene-state'
import type { SceneProject } from '@/types/portfolio'
import { CameraRig } from './camera-rig'
import { IntroParticles } from './intro-particles'
import { PointerProbe } from './pointer-probe'
import { PostFx } from './post-fx'
import type { QualityTier } from './post-fx'
import { ProjectPlanes } from './project-planes'
import { Landscape } from './landscape'
import { Ground, Pathway, StructuralFrames } from './scene-ground'
import { HorizonGlow, KeyLight, SceneLights, SunDisc } from './scene-lighting'
import { SnakePath } from './snake-path'
import { Volumes } from './volumes'

interface SceneCanvasProps {
  projects: SceneProject[]
}

const PARTICLES_DESKTOP = 9000
const PARTICLES_MOBILE = 3500
const FOG_COLOR = '#d0cbc0'
const FOG_DENSITY = 0.0075

const TIER_ORDER: QualityTier[] = ['high', 'mid', 'low']
const TIER_DPR: Record<QualityTier, [number, number]> = { high: [1, 1.75], mid: [1, 1.5], low: [1, 1.15] }
const TIER_PARTICLE_RATIO: Record<QualityTier, number> = { high: 1, mid: 0.7, low: 0.45 }

export default function SceneCanvas({ projects }: SceneCanvasProps) {
  const layout = useMemo(() => buildSceneLayout({ projectCount: projects.length }), [projects.length])
  const particleBoxes = useMemo(
    () => layout.hero.filter((volume) => volume.kind === 'box' && volume.rotationY === 0 && volume.size[1] >= 0.4 && volume.size[0] < 8),
    [layout]
  )
  const isVisible = useJourneyVisibility()
  const isCompact = useIsCompact()
  const initialTier: QualityTier = isCompact ? 'mid' : 'high'
  const { tier, stepDown, stepUp } = useQualityTier({ initialTier })
  const particleCount = isCompact ? PARTICLES_MOBILE : PARTICLES_DESKTOP
  const landscape = useMemo(() => (isCompact ? layout.props.filter((_, index) => index % 2 === 0) : layout.props), [isCompact, layout.props])

  useCameraTimeline({ layout })

  useEffect(() => {
    sceneState.isCompact = isCompact
  }, [isCompact])

  // the render loop (which publishes the active project) is paused off-journey, so clear it explicitly
  useEffect(() => {
    if (!isVisible) setActiveIndex({ index: -1 })
  }, [isVisible])

  useEffect(() => {
    sceneState.qualityRatio = TIER_PARTICLE_RATIO[tier]
  }, [tier])

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <Canvas
        dpr={TIER_DPR[tier]}
        shadows="soft"
        frameloop={isVisible ? 'always' : 'never'}
        camera={{ fov: isCompact ? 50 : 42, near: 0.1, far: 240, position: [7, 13, 46] }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: NoToneMapping }}
      >
        <PerformanceMonitor onDecline={stepDown} onIncline={stepUp} flipflops={3} onFallback={stepDown} />
        <color attach="background" args={[SCENE_BACKGROUND]} />
        <fogExp2 attach="fog" args={[FOG_COLOR, FOG_DENSITY]} />

        <Suspense fallback={null}>
          <SceneLights />
          <KeyLight castShadow={tier !== 'low'} />
          <SunDisc visible={tier === 'high'} />
          <HorizonGlow />
          <Ground receiveShadow />
          <Grid
            position={[0, 0.012, 0]}
            args={[10, 10]}
            infiniteGrid
            cellSize={1.2}
            sectionSize={6}
            cellThickness={0.45}
            sectionThickness={0.8}
            cellColor="#b5aea2"
            sectionColor="#a89f92"
            fadeDistance={80}
            fadeStrength={1.6}
          />
          <Pathway layout={layout} receiveShadow />
          <SnakePath layout={layout} />
          <StructuralFrames frames={layout.frames} />
          <Volumes volumes={layout.hero} tilt interactive segments={8} />
          <Volumes volumes={layout.district} interactive segments={4} />
          <Volumes volumes={layout.foreground} segments={1} />
          <Volumes volumes={layout.skyline} segments={1} castShadow={false} receiveShadow={false} />
          <Landscape props={landscape} castShadow={tier !== 'low'} />
          <IntroParticles boxes={particleBoxes} count={particleCount} />
          <ProjectPlanes projects={projects} layout={layout} />
        </Suspense>

        <PointerProbe />
        <CameraRig layout={layout} />
        <PostFx tier={tier} />
        <ReadySignal />
      </Canvas>
    </div>
  )
}

interface UseQualityTierParams {
  initialTier: QualityTier
}

/** Steps the render quality down when the PerformanceMonitor sees dropped frames, and back up (never above the starting tier). */
function useQualityTier({ initialTier }: UseQualityTierParams) {
  const [tier, setTier] = useState<QualityTier>(initialTier)
  const stepDown = useCallback(() => setTier((current) => TIER_ORDER[Math.min(TIER_ORDER.indexOf(current) + 1, TIER_ORDER.length - 1)]), [])
  const stepUp = useCallback(
    () => setTier((current) => TIER_ORDER[Math.max(TIER_ORDER.indexOf(current) - 1, TIER_ORDER.indexOf(initialTier))]),
    [initialTier]
  )
  return { tier, stepDown, stepUp }
}

/** Flags the loader once the first frames (and shader compiles) have rendered. */
function ReadySignal() {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 4) markReady()
  })
  return null
}

/** Pauses rendering once the journey section has scrolled out and opaque content covers the canvas. */
function useJourneyVisibility() {
  const [isVisible, setIsVisible] = useState(true)
  useEffect(() => {
    const journey = document.getElementById('journey')
    if (!journey) return
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { rootMargin: '10% 0px' })
    observer.observe(journey)
    return () => observer.disconnect()
  }, [])
  return isVisible
}

function useIsCompact() {
  // this module is only loaded client-side (next/dynamic, ssr: false), so window is safe here
  const [isCompact] = useState(() => window.matchMedia('(max-width: 768px), (pointer: coarse)').matches)
  return isCompact
}
