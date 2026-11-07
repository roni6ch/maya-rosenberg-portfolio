import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { EXIT_RUNWAY } from '@/lib/scene-constants'

export { EXIT_RUNWAY }

export type VolumeKind = 'box' | 'cylinder'

/** One instanced architectural volume. Position is the centre of its base; size is [x, height, z] (cylinders: [diameter, height, diameter]). */
export interface VolumeSpec {
  kind: VolumeKind
  position: [number, number, number]
  size: [number, number, number]
  rotationY: number
  /** sRGB hex, multiplied into the facade material */
  tint: string
  /** 0 = blank wall, 1 = fully glazed */
  windowDensity: number
  /** how strongly lit windows glow (feeds bloom) */
  emissive: number
  /** intro growth delay (0..1 of the intro) */
  delay: number
  /** spatial chunk index, so each chunk can be frustum-culled on its own */
  chunk: number
}

export type PropKind = 'trunk' | 'canopy' | 'hedge' | 'lamp' | 'lampHead' | 'planter' | 'bench' | 'plaza'

/** Landscaping and street furniture (no facade shader — instanced PBR). */
export interface PropSpec {
  kind: PropKind
  position: [number, number, number]
  size: [number, number, number]
  rotationY: number
  tint: string
  delay: number
  chunk: number
}

export interface PlaneSpec {
  position: Vector3
  width: number
}

export interface ProjectAnchor {
  /** curve parameter (arc-length) at which the camera dwells for this project */
  u: number
  /** scroll progress (0..1) at which the camera dwells for this project */
  stop: number
  side: 1 | -1
  camera: Vector3
  main: PlaneSpec
  extras: PlaneSpec[]
}

export interface GetLookTargetParams {
  u: number
  /** receives the look-at point */
  out: Vector3
  /** receives the point the lens focuses on (far ahead while travelling, the photo wall while dwelling) */
  focusOut: Vector3
}

export interface SceneLayout {
  curve: CatmullRomCurve3
  /** total curve length in world units */
  length: number
  /** the hero cluster the camera flies over at the start (axis aligned, tilts with the cursor) */
  hero: VolumeSpec[]
  /** dense districts either side of the camera spline */
  district: VolumeSpec[]
  /** distant limestone silhouettes far from the path, for depth layering */
  skyline: VolumeSpec[]
  /** near columns and slabs that pass close to the camera (depth parallax) */
  foreground: VolumeSpec[]
  /** trees, hedges, lamps, planters, benches */
  props: PropSpec[]
  /** structural skeletons as line segments (xyz pairs) */
  frames: Float32Array
  anchors: ProjectAnchor[]
  /** maps scroll progress (0..1) to a curve parameter with a dwell at every project */
  mapProgressToU: (params: { progress: number }) => number
  /** look-at and focus points: slightly ahead on the spline, pulled toward the photo wall while dwelling */
  getLookTarget: (params: GetLookTargetParams) => void
}

const UP = new Vector3(0, 1, 0)
const NODE_SPACING = 26
const MAIN_PLANE_WIDTH = 6.8
const LOOK_AHEAD = 0.012
const FOCUS_AHEAD = 0.04
const CHUNK_LENGTH = 34
/** scroll length of the exit after the last project, in project-spacings (keeps the empty tail short) */
const TINTS: { color: string; weight: number }[] = [
  { color: '#e8e2d6', weight: 0.24 },
  { color: '#d5cfc4', weight: 0.22 },
  { color: '#c4bdb0', weight: 0.18 },
  { color: '#b7aea0', weight: 0.12 },
  { color: '#a99c85', weight: 0.1 },
  { color: '#9a8e80', weight: 0.08 },
  { color: '#c4a882', weight: 0.04 },
  { color: '#8a7d6e', weight: 0.02 }
]
const TINT_TOTAL = TINTS.reduce((sum, tint) => sum + tint.weight, 0)
const SKYLINE_TINTS = ['#c8c2b6', '#d4cec2', '#b8b1a6', '#e0dacf']
const PLAZA_TINT = '#cfc8bc'
const CANOPY_TINTS = ['#7d8a70', '#6f7c64', '#8a9178', '#74826c']

type Random = () => number
type Vec3 = [number, number, number]

function createRng({ seed }: { seed: number }): Random {
  let state = seed >>> 0
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickTint({ random }: { random: Random }) {
  let pick = random() * TINT_TOTAL
  for (const tint of TINTS) {
    pick -= tint.weight
    if (pick <= 0) return tint.color
  }
  return TINTS[0].color
}

interface Frame {
  random: Random
  out: VolumeSpec[]
  origin: Vec3
  rotation: number
  chunk: number
  delay: number
}

/** Rotates a local offset by the frame rotation (matches three's Object3D.rotation.y) and moves it to the origin. */
function toWorld({ origin, rotation, local }: { origin: Vec3; rotation: number; local: Vec3 }): Vec3 {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return [origin[0] + local[0] * cos + local[2] * sin, origin[1] + local[1], origin[2] - local[0] * sin + local[2] * cos]
}

interface AddVolumeParams {
  frame: Frame
  kind?: VolumeKind
  local: Vec3
  size: Vec3
  tint: string
  windowDensity: number
  emissive?: number
  delayOffset?: number
}

function addVolume({ frame, kind = 'box', local, size, tint, windowDensity, emissive = 0.08, delayOffset = 0 }: AddVolumeParams) {
  frame.out.push({
    kind,
    position: toWorld({ origin: frame.origin, rotation: frame.rotation, local }),
    size,
    rotationY: frame.rotation,
    tint,
    windowDensity,
    emissive,
    delay: Math.min(0.95, frame.delay + delayOffset),
    chunk: frame.chunk
  })
}

interface TowerResult {
  height: number
  width: number
}

/** Podium, glazed shaft, one or two setbacks and sometimes a spire. */
function addTower({ frame, width, depth, height }: { frame: Frame; width: number; depth: number; height: number }): TowerResult {
  const { random } = frame
  const podiumHeight = 0.5 + random() * 0.6
  const shaftTint = pickTint({ random })
  addVolume({ frame, local: [0, 0, 0], size: [width * 1.45, podiumHeight, depth * 1.45], tint: '#c8c1b6', windowDensity: 0.22, emissive: 0.04 })
  addVolume({ frame, local: [0, podiumHeight, 0], size: [width, height, depth], tint: shaftTint, windowDensity: 0.55 + random() * 0.3, emissive: 0.06 + random() * 0.1, delayOffset: 0.04 })
  let top = podiumHeight + height
  const setbacks = random() < 0.65 ? 1 + Math.floor(random() * 2) : 0
  for (let i = 0; i < setbacks; i++) {
    const scale = 0.76 - i * 0.16
    const stepHeight = 0.8 + random() * 1.4
    addVolume({ frame, local: [0, top, 0], size: [width * scale, stepHeight, depth * scale], tint: '#d4cec4', windowDensity: 0.45, emissive: 0.08, delayOffset: 0.08 })
    top += stepHeight
  }
  if (height > 6.5 && random() < 0.55) {
    const spire = 1.6 + random() * 2.2
    addVolume({ frame, kind: 'cylinder', local: [0, top, 0], size: [0.1, spire, 0.1], tint: '#a89f93', windowDensity: 0, emissive: 0, delayOffset: 0.12 })
    top += spire
  }
  return { height: top, width }
}

/** A concrete core with cantilevered glazed floor plates stepping out alternately. */
function addSlabStack({ frame }: { frame: Frame }) {
  const { random } = frame
  const coreHeight = 3 + random() * 3.4
  const levels = 3 + Math.floor(random() * 3)
  addVolume({ frame, local: [0, 0, 0], size: [0.9, coreHeight, 0.9], tint: '#c4bdb2', windowDensity: 0, emissive: 0 })
  for (let i = 0; i < levels; i++) {
    const direction = i % 2 === 0 ? 1 : -1
    const width = 3 + random() * 2.4 - i * 0.12
    addVolume({
      frame,
      local: [direction * (0.5 + random() * 0.9), 0.5 + (i * (coreHeight - 0.9)) / levels, 0],
      size: [width, 0.55, 1.8 + random() * 1.1],
      tint: i % 2 === 0 ? '#a99c85' : '#6e685f',
      windowDensity: 0.9,
      emissive: 0.08 + random() * 0.08,
      delayOffset: 0.03 * i
    })
  }
}

/** A raised volume on slender round columns. */
function addPilotis({ frame }: { frame: Frame }) {
  const { random } = frame
  const width = 2.2 + random() * 2
  const depth = 1.6 + random() * 1.6
  const lift = 1.5 + random() * 0.5
  const height = 1 + random() * 1.4
  const columns: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ]
  columns.forEach(([cx, cz]) => {
    addVolume({ frame, kind: 'cylinder', local: [cx * (width / 2 - 0.25), 0, cz * (depth / 2 - 0.25)], size: [0.24, lift, 0.24], tint: '#8e8374', windowDensity: 0, emissive: 0 })
  })
  addVolume({ frame, local: [0, lift, 0], size: [width, height, depth], tint: pickTint({ random }), windowDensity: 0.55 + random() * 0.3, emissive: 0.08 + random() * 0.08, delayOffset: 0.05 })
  addVolume({ frame, local: [0, lift + height, 0], size: [width * 1.12, 0.14, depth * 1.12], tint: '#c4bdb2', windowDensity: 0, emissive: 0, delayOffset: 0.07 })
}

/** A round tower with a projecting ring slab. */
function addCylinderTower({ frame }: { frame: Frame }) {
  const { random } = frame
  const diameter = 1.5 + random() * 1.3
  const height = 3.5 + random() * 5
  addVolume({ frame, kind: 'cylinder', local: [0, 0, 0], size: [diameter, height, diameter], tint: pickTint({ random }), windowDensity: 0.55 + random() * 0.25, emissive: 0.08 + random() * 0.08 })
  addVolume({ frame, kind: 'cylinder', local: [0, height * (0.45 + random() * 0.2), 0], size: [diameter * 1.35, 0.14, diameter * 1.35], tint: '#a99c85', windowDensity: 0, emissive: 0, delayOffset: 0.05 })
  addVolume({ frame, kind: 'cylinder', local: [0, height, 0], size: [diameter * 0.7, 0.9, diameter * 0.7], tint: '#d4cec4', windowDensity: 0.45, emissive: 0.08, delayOffset: 0.08 })
}

/** Stepped terraces climbing in one direction. */
function addTerrace({ frame }: { frame: Frame }) {
  const { random } = frame
  const steps = 4 + Math.floor(random() * 3)
  const width = 3 + random() * 1.4
  const depth = 2 + random() * 1.2
  const tint = pickTint({ random })
  for (let i = 0; i < steps; i++) {
    addVolume({ frame, local: [i * 0.28, i * 0.7, 0], size: [width - i * 0.45, 0.7, depth], tint: i % 2 === 0 ? tint : '#8e8374', windowDensity: 0.45, emissive: 0.08, delayOffset: i * 0.02 })
  }
}

/** Low-rise L-shaped court building. */
function addCourtBlock({ frame }: { frame: Frame }) {
  const { random } = frame
  const tint = pickTint({ random })
  const height = 0.9 + random() * 1.8
  const length = 2.6 + random() * 1.8
  addVolume({ frame, local: [0, 0, 0], size: [length, height, 1.1], tint, windowDensity: 0.5, emissive: 0.08 })
  addVolume({ frame, local: [-length / 2 + 0.55, 0, 1.1], size: [1.1, height * (0.7 + random() * 0.3), length * 0.6], tint, windowDensity: 0.5, emissive: 0.08, delayOffset: 0.03 })
}

/** White-plaster villa with a floating roof slab and a small terrace. */
function addVilla({ frame }: { frame: Frame }) {
  const { random } = frame
  const width = 2.2 + random() * 1.6
  const depth = 1.8 + random() * 1.3
  const height = 0.85 + random() * 0.75
  const wall = random() < 0.5 ? '#e6e0d6' : '#d5cfc4'
  addVolume({ frame, local: [0, 0, 0], size: [width, height, depth], tint: wall, windowDensity: 0.42 + random() * 0.2, emissive: 0.06 })
  addVolume({ frame, local: [0.08, height, 0], size: [width * 1.08, 0.1, depth * 1.08], tint: '#b9b1a4', windowDensity: 0, emissive: 0, delayOffset: 0.04 })
  if (random() < 0.55)
    addVolume({ frame, local: [width * 0.35, 0, depth * 0.45], size: [width * 0.45, 0.06, depth * 0.55], tint: '#cfc8bc', windowDensity: 0, emissive: 0, delayOffset: 0.05 })
}

/** Four slender columns carrying a thin roof — garden pergola. */
function addPergola({ frame }: { frame: Frame }) {
  const { random } = frame
  const width = 2 + random() * 1.2
  const depth = 1.4 + random() * 0.8
  const lift = 1.2 + random() * 0.3
  const columns: [number, number][] = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1]
  ]
  columns.forEach(([cx, cz]) => {
    addVolume({ frame, kind: 'cylinder', local: [cx * (width / 2 - 0.12), 0, cz * (depth / 2 - 0.12)], size: [0.12, lift, 0.12], tint: '#cfc6b8', windowDensity: 0, emissive: 0 })
  })
  addVolume({ frame, local: [0, lift, 0], size: [width, 0.08, depth], tint: '#d8d1c4', windowDensity: 0, emissive: 0, delayOffset: 0.04 })
}

/** Colonnade: a short run of columns carrying a limestone beam. */
function addArcade({ frame }: { frame: Frame }) {
  const { random } = frame
  const bays = 3 + Math.floor(random() * 2)
  const bayW = 0.7 + random() * 0.2
  const height = 1.4 + random() * 0.6
  const depth = 1.1 + random() * 0.4
  for (let i = 0; i <= bays; i++) {
    addVolume({
      frame,
      kind: 'cylinder',
      local: [-bays * bayW * 0.5 + i * bayW, 0, 0],
      size: [0.16, height, 0.16],
      tint: '#d2cbc0',
      windowDensity: 0,
      emissive: 0,
      delayOffset: i * 0.01
    })
  }
  addVolume({ frame, local: [0, height, 0], size: [bays * bayW + 0.4, 0.16, depth], tint: '#c4bdb2', windowDensity: 0, emissive: 0, delayOffset: 0.06 })
}

interface AddFrameLinesParams {
  lines: number[]
  origin: Vec3
  rotation: number
  size: Vec3
  columns: number
  rows: number
  levels: number
}

/** Structural skeleton: columns, floor beams on every level and X-bracing on the front bays, as line segments. */
function addFrameLines({ lines, origin, rotation, size, columns, rows, levels }: AddFrameLinesParams) {
  const [width, height, depth] = size
  const point = (x: number, y: number, z: number) => toWorld({ origin, rotation, local: [x, y, z] })
  const segment = (a: Vec3, b: Vec3) => lines.push(...a, ...b)
  const xAt = (index: number) => -width / 2 + (index * width) / columns
  const zAt = (index: number) => -depth / 2 + (index * depth) / rows
  const yAt = (index: number) => (index * height) / levels

  for (let cx = 0; cx <= columns; cx++) for (let cz = 0; cz <= rows; cz++) segment(point(xAt(cx), 0, zAt(cz)), point(xAt(cx), height, zAt(cz)))
  for (let level = 0; level <= levels; level++) {
    for (let cz = 0; cz <= rows; cz++) segment(point(-width / 2, yAt(level), zAt(cz)), point(width / 2, yAt(level), zAt(cz)))
    for (let cx = 0; cx <= columns; cx++) segment(point(xAt(cx), yAt(level), -depth / 2), point(xAt(cx), yAt(level), depth / 2))
  }
  for (let bay = 0; bay < columns; bay++) {
    for (let level = 0; level < levels; level++) {
      if ((bay + level) % 2 !== 0) continue
      segment(point(xAt(bay), yAt(level), depth / 2), point(xAt(bay + 1), yAt(level + 1), depth / 2))
    }
  }
}

interface BuildHeroParams {
  random: Random
  lines: number[]
}

function buildHero({ random, lines }: BuildHeroParams) {
  const out: VolumeSpec[] = []
  const towers: { position: Vec3; height: number }[] = []
  const cell = 2.4

  out.push({
    kind: 'box',
    position: [0, 0, -2.5],
    size: [30, 0.12, 25],
    rotationY: 0,
    tint: '#d0c9be',
    windowDensity: 0,
    emissive: 0,
    delay: 0.02,
    chunk: 0
  })

  for (let ix = -5; ix <= 5; ix++) {
    for (let iz = -5; iz <= 3; iz++) {
      const x = ix * cell + (random() - 0.5) * 0.7
      const z = iz * cell + (random() - 0.5) * 0.7
      if (Math.abs(x) < 3.4) continue
      const distance = Math.hypot(x, z)
      const frame: Frame = { random, out, origin: [x, 0.12, z], rotation: 0, chunk: 0, delay: MathUtils.clamp(0.04 + distance * 0.03, 0, 0.5) }
      const roll = random()
      if (roll < 0.07) continue
      if (roll < 0.15) {
        addVolume({ frame, local: [0, 0, 0], size: [1.8 + random() * 0.8, 0.06, 1.8 + random() * 0.8], tint: PLAZA_TINT, windowDensity: 0, emissive: 0 })
        continue
      }
      if (roll < 0.22) {
        addFrameLines({ lines, origin: frame.origin, rotation: 0, size: [1.8 + random() * 0.8, 3 + random() * 5, 1.6 + random() * 0.8], columns: 2, rows: 2, levels: 4 + Math.floor(random() * 4) })
        continue
      }
      if (roll < 0.4) {
        addVilla({ frame })
        continue
      }
      if (roll < 0.52) {
        const height = random() < 0.28 ? 5.5 + random() * 5.5 : 2 + Math.pow(random(), 1.4) * 3.2
        const result = addTower({ frame, width: 0.9 + random() * 0.9, depth: 0.9 + random() * 0.9, height })
        towers.push({ position: [x, 0.12, z], height: result.height })
        continue
      }
      if (roll < 0.62) addSlabStack({ frame })
      else if (roll < 0.72) addPilotis({ frame })
      else if (roll < 0.8) addPergola({ frame })
      else if (roll < 0.88) addTerrace({ frame })
      else if (roll < 0.94) addCourtBlock({ frame })
      else addArcade({ frame })
    }
  }

  addBridges({ random, out, towers })
  return out
}

/** Links nearby tall towers with thin glazed skybridges. */
function addBridges({ random, out, towers }: { random: Random; out: VolumeSpec[]; towers: { position: Vec3; height: number }[] }) {
  let count = 0
  for (let a = 0; a < towers.length && count < 7; a++) {
    for (let b = a + 1; b < towers.length && count < 7; b++) {
      const first = towers[a]
      const second = towers[b]
      if (Math.min(first.height, second.height) < 4.5) continue
      const dx = second.position[0] - first.position[0]
      const dz = second.position[2] - first.position[2]
      const distance = Math.hypot(dx, dz)
      if (distance < 2.6 || distance > 4.9 || random() < 0.45) continue
      const mid = Math.min(first.height, second.height) * (0.5 + random() * 0.25)
      out.push({
        kind: 'box',
        position: [first.position[0] + dx / 2, mid, first.position[2] + dz / 2],
        size: [0.55, 0.5, distance - 0.9],
        rotationY: Math.atan2(dx, dz),
        tint: '#a99c85',
        windowDensity: 0.9,
        emissive: 0.12,
        delay: 0.55,
        chunk: 0
      })
      count++
    }
  }
}

function findNearestParameter({ curve, point }: { curve: CatmullRomCurve3; point: Vector3 }) {
  const samples = 4000
  const points = curve.getSpacedPoints(samples)
  let best = 0
  let bestDistance = Infinity
  for (let i = 0; i <= samples; i++) {
    const distance = points[i].distanceToSquared(point)
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best / samples
}

interface BuildSceneLayoutParams {
  projectCount: number
}

export function buildSceneLayout({ projectCount }: BuildSceneLayoutParams): SceneLayout {
  const random = createRng({ seed: 1337 })
  const lines: number[] = []

  const nodes: Vector3[] = []
  for (let i = 0; i < projectCount; i++) {
    nodes.push(new Vector3(Math.sin(i * 1.3) * 7, 2.2 + (i % 3) * 0.5, -26 - i * NODE_SPACING))
  }
  const exit = new Vector3(Math.sin(projectCount * 1.3) * 7, 3, -26 - projectCount * NODE_SPACING - 6)
  const curve = new CatmullRomCurve3([new Vector3(0, 2.6, 12), new Vector3(0, 2, 0), ...nodes, exit], false, 'centripetal')
  const length = curve.getLength()

  let previousU = 0
  const anchors: ProjectAnchor[] = nodes.map((node, index) => {
    const u = Math.max(findNearestParameter({ curve, point: node }), previousU + 0.002)
    previousU = u
    const camera = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u).normalize()
    const right = new Vector3().crossVectors(tangent, UP).normalize()
    const side: 1 | -1 = index % 2 === 0 ? 1 : -1
    const lateral = right.clone().multiplyScalar(side)
    const main = camera.clone().addScaledVector(tangent, 9).addScaledVector(lateral, 3.1).add(new Vector3(0, 0.4, 0))
    const extra = ({ r, f, y, width }: { r: number; f: number; y: number; width: number }): PlaneSpec => ({
      position: main.clone().addScaledVector(lateral, r).addScaledVector(tangent, f).add(new Vector3(0, y, 0)),
      width
    })
    return {
      u,
      stop: (index + 1) / (projectCount + EXIT_RUNWAY),
      side,
      camera,
      main: { position: main, width: MAIN_PLANE_WIDTH },
      extras: [
        extra({ r: 5.6, f: 4, y: 2.4, width: 3.4 }),
        extra({ r: 9, f: 10, y: -0.4, width: 4.2 }),
        extra({ r: -0.5, f: 14, y: 4.6, width: 3.6 })
      ]
    }
  })

  const planeCenters = anchors.flatMap((anchor) => [anchor.main.position, ...anchor.extras.map((e) => e.position)])
  const isBlocked = ({ x, z, radius }: { x: number; z: number; radius: number }) =>
    planeCenters.some((center) => Math.hypot(center.x - x, center.z - z) < radius)

  const district = buildDistrict({ random, curve, length, lines, isBlocked })
  const skyline = buildSkyline({ random, curve, length })
  const foreground = buildForeground({ random, curve, length, anchors })
  const hero = buildHero({ random, lines })
  const props = buildProps({ random, curve, length, isBlocked })

  const knotsP = [0, ...anchors.map((anchor) => anchor.stop), 1]
  const knotsU = [0, ...anchors.map((anchor) => anchor.u), 1]

  function mapProgressToU({ progress }: { progress: number }) {
    const p = MathUtils.clamp(progress, 0, 1)
    let segment = 0
    while (segment < knotsP.length - 2 && p > knotsP[segment + 1]) segment++
    const t = (p - knotsP[segment]) / (knotsP[segment + 1] - knotsP[segment])
    const eased = MathUtils.lerp(t, MathUtils.smootherstep(t, 0, 1), 0.6)
    return MathUtils.lerp(knotsU[segment], knotsU[segment + 1], eased)
  }

  const ahead = new Vector3()
  const DWELL_PULL_DISTANCE = 13
  function getLookTarget({ u, out, focusOut }: GetLookTargetParams) {
    curve.getPointAt(Math.min(1, u + LOOK_AHEAD), out)
    curve.getPointAt(Math.min(1, u + FOCUS_AHEAD), focusOut)
    let pull = 0
    let target: Vector3 | null = null
    for (const anchor of anchors) {
      const weight = 1 - MathUtils.smoothstep(Math.abs(u - anchor.u) * length, 0, DWELL_PULL_DISTANCE)
      if (weight <= pull) continue
      pull = weight
      target = anchor.main.position
    }
    if (!target) return
    ahead.copy(out)
    out.lerpVectors(ahead, target, pull * 0.85)
    focusOut.lerp(target, Math.min(1, pull * 1.4))
  }

  return { curve, length, hero, district, skyline, foreground, props, frames: new Float32Array(lines), anchors, mapProgressToU, getLookTarget }
}

interface BuildAlongPathParams {
  random: Random
  curve: CatmullRomCurve3
  length: number
}

interface BuildDistrictParams extends BuildAlongPathParams {
  lines: number[]
  isBlocked: (params: { x: number; z: number; radius: number }) => boolean
}

/** Two layers of varied buildings on both sides of the spline; farther layers are taller. */
function buildDistrict({ random, curve, length, lines, isBlocked }: BuildDistrictParams) {
  const out: VolumeSpec[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const right = new Vector3()
  for (let distance = 14; distance < length - 4; distance += 2.2) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    const chunk = Math.floor(distance / CHUNK_LENGTH)
    const heading = Math.atan2(tangent.x, tangent.z)
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 2; layer++) {
        if (random() < 0.1) continue
        const lateral = (layer === 0 ? 6 + random() * 4 : 12.5 + random() * 9) * side
        const x = point.x + right.x * lateral
        const z = point.z + right.z * lateral
        if (isBlocked({ x, z, radius: layer === 0 ? 8 : 7 })) continue
        const frame: Frame = { random, out, origin: [x, 0, z], rotation: heading + (random() - 0.5) * 0.3, chunk, delay: 0.5 + random() * 0.3 }
        const roll = random()
        const lift = layer === 0 ? 1 : 1.5
        if (roll < 0.06) {
          addFrameLines({ lines, origin: frame.origin, rotation: frame.rotation, size: [2 + random() * 2, (3 + random() * 6) * lift, 2 + random() * 1.6], columns: 2, rows: 2, levels: 4 + Math.floor(random() * 4) })
        } else if (roll < 0.3) addVilla({ frame })
        else if (roll < 0.46) addTower({ frame, width: 1 + random() * 1.6, depth: 1 + random() * 1.6, height: (2.5 + Math.pow(random(), 1.7) * 9) * lift })
        else if (roll < 0.56) addSlabStack({ frame })
        else if (roll < 0.66) addPilotis({ frame })
        else if (roll < 0.74) addTerrace({ frame })
        else if (roll < 0.82) addCourtBlock({ frame })
        else if (roll < 0.9) addPergola({ frame })
        else addArcade({ frame })
      }
    }
  }
  return out
}

/** Distant dark towers (no shadows, little detail) that give the fog something to swallow. */
function buildSkyline({ random, curve, length }: BuildAlongPathParams) {
  const out: VolumeSpec[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const right = new Vector3()
  const push = ({ x, z, chunk }: { x: number; z: number; chunk: number }) => {
    const width = 4 + random() * 6
    out.push({
      kind: 'box',
      position: [x, 0, z],
      size: [width, 16 + Math.pow(random(), 1.8) * 46, 4 + random() * 6],
      rotationY: random() * Math.PI,
      tint: SKYLINE_TINTS[Math.floor(random() * SKYLINE_TINTS.length)],
      windowDensity: 0.22,
      emissive: 0.04,
      delay: 0.6 + random() * 0.3,
      chunk
    })
  }
  for (let distance = 0; distance < length; distance += 5) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    const side = random() < 0.5 ? -1 : 1
    const lateral = (36 + random() * 55) * side
    push({ x: point.x + right.x * lateral, z: point.z + right.z * lateral, chunk: Math.floor(distance / (CHUNK_LENGTH * 2)) })
  }
  const ringChunk = Math.floor(length / (CHUNK_LENGTH * 2)) + 1
  for (let i = 0; i < 46; i++) {
    const angle = random() * Math.PI * 2
    const radius = 34 + random() * 44
    const x = Math.cos(angle) * radius
    const z = -3 + Math.sin(angle) * radius
    if (z < -12 && Math.abs(x) < 16) continue
    push({ x, z, chunk: ringChunk })
  }
  return out
}

interface BuildForegroundParams extends BuildAlongPathParams {
  anchors: ProjectAnchor[]
}

const FOREGROUND_BEFORE = 4
const FOREGROUND_AFTER = 26

/** Slender columns and floating slabs close to the path. Near a photo wall they stay on the opposite side. */
function buildForeground({ random, curve, length, anchors }: BuildForegroundParams) {
  const out: VolumeSpec[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const right = new Vector3()
  for (let distance = 8; distance < length - 2; distance += 3.6) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    let side = random() < 0.5 ? -1 : 1
    const guarded = anchors.find((anchor) => {
      const arc = distance - anchor.u * length
      return arc > -FOREGROUND_BEFORE && arc < FOREGROUND_AFTER
    })
    if (guarded) side = -guarded.side
    const lateral = (2.4 + random() * 2.6) * side
    const x = point.x + right.x * lateral
    const z = point.z + right.z * lateral
    const chunk = Math.floor(distance / (CHUNK_LENGTH * 1.5))
    const delay = 0.55 + random() * 0.2
    if (random() < 0.62) {
      const diameter = 0.3 + random() * 0.35
      out.push({ kind: 'cylinder', position: [x, 0, z], size: [diameter, 3.5 + random() * 8, diameter], rotationY: 0, tint: random() < 0.5 ? '#c4bdb2' : '#a99c85', windowDensity: 0, emissive: 0, delay, chunk })
      continue
    }
    out.push({
      kind: 'box',
      position: [x, 2.6 + random() * 5, z],
      size: [1.4 + random() * 2.4, 0.18, 1 + random() * 1.5],
      rotationY: Math.atan2(tangent.x, tangent.z) + (random() - 0.5) * 0.6,
      tint: '#a99c85',
      windowDensity: 0,
      emissive: 0,
      delay,
      chunk
    })
  }
  return out
}

interface BuildPropsParams {
  random: Random
  curve: CatmullRomCurve3
  length: number
  isBlocked: (params: { x: number; z: number; radius: number }) => boolean
}

function pickCanopy({ random }: { random: Random }) {
  return CANOPY_TINTS[Math.floor(random() * CANOPY_TINTS.length)]
}

function addTree({ out, x, z, random, delay, chunk, heading = 0 }: { out: PropSpec[]; x: number; z: number; random: Random; delay: number; chunk: number; heading?: number }) {
  const trunkH = 1.05 + random() * 0.9
  const canopyR = 0.85 + random() * 0.75
  out.push({ kind: 'trunk', position: [x, 0, z], size: [0.14 + random() * 0.08, trunkH, 0.14 + random() * 0.08], rotationY: heading, tint: '#6b5c4c', delay, chunk })
  out.push({
    kind: 'canopy',
    position: [x, trunkH + canopyR * 0.32, z],
    size: [canopyR, canopyR * 0.82, canopyR],
    rotationY: heading,
    tint: pickCanopy({ random }),
    delay: delay + 0.04,
    chunk
  })
}

/** Olive trees, hedges, limestone planters, benches and street lamps along the spline and in the hero plaza. */
function buildProps({ random, curve, length, isBlocked }: BuildPropsParams) {
  const out: PropSpec[] = []
  const point = new Vector3()
  const tangent = new Vector3()
  const right = new Vector3()

  for (let distance = 6; distance < length - 2; distance += 5.1) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    const heading = Math.atan2(tangent.x, tangent.z)
    const chunk = Math.floor(distance / CHUNK_LENGTH)
    for (const side of [-1, 1]) {
      const lateral = 2.08 * side
      const x = point.x + right.x * lateral
      const z = point.z + right.z * lateral
      if (isBlocked({ x, z, radius: 3.2 })) continue
      const delay = 0.38 + random() * 0.22
      const poleH = 2.45 + random() * 0.35
      out.push({ kind: 'lamp', position: [x, 0, z], size: [0.07, poleH, 0.07], rotationY: heading, tint: '#8a8176', delay, chunk })
      out.push({ kind: 'lampHead', position: [x, poleH, z], size: [0.18, 0.18, 0.18], rotationY: 0, tint: '#f0d7a8', delay: delay + 0.04, chunk })
    }
  }

  for (let distance = 5; distance < length; distance += 3.2) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    const heading = Math.atan2(tangent.x, tangent.z)
    const chunk = Math.floor(distance / CHUNK_LENGTH)
    for (const side of [-1, 1]) {
      for (let layer = 0; layer < 2; layer++) {
        if (random() < 0.28) continue
        const lateral = (layer === 0 ? 6.8 + random() * 4.2 : 13 + random() * 8) * side
        const x = point.x + right.x * lateral
        const z = point.z + right.z * lateral
        if (isBlocked({ x, z, radius: layer === 0 ? 6 : 5 })) continue
        const delay = 0.42 + random() * 0.28
        if (random() < 0.18) {
          out.push({
            kind: 'hedge',
            position: [x, 0, z],
            size: [1.6 + random() * 1.4, 0.45 + random() * 0.35, 0.45 + random() * 0.25],
            rotationY: heading + (random() - 0.5) * 0.4,
            tint: '#6f7c64',
            delay,
            chunk
          })
          continue
        }
        addTree({ out, x, z, random, delay, chunk, heading })
        if (random() < 0.22)
          out.push({ kind: 'planter', position: [x, 0, z], size: [0.7 + random() * 0.3, 0.18, 0.7 + random() * 0.3], rotationY: heading, tint: '#c4bdb2', delay, chunk })
      }
    }
  }

  for (let distance = 10; distance < length - 6; distance += 9) {
    const u = distance / length
    curve.getPointAt(u, point)
    curve.getTangentAt(u, tangent).normalize()
    right.crossVectors(tangent, UP).normalize()
    const heading = Math.atan2(tangent.x, tangent.z)
    const chunk = Math.floor(distance / CHUNK_LENGTH)
    const side = random() < 0.5 ? -1 : 1
    const lateral = (3.4 + random() * 1.4) * side
    const x = point.x + right.x * lateral
    const z = point.z + right.z * lateral
    if (isBlocked({ x, z, radius: 4 })) continue
    out.push({
      kind: 'bench',
      position: [x, 0, z],
      size: [1.15, 0.22, 0.38],
      rotationY: heading + Math.PI / 2,
      tint: '#cfc6b8',
      delay: 0.5 + random() * 0.2,
      chunk
    })
  }

  const cell = 2.4
  for (let ix = -5; ix <= 5; ix++) {
    for (let iz = -5; iz <= 3; iz++) {
      if (random() > 0.22) continue
      const x = ix * cell + (random() - 0.5) * 0.5
      const z = iz * cell + (random() - 0.5) * 0.5
      if (Math.abs(x) < 2.8) continue
      if (isBlocked({ x, z, radius: 3 })) continue
      const delay = 0.08 + Math.hypot(x, z) * 0.03
      if (random() < 0.35) {
        out.push({ kind: 'plaza', position: [x, 0.02, z], size: [1.6 + random() * 0.8, 0.04, 1.6 + random() * 0.8], rotationY: 0, tint: PLAZA_TINT, delay, chunk: 0 })
        addTree({ out, x, z, random, delay: delay + 0.05, chunk: 0 })
        continue
      }
      addTree({ out, x, z, random, delay, chunk: 0 })
    }
  }

  return out
}
