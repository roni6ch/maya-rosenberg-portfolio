'use client'

import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'
import { openProject, scrollApi, useDetailProjectId } from '@/lib/scene-state'
import type { Project } from '@/types/portfolio'
import { RemoteImg } from './remote-img'

interface ProjectDetailProps {
  projects: Project[]
}

/** Full-screen gallery of every photo scraped for a project. */
export function ProjectDetail({ projects }: ProjectDetailProps) {
  const projectId = useDetailProjectId()
  const project = projects.find((item) => item.id === projectId)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!project) return
    scrollApi.lenis?.stop()
    document.documentElement.classList.add('is-detail')
    const root = rootRef.current
    root?.scrollTo({ top: 0 })
    const tween = gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' })
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && openProject({ id: null })
    window.addEventListener('keydown', onKey)
    return () => {
      tween.kill()
      window.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('is-detail')
      scrollApi.lenis?.start()
    }
  }, [project])

  useScrollReveal({ rootRef, scrollerRef: rootRef, contentKey: project?.id, enabled: Boolean(project) })

  if (!project) return null

  const meta = [project.location, project.area, project.photographer && `Photography: ${project.photographer}`, project.year, project.note].filter(Boolean)

  return (
    <div
      ref={rootRef}
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      aria-label={project.title}
      className="fixed inset-0 z-40 overflow-y-auto bg-paper"
    >
      <button
        type="button"
        onClick={() => openProject({ id: null })}
        className="fixed right-6 top-6 z-50 text-[11px] font-light uppercase tracking-[0.4em] text-ink md:right-12"
      >
        Close
      </button>
      <div className="mx-auto max-w-[110rem] px-6 pb-24 pt-28 md:px-12">
        <header className="mb-14 md:mb-20">
          <h2 className="text-[clamp(2rem,6vw,5.5rem)] font-extralight uppercase leading-none tracking-[0.06em]">{project.title}</h2>
          <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-2">
            {meta.map((line) => (
              <li key={line} className="text-xs font-light tracking-[0.15em] text-ink/70">
                {line}
              </li>
            ))}
          </ul>
        </header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          {project.images.map((image, index) => (
            <div key={image.src} data-reveal className={getSpan({ index, isPortrait: image.height > image.width })}>
              <RemoteImg
                reveal
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${image.full}`}
                thumb={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${image.large}`}
                alt={image.alt || `${project.title} ${index + 1}`}
                width={image.width}
                height={image.height}
                priority={index === 0}
                sizes={image.height > image.width ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, 80vw'}
              />
            </div>
          ))}
        </div>
        <p className="mt-16 text-[10px] font-light uppercase tracking-[0.35em] text-mist">
          Source: <a href={project.sourceUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">mayarosenberg.co.il</a>
        </p>
      </div>
    </div>
  )
}

interface GetSpanParams {
  index: number
  isPortrait: boolean
}

function getSpan({ index, isPortrait }: GetSpanParams) {
  if (isPortrait) return 'md:col-span-4'
  return index % 5 === 0 ? 'md:col-span-12' : 'md:col-span-6'
}
