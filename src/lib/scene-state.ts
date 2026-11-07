import { useSyncExternalStore } from 'react'
import type { Object3D } from 'three'
import type Lenis from 'lenis'

export const SCENE_BACKGROUND = '#d4cfc4'

interface MutableVec3 {
  x: number
  y: number
  z: number
  copy(v: { x: number; y: number; z: number }): MutableVec3
  lerp(v: { x: number; y: number; z: number }, alpha: number): MutableVec3
}

function createMutableVec3(x: number, y: number, z: number): MutableVec3 {
  return {
    x,
    y,
    z,
    copy(v) {
      this.x = v.x
      this.y = v.y
      this.z = v.z
      return this
    },
    lerp(v, alpha) {
      this.x += (v.x - this.x) * alpha
      this.y += (v.y - this.y) * alpha
      this.z += (v.z - this.z) * alpha
      return this
    }
  }
}

/** Mutable per-frame state, read by the render loop (never triggers React renders). */
export const sceneState = {
  /** 0 -> 1 cinematic intro progress (driven by GSAP) */
  intro: 0,
  /** raw scroll progress through the journey section (driven by ScrollTrigger) */
  progress: 0,
  /** damped progress used by the camera */
  smoothProgress: 0,
  /** spline parameter (0..1 arc length) animated by the scroll timeline */
  cameraU: 0,
  /** smoothed camera travel speed, 0 (dwelling) .. 1 (full fly-through) */
  velocity: 0,
  /** world-space point the camera looks at (also where the key light and focus follow) */
  cameraTarget: createMutableVec3(0, 3, 0),
  /** world distance from the camera to the plane of focus (drives depth of field) */
  focusDistance: 24,
  pointer: { x: 0, y: 0 },
  pointerActive: false,
  isTouch: false,
  isCompact: false,
  reducedMotion: false,
  /** raycast hit point on the architectural volumes (world space) */
  hit: createMutableVec3(0, 2, 0),
  hitStrength: 0,
  proxies: new Set<Object3D>(),
  /** 0..1, lowered by the PerformanceMonitor to shed particles */
  qualityRatio: 1
}

export const scrollApi: { lenis: Lenis | null } = { lenis: null }

/** Low-frequency state that React UI subscribes to. */
const store = {
  activeIndex: -1,
  nearIndex: 0,
  introDone: false,
  ready: false,
  detailProjectId: null as number | null
}

const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit() {
  listeners.forEach((listener) => listener())
}

export function setActiveIndex({ index }: { index: number }) {
  if (store.activeIndex === index) return
  store.activeIndex = index
  emit()
}

export function setNearIndex({ index }: { index: number }) {
  if (store.nearIndex === index) return
  store.nearIndex = index
  emit()
}

export function markReady() {
  if (store.ready) return
  store.ready = true
  emit()
}

export function openProject({ id }: { id: number | null }) {
  store.detailProjectId = id
  emit()
}

interface StartIntroParams {
  duration?: number
}

let introStarted = false

export function startIntro({ duration = 4.4 }: StartIntroParams = {}) {
  if (introStarted) return
  introStarted = true
  const finish = () => {
    sceneState.intro = 1
    store.introDone = true
    emit()
  }
  if (sceneState.reducedMotion) return finish()
  void import('gsap').then(({ gsap }) => {
    gsap.to(sceneState, { intro: 1, duration, ease: 'power2.inOut', onComplete: finish })
  })
}

export function useActiveIndex() {
  return useSyncExternalStore(subscribe, () => store.activeIndex, () => -1)
}

export function useNearIndex() {
  return useSyncExternalStore(subscribe, () => store.nearIndex, () => 0)
}

export function useIntroDone() {
  return useSyncExternalStore(subscribe, () => store.introDone, () => false)
}

export function useSceneReady() {
  return useSyncExternalStore(subscribe, () => store.ready, () => false)
}

export function useDetailProjectId() {
  return useSyncExternalStore(subscribe, () => store.detailProjectId, () => null)
}
