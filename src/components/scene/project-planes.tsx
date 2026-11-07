'use client'

import type { SceneLayout } from '@/lib/scene-layout'
import { useNearIndex } from '@/lib/scene-state'
import type { SceneProject } from '@/types/portfolio'
import { ImagePlane } from './image-plane'

interface ProjectPlanesProps {
  projects: SceneProject[]
  layout: SceneLayout
}

const MAIN_MAX_HEIGHT = 5.6
const EXTRA_MAX_HEIGHT = 4

/** The real project photos, placed along the spline. Only the nearest projects keep textures resident. */
export function ProjectPlanes({ projects, layout }: ProjectPlanesProps) {
  const nearIndex = useNearIndex()

  return (
    <>
      {layout.anchors.map((anchor, index) => {
        const project = projects[index]
        if (!project) return null
        const enabled = Math.abs(index - nearIndex) <= 1
        const [cover, ...rest] = project.images
        return (
          <group key={project.id}>
            {cover && (
              <ImagePlane
                url={cover.url}
                position={anchor.main.position}
                faceTo={anchor.camera}
                width={anchor.main.width}
                maxHeight={MAIN_MAX_HEIGHT}
                enabled={enabled}
                phase={index}
              />
            )}
            {anchor.extras.map((extra, extraIndex) => {
              const image = rest[extraIndex]
              if (!image) return null
              return (
                <ImagePlane
                  key={image.url}
                  url={image.url}
                  position={extra.position}
                  faceTo={anchor.camera}
                  width={extra.width}
                  maxHeight={EXTRA_MAX_HEIGHT}
                  enabled={enabled}
                  phase={index + extraIndex * 1.7 + 1}
                />
              )
            })}
          </group>
        )
      })}
    </>
  )
}
