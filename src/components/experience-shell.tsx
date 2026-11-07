'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { usePointerTracking } from '@/hooks/use-pointer-tracking'
import { useSmoothScroll } from '@/hooks/use-smooth-scroll'
import { EXIT_RUNWAY } from '@/lib/scene-layout'
import type { OverlayProject, Project, SceneProject } from '@/types/portfolio'
import { HeroOverlay } from './ui/hero-overlay'
import { Loader } from './ui/loader'
import { Nav } from './ui/nav'
import { ProjectDetail } from './ui/project-detail'
import { ProjectOverlay } from './ui/project-overlay'

const SceneCanvas = dynamic(() => import('./scene/scene-canvas'), { ssr: false })

interface ExperienceShellProps {
  projects: Project[]
  tagline: string
  children: ReactNode
}

const SCREENS_PER_PROJECT = 1.2

export function ExperienceShell({ projects, tagline, children }: ExperienceShellProps) {
  useSmoothScroll()
  usePointerTracking()

  const sceneProjects = projects.map(toSceneProject)
  const overlayProjects = projects.map(toOverlayProject)
  const journeyHeight = `${Math.round((projects.length + EXIT_RUNWAY) * SCREENS_PER_PROJECT * 100)}vh`

  return (
    <>
      <Suspense fallback={null}>
        <SceneCanvas projects={sceneProjects} />
      </Suspense>
      <Loader />
      <Nav />
      <HeroOverlay tagline={tagline} />
      <ProjectOverlay projects={overlayProjects} />
      <ProjectDetail projects={projects} />
      <main className="relative z-10">
        <section id="journey" aria-label="Project journey" style={{ height: journeyHeight }} />
        <div id="main-content" tabIndex={-1} className="relative -mt-[38vh] outline-none">
          {children}
        </div>
      </main>
    </>
  )
}

function toSceneProject(project: Project): SceneProject {
  const photos = project.images.filter((image) => image.kind === 'photo' && image.src !== project.cover.src)
  const images = [project.cover, ...photos.slice(0, 3)]
  return { id: project.id, images: images.map((image) => ({ url: image.full, width: image.width, height: image.height })) }
}

function toOverlayProject(project: Project): OverlayProject {
  const { id, title, location, area, photographer, year, note } = project
  return { id, title, location, area, photographer, year, note }
}
