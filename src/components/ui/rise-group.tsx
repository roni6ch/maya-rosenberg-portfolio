'use client'

import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { useWorkRise } from '@/hooks/use-work-rise'

interface RiseGroupProps {
  children: ReactNode
  className?: string
}

/** Client wrapper that runs the bottom-to-top scroll choreography once the section nears the viewport. */
export function RiseGroup({ children, className }: RiseGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const isNear = useNearViewport(rootRef)
  useWorkRise({ rootRef, enabled: isNear })
  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
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
