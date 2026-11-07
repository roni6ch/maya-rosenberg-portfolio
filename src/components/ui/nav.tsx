'use client'

import { useEffect, useState } from 'react'
import { scrollToSection } from '@/hooks/use-smooth-scroll'
import { scrollApi, useIntroDone } from '@/lib/scene-state'

export function Nav() {
  const introDone = useIntroDone()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  useEffect(() => {
    if (!isMenuOpen) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setIsMenuOpen(false)
    window.addEventListener('keydown', onKeyDown)
    scrollApi.lenis?.stop()
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      scrollApi.lenis?.start()
    }
  }, [isMenuOpen])

  function goTo({ target }: { target: string }) {
    setIsMenuOpen(false)
    // wait a frame so Lenis is running again before it is asked to scroll
    requestAnimationFrame(() => scrollToSection({ target }))
  }

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-6 text-white mix-blend-difference transition-opacity duration-1000 md:px-12 ${introDone ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <button type="button" onClick={() => goTo({ target: '#journey' })} className="text-[11px] font-light uppercase tracking-[0.4em]">
          Maya Rosenberg
        </button>
        <nav aria-label="Primary" className="hidden gap-9 lg:flex">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.target}
              type="button"
              onClick={() => goTo({ target: item.target })}
              className="text-[11px] font-light uppercase tracking-[0.3em] opacity-80 transition-opacity hover:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="text-[11px] font-light uppercase tracking-[0.3em] lg:hidden"
        >
          {isMenuOpen ? 'Close' : 'Menu'}
        </button>
      </header>
      <div
        id="mobile-menu"
        aria-hidden={!isMenuOpen}
        className={`fixed inset-0 z-[25] flex flex-col justify-center bg-night/95 px-8 backdrop-blur-md transition-opacity duration-500 lg:hidden ${isMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      >
        <nav aria-label="Mobile" className="flex flex-col gap-6">
          {NAV_ITEMS.map((item, index) => (
            <button
              key={item.target}
              type="button"
              tabIndex={isMenuOpen ? 0 : -1}
              onClick={() => goTo({ target: item.target })}
              style={{ transitionDelay: isMenuOpen ? `${120 + index * 60}ms` : '0ms' }}
              className={`text-left text-3xl font-extralight uppercase tracking-[0.2em] text-bone transition-all duration-700 ${isMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}

const NAV_ITEMS = [
  { label: 'Projects', target: '#projects' },
  { label: 'About', target: '#about' },
  { label: 'Recommendations', target: '#recommendations' },
  { label: 'Press', target: '#press' },
  { label: 'Contact', target: '#contact' }
]
