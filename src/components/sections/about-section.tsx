import { HebrewFont } from '@/components/ui/hebrew-font'
import { RemoteImg } from '@/components/ui/remote-img'
import { RevealGroup } from '@/components/ui/reveal-group'
import type { SiteContent } from '@/types/portfolio'

interface AboutSectionProps {
  content: SiteContent
}

export function AboutSection({ content }: AboutSectionProps) {
  const { aboutImage, aboutHeading, aboutParagraphs } = content
  const [lead, ...rest] = aboutParagraphs

  return (
    <section id="about" className="relative z-[2] bg-paper px-6 py-28 md:px-12 md:py-44">
      <HebrewFont />
      <RevealGroup className="mx-auto grid max-w-[110rem] items-start gap-12 md:grid-cols-12 md:gap-16">
        <p data-reveal="soft" className="text-[10px] font-light uppercase tracking-[0.5em] text-mist md:col-span-12">
          The studio
        </p>
        {aboutImage && (
          <figure className="md:col-span-6 lg:col-span-5">
            <div data-reveal className="overflow-hidden">
              <RemoteImg
                reveal
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || '/maya-rosenberg-portfolio'}${aboutImage.full}`}
                thumb={`${process.env.NEXT_PUBLIC_BASE_PATH || '/maya-rosenberg-portfolio'}${aboutImage.thumb}`}
                alt="Maya Rosenberg, architect"
                width={aboutImage.width}
                height={aboutImage.height}
                sizes="(max-width: 768px) 100vw, 46vw"
                imgClassName="object-[center_20%]"
              />
            </div>
            <figcaption data-reveal="soft" className="mt-5 flex flex-wrap items-baseline justify-between gap-3 text-[10px] font-light uppercase tracking-[0.35em] text-mist">
              <span>Maya Rosenberg</span>
              <span>Architect</span>
            </figcaption>
          </figure>
        )}
        <div className="md:col-span-6 md:col-start-7 lg:col-span-6 lg:col-start-7">
          <h2 data-reveal="soft" className="text-[clamp(1.6rem,4vw,3.2rem)] font-extralight uppercase tracking-[0.2em]">
            {aboutHeading}
          </h2>
          <div dir="rtl" lang="he" className="font-hebrew mt-10 space-y-6 text-[1.05rem] font-light leading-[2] text-ink/85">
            {lead && (
              <p data-reveal="soft" className="text-2xl font-extralight tracking-wide text-ink">
                {lead}
              </p>
            )}
            {rest.map((paragraph) => (
              <p key={paragraph} data-reveal="soft">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </RevealGroup>
    </section>
  )
}
