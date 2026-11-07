'use client'

import { useEffect } from 'react'

/** Loads Heebo only when Hebrew content is about to render — keeps it off the critical font path. */
export function HebrewFont() {
  useEffect(() => {
    void import('@fontsource-variable/heebo/wght.css')
  }, [])
  return null
}
