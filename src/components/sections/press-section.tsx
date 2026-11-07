import { RemoteImg } from '@/components/ui/remote-img'
import { RevealGroup } from '@/components/ui/reveal-group'
import type { PressItem, SiteContent } from '@/types/portfolio'

interface PressSectionProps {
  content: SiteContent
}

export function PressSection({ content }: PressSectionProps) {
  if (!content.pressItems.length) return null

  return (
    <section id="press" className="border-t border-ink/10 bg-paper px-6 py-28 md:px-12 md:py-40">
      <div className="mx-auto max-w-[110rem]">
        <h2 className="mb-16 text-[clamp(1.6rem,4vw,3.2rem)] font-extralight uppercase tracking-[0.2em] md:mb-24">Press</h2>
        <RevealGroup className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 xl:grid-cols-5">
          {content.pressItems.map((item, index) => (
            <PressCard key={item.href} item={item} index={index} />
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

interface PressCardProps {
  item: PressItem
  index: number
}

function PressCard({ item, index }: PressCardProps) {
  const { image, href, outlet } = item
  return (
    <a
      data-reveal
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${outlet}: read the press feature (opens in a new tab)`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <RemoteImg
        reveal
        src={image.full}
        thumb={image.thumb}
        alt={image.alt || `${outlet} press feature`}
        width={image.width}
        height={image.height}
        className="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
      />
      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p data-reveal-line className="text-[10px] font-light tracking-[0.4em] text-mist">
            {String(index + 1).padStart(2, '0')}
          </p>
          <p data-reveal-line className="mt-2 text-sm font-extralight uppercase tracking-[0.2em]">
            {outlet}
          </p>
        </div>
        <span data-reveal-line aria-hidden className="text-lg font-extralight transition-transform duration-500 group-hover:translate-x-1 group-hover:-translate-y-1">
          &#8599;
        </span>
      </div>
    </a>
  )
}
