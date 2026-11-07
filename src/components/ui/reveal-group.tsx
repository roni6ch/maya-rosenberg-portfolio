'use client'

import { useRef } from 'react'
import type { ElementType, ReactNode } from 'react'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'

interface RevealGroupProps {
  children: ReactNode
  className?: string
  /** element to render, defaults to div */
  as?: ElementType
  dir?: 'rtl' | 'ltr'
  lang?: string
}

/** Server-component friendly boundary: everything inside with [data-reveal] animates in on scroll. */
export function RevealGroup({ children, className, as: Tag = 'div', dir, lang }: RevealGroupProps) {
  const rootRef = useRef<HTMLElement>(null)
  useScrollReveal({ rootRef })
  return (
    <Tag ref={rootRef} className={className} dir={dir} lang={lang}>
      {children}
    </Tag>
  )
}
