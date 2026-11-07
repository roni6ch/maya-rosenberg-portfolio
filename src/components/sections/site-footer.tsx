import Link from 'next/link'
import { HebrewFont } from '@/components/ui/hebrew-font'
import { RemoteImg } from '@/components/ui/remote-img'
import { SectionLink } from '@/components/ui/section-link'
import { siteContent } from '@/data/site-content.generated'
import { LEGAL_LINKS, SECTION_LINKS, SOCIAL_LINKS } from '@/lib/site-links'

export function SiteFooter() {
  const { aboutImage, aboutParagraphs, contact, name, tagline } = siteContent
  const bio = aboutParagraphs[0]

  return (
    <footer className="relative z-[2] bg-[#1f1e1c] px-6 pb-10 pt-20 text-bone md:px-12 md:pt-28">
      <HebrewFont />
      <div className="mx-auto max-w-[110rem]">
        <div className="grid items-start gap-14 md:grid-cols-12">
          <div className="flex gap-8 md:col-span-6 lg:col-span-5">
            {aboutImage && (
              <div className="relative w-28 shrink-0 overflow-hidden sm:w-36 md:w-44">
                <RemoteImg
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${aboutImage.large}`}
                  thumb={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}${aboutImage.thumb}`}
                  alt="Maya Rosenberg, architect"
                  width={4}
                  height={5}
                  sizes="(max-width: 768px) 36vw, 176px"
                  imgClassName="object-[center_18%]"
                />
              </div>
            )}
            <div>
              <p className="text-[11px] font-light uppercase tracking-[0.4em]">{name}</p>
              <p className="mt-3 text-[10px] font-light uppercase tracking-[0.4em] text-bone/50">{tagline}</p>
              {bio && (
                <p dir="rtl" lang="he" className="font-hebrew mt-6 max-w-sm text-sm font-light leading-relaxed text-bone/70">
                  {bio}
                </p>
              )}
              <address className="mt-8 space-y-2 text-[12px] font-light not-italic tracking-[0.12em] text-bone/60">
                <p>{contact.address}</p>
                <p>
                  <a href={`tel:${contact.phone.replace(/-/g, '')}`} className="transition-opacity hover:opacity-70">
                    {contact.phone}
                  </a>
                </p>
                <p>
                  <a href={`mailto:${contact.email}`} className="transition-opacity hover:opacity-70">
                    {contact.email}
                  </a>
                </p>
              </address>
            </div>
          </div>
          <FooterColumn title="Explore" links={SECTION_LINKS} className="md:col-span-2 md:col-start-8" />
          <FooterColumn title="Follow" links={SOCIAL_LINKS} className="md:col-span-2" isExternal />
          <FooterColumn title="Legal" links={LEGAL_LINKS} className="md:col-span-2" />
        </div>
        <p className="mt-20 text-[10px] font-light uppercase tracking-[0.4em] text-bone/40">
          &copy; {new Date().getFullYear()} Maya Rosenberg Architect. Imagery and text from the studio&apos;s website.
        </p>
      </div>
    </footer>
  )
}

interface FooterColumnProps {
  title: string
  links: { label: string; href: string }[]
  className?: string
  isExternal?: boolean
}

function FooterColumn({ title, links, className = '', isExternal = false }: FooterColumnProps) {
  return (
    <nav aria-label={title} className={className}>
      <p className="text-[10px] font-light uppercase tracking-[0.4em] text-bone/40">{title}</p>
      <ul className="mt-6 space-y-3 text-[13px] font-light tracking-[0.12em]">
        {links.map((link) => (
          <li key={link.href}>
            {isExternal ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="inline-block min-h-11 py-1 transition-opacity hover:opacity-50">
                {link.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : link.href.startsWith('/#') ? (
              <SectionLink href={link.href} className="inline-block min-h-11 py-1 transition-opacity hover:opacity-50">
                {link.label}
              </SectionLink>
            ) : (
              <Link href={link.href} className="inline-block min-h-11 py-1 transition-opacity hover:opacity-50">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
