'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'
import { scrollToSection } from '@/hooks/use-smooth-scroll'

interface SectionLinkProps {
  /** e.g. "/#about": smooth-scrolls when already on the home page, otherwise navigates there */
  href: string
  className?: string
  children: ReactNode
}

export function SectionLink({ href, className, children }: SectionLinkProps) {
  const pathname = usePathname()

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== '/') return
    event.preventDefault()
    scrollToSection({ target: href.replace('/', '') })
  }

  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  )
}
