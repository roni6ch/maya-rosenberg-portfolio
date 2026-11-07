'use client'

import { openProject } from '@/lib/scene-state'
import type { RemoteImage } from '@/types/portfolio'
import { RemoteImg } from './remote-img'

export type ProjectCardVariant = 'wide' | 'tall'

interface ProjectCardProps {
  id: number
  index: number
  title: string
  location: string
  year: string
  variant: ProjectCardVariant
  cover: Pick<RemoteImage, 'large' | 'thumb' | 'width' | 'height'>
}

const VARIANT_RATIO: Record<ProjectCardVariant, { width: number; height: number }> = {
  wide: { width: 4, height: 3 },
  tall: { width: 4, height: 5 }
}

const VARIANT_SPEED: Record<ProjectCardVariant, number> = { wide: 0.25, tall: 1 }

export function ProjectCard({ id, index, title, location, year, variant, cover }: ProjectCardProps) {
  const ratio = VARIANT_RATIO[variant]
  return (
    <button
      type="button"
      data-rise
      data-speed={VARIANT_SPEED[variant]}
      onClick={() => openProject({ id })}
      className="group block w-full text-left"
      aria-label={`Open project ${title}`}
    >
      <div className="relative overflow-hidden">
        <RemoteImg
          rise
          src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${cover.large}`}
          thumb={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${cover.thumb}`}
          alt={title}
          width={ratio.width}
          height={ratio.height}
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 58vw, 640px"
          className="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.035]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-5 left-5 bg-paper px-4 py-2 text-[10px] font-light uppercase tracking-[0.35em] text-ink opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 max-md:hidden translate-y-3"
        >
          View project
        </span>
      </div>
      <div className="mt-6 flex items-start justify-between gap-6">
        <div>
          <Line>
            <span className="text-[10px] font-light tracking-[0.4em] text-mist">{String(index + 1).padStart(2, '0')}</span>
          </Line>
          <Line>
            <h3 className="mt-2 text-xl font-extralight uppercase tracking-[0.12em] md:text-2xl">{title}</h3>
          </Line>
        </div>
        <Line>
          <span className="block text-right text-[11px] font-light tracking-[0.15em] text-ink/60">
            {location}
            {year && <span className="block text-mist">{year}</span>}
          </span>
        </Line>
      </div>
    </button>
  )
}

/** Mask wrapper: the child slides up out of it (see use-work-rise). */
function Line({ children }: { children: React.ReactNode }) {
  return (
    <span className="block overflow-hidden pb-1">
      <span data-rise-line className="block">
        {children}
      </span>
    </span>
  )
}
