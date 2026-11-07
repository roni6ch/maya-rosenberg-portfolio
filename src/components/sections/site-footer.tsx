import Link from 'next/link'
import { SectionLink } from '@/components/ui/section-link'
import { LEGAL_LINKS, SECTION_LINKS, SOCIAL_LINKS } from '@/lib/site-links'

export function SiteFooter() {
  return (
    <footer className="bg-night px-6 pb-10 pt-20 text-bone md:px-12 md:pt-28">
      <div className="mx-auto max-w-[110rem]">
        <div className="grid gap-14 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="text-[11px] font-light uppercase tracking-[0.4em]">Maya Rosenberg</p>
            <p className="mt-3 text-[10px] font-light uppercase tracking-[0.4em] text-bone/50">Architect</p>
          </div>
          <FooterColumn title="Explore" links={SECTION_LINKS} className="md:col-span-3" />
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
              <a href={link.href} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-50">
                {link.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : link.href.startsWith('/#') ? (
              <SectionLink href={link.href} className="transition-opacity hover:opacity-50">
                {link.label}
              </SectionLink>
            ) : (
              <Link href={link.href} className="transition-opacity hover:opacity-50">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
