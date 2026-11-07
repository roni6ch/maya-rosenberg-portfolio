'use client'

import { useRef } from 'react'
import type { ReactNode } from 'react'
import { useWorkRise } from '@/hooks/use-work-rise'

interface RiseGroupProps {
  children: ReactNode
  className?: string
}

/** Client wrapper that runs the bottom-to-top scroll choreography for its [data-rise] descendants. */
export function RiseGroup({ children, className }: RiseGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  useWorkRise({ rootRef })
  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  )
}
