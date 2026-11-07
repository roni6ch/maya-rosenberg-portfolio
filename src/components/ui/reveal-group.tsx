'use client'

import { useEffect, useRef, useState } from 'react'
import type { ElementType, ReactNode, RefObject } from 'react'
import { useScrollReveal } from '@/hooks/use-scroll-reveal'

interface RevealGroupProps {
  children: ReactNode
  className?: string
  /** element to render, defaults to div */
  as?: ElementType
  dir?: 'rtl' | 'ltr'
  lang?: string
}

/** Server-component friendly boundary: [data-reveal] children animate once the section nears the viewport. */
export function RevealGroup({ children, className, as: Tag = 'div', dir, lang }: RevealGroupProps) {
  const rootRef = useRef<HTMLElement>(null)
  const isNear = useNearViewport(rootRef)
  useScrollReveal({ rootRef, enabled: isNear })
  return (
    <Tag ref={rootRef} className={className} dir={dir} lang={lang}>
      {children}
    </Tag>
  )
}

function useNearViewport(rootRef: RefObject<HTMLElement>) {
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    if (!root || isNear) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsNear(true)
        observer.disconnect()
      },
      { rootMargin: '25% 0px' }
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef, isNear])

  return isNear
}
