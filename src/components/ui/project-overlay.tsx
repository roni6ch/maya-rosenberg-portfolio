'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { openProject, useActiveIndex } from '@/lib/scene-state'
import type { OverlayProject } from '@/types/portfolio'

interface ProjectOverlayProps {
  projects: OverlayProject[]
}

/** Title + metadata for the project the camera is currently dwelling on. Sits opposite the photo. */
export function ProjectOverlay({ projects }: ProjectOverlayProps) {
  const activeIndex = useActiveIndex()
  const [shownIndex, setShownIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<HTMLDivElement>(null)
  const isActive = activeIndex >= 0

  useEffect(() => {
    if (activeIndex >= 0) setShownIndex(activeIndex)
  }, [activeIndex])

  useEffect(() => {
    const root = rootRef.current
    const lines = linesRef.current ? Array.from(linesRef.current.children) : []
    if (!root) return
    if (!isActive) {
      const tween = gsap.to(root, { opacity: 0, duration: 0.5, ease: 'power2.out' })
      return () => {
        tween.kill()
      }
    }
    gsap.set(root, { opacity: 1 })
    const tween = gsap.fromTo(lines, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'power3.out' })
    return () => {
      tween.kill()
    }
  }, [isActive, shownIndex])

  const project = projects[shownIndex]
  if (!project) return null
  const isPhotoRight = shownIndex % 2 === 0
  const meta = [project.location, project.area, project.photographer && `Photography: ${project.photographer}`, project.note].filter(Boolean)

  return (
    <div
      ref={rootRef}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-20 flex mix-blend-difference px-6 pb-10 opacity-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:px-12 md:pb-0 ${isPhotoRight ? 'justify-start' : 'justify-end text-right'}`}
    >
      <div ref={linesRef} className="max-w-[26rem]">
        <p className="mb-5 text-[10px] font-light uppercase tracking-[0.5em] text-bone/60">
          {String(shownIndex + 1).padStart(2, '0')} / {String(projects.length).padStart(2, '0')}
        </p>
        <h2 className="text-[clamp(1.8rem,4vw,3.4rem)] font-extralight uppercase leading-[1.05] tracking-[0.06em] text-bone">{project.title}</h2>
        <ul className="mt-5 space-y-1.5">
          {meta.map((line) => (
            <li key={line} className="text-xs font-light tracking-[0.12em] text-bone/70">
              {line}
            </li>
          ))}
          {project.year && <li className="text-xs font-light tracking-[0.3em] text-bone/50">{project.year}</li>}
        </ul>
        <button
          type="button"
          onClick={() => openProject({ id: project.id })}
          className="pointer-events-auto mt-7 inline-flex items-center gap-4 text-[10px] font-light uppercase tracking-[0.4em] text-bone"
        >
          <span className="h-px w-10 bg-bone transition-all duration-500 hover:w-16" />
          View project
        </button>
      </div>
    </div>
  )
}
