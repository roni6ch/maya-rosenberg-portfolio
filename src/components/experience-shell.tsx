'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { usePointerTracking } from '@/hooks/use-pointer-tracking'
import { useSmoothScroll } from '@/hooks/use-smooth-scroll'
import { EXIT_RUNWAY } from '@/lib/scene-constants'
import { useDetailProjectId } from '@/lib/scene-state'
import type { OverlayProject, Project, SceneProject } from '@/types/portfolio'
import { HeroOverlay } from './ui/hero-overlay'
import { Loader } from './ui/loader'
import { Nav } from './ui/nav'
import { ProjectOverlay } from './ui/project-overlay'
import { SnakeOverlay } from './ui/snake-overlay'

const SceneCanvas = dynamic(() => import('./scene/scene-canvas'), { ssr: false })

const ProjectDetail = dynamic(() => import('./ui/project-detail').then((module) => ({ default: module.ProjectDetail })), {
  ssr: false
})

interface ExperienceShellProps {
  projects: Project[]
  tagline: string
  children: ReactNode
}

export function ExperienceShell({ projects, tagline, children }: ExperienceShellProps) {
  useSmoothScroll()
  usePointerTracking()

  const sceneProjects = projects.map(toSceneProject)
  const overlayProjects = projects.map(toOverlayProject)
  const journeyHeight = `calc(${projects.length + EXIT_RUNWAY} * var(--journey-screen))`

  return (
    <>
      <Suspense fallback={null}>
        <SceneCanvas projects={sceneProjects} />
      </Suspense>
      <Loader />
      <Nav />
      <SnakeOverlay />
      <HeroOverlay tagline={tagline} />
      <ProjectOverlay projects={overlayProjects} />
      <ProjectDetailGate projects={projects} />
      <main className="relative z-10">
        <section id="journey" aria-label="Project journey" className="touch-pan-y" style={{ height: journeyHeight }} />
        <div id="main-content" tabIndex={-1} className="relative -mt-[38vh] outline-none">
          {children}
        </div>
      </main>
    </>
  )
}

/** Loads the heavy gallery chunk only after a project is opened. */
function ProjectDetailGate({ projects }: { projects: Project[] }) {
  const projectId = useDetailProjectId()
  if (projectId === null) return null
  return <ProjectDetail projects={projects} />
}

function toSceneProject(project: Project): SceneProject {
  const photos = project.images.filter((image) => image.kind === 'photo' && image.src !== project.cover.src)
  const images = [project.cover, ...photos.slice(0, 3)]
  // ~1024px textures are enough for WebGL planes and cut decode/GPU cost on boot
  return { id: project.id, images: images.map((image) => ({ url: image.large, width: image.width, height: image.height })) }
}

function toOverlayProject(project: Project): OverlayProject {
  const { id, title, location, area, photographer, year, note } = project
  return { id, title, location, area, photographer, year, note }
}
