import { ProjectCard } from '@/components/ui/project-card'
import type { ProjectCardVariant } from '@/components/ui/project-card'
import { RiseGroup } from '@/components/ui/rise-group'
import type { Project } from '@/types/portfolio'

interface ProjectIndexProps {
  projects: Project[]
}

export function ProjectIndex({ projects }: ProjectIndexProps) {
  return (
    <section
      id="projects"
      className="relative z-[2] rounded-t-[2rem] bg-paper px-6 py-28 shadow-[0_-32px_50px_-28px_rgba(70,62,52,0.18)] md:rounded-t-[4rem] md:px-12 md:py-44"
    >
      <RiseGroup className="mx-auto max-w-[110rem]">
        <div className="mb-16 flex items-end justify-between md:mb-20">
          <h2 className="overflow-hidden pb-2 text-[clamp(1.6rem,4vw,3.2rem)] font-extralight uppercase tracking-[0.2em]">
            <span data-rise-line className="block">
              Selected Projects
            </span>
          </h2>
          <p className="overflow-hidden text-[10px] font-light uppercase tracking-[0.4em] text-mist">
            <span data-rise-line className="block">
              {String(projects.length).padStart(2, '0')} works
            </span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-x-8 gap-y-20 md:grid-cols-12 md:gap-y-20">
          {projects.map((project, index) => {
            const layout = CARD_LAYOUT[index % CARD_LAYOUT.length]
            return (
              <div key={project.id} className={layout.className}>
                <ProjectCard
                  id={project.id}
                  index={index}
                  title={project.title}
                  location={project.location}
                  year={project.year}
                  variant={layout.variant}
                  cover={{ large: project.cover.large, thumb: project.cover.thumb, width: project.cover.width, height: project.cover.height }}
                />
              </div>
            )
          })}
        </div>
      </RiseGroup>
    </section>
  )
}

/** Editorial rhythm: wide, tall (pushed down), tall, wide (pushed down), repeating. */
const CARD_LAYOUT: { variant: ProjectCardVariant; className: string }[] = [
  { variant: 'wide', className: 'md:col-span-7' },
  { variant: 'tall', className: 'md:col-span-4 md:col-start-9 md:mt-[12vh]' },
  { variant: 'tall', className: 'md:col-span-4 md:col-start-2' },
  { variant: 'wide', className: 'md:col-span-7 md:col-start-6 md:mt-[10vh]' }
]
