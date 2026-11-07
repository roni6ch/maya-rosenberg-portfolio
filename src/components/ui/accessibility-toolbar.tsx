'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type ToggleKey = 'grayscale' | 'contrast' | 'negative' | 'underline' | 'readable'

interface A11yState {
  textStep: number
  toggles: Record<ToggleKey, boolean>
}

const STORAGE_KEY = 'a11y-prefs'
const MAX_TEXT_STEP = 3
const MIN_TEXT_STEP = -2
const TEXT_STEP_PERCENT = 10

const INITIAL_STATE: A11yState = {
  textStep: 0,
  toggles: { grayscale: false, contrast: false, negative: false, underline: false, readable: false }
}

const TOGGLE_OPTIONS: { key: ToggleKey; label: string }[] = [
  { key: 'grayscale', label: 'Grayscale' },
  { key: 'contrast', label: 'High contrast' },
  { key: 'negative', label: 'Negative contrast' },
  { key: 'underline', label: 'Links underline' },
  { key: 'readable', label: 'Readable font' }
]

function applyState({ state }: { state: A11yState }) {
  const root = document.documentElement
  const { toggles, textStep } = state
  root.style.fontSize = textStep === 0 ? '' : `${100 + textStep * TEXT_STEP_PERCENT}%`
  const filters = [toggles.grayscale && 'grayscale(1)', toggles.contrast && 'contrast(1.45)', toggles.negative && 'invert(1) hue-rotate(180deg)'].filter(Boolean)
  root.style.filter = filters.join(' ')
  root.classList.toggle('a11y-underline', toggles.underline)
  root.classList.toggle('a11y-readable', toggles.readable)
}

function readStoredState(): A11yState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_STATE
    const parsed = JSON.parse(raw) as Partial<A11yState>
    const textStep = Math.min(MAX_TEXT_STEP, Math.max(MIN_TEXT_STEP, Number(parsed.textStep) || 0))
    return { textStep, toggles: { ...INITIAL_STATE.toggles, ...parsed.toggles } }
  } catch {
    return INITIAL_STATE
  }
}

/** Display-adjustment panel promised by the accessibility statement (text size, contrast, links, font). Preferences persist locally. */
export function AccessibilityToolbar() {
  const [state, setState] = useState<A11yState>(INITIAL_STATE)
  const [isOpen, setIsOpen] = useState(false)
  const isHydrated = useRef(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setState(readStoredState())
    isHydrated.current = true
  }, [])

  useEffect(() => {
    if (!isHydrated.current) return
    applyState({ state })
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage can be unavailable (private mode); the preference then simply lasts for the visit
    }
  }, [state])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      buttonRef.current?.focus()
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isOpen])

  function changeText({ delta }: { delta: number }) {
    setState((current) => ({ ...current, textStep: Math.min(MAX_TEXT_STEP, Math.max(MIN_TEXT_STEP, current.textStep + delta)) }))
  }

  function toggle({ key }: { key: ToggleKey }) {
    setState((current) => ({ ...current, toggles: { ...current.toggles, [key]: !current.toggles[key] } }))
  }

  return (
    <div className="fixed left-2 top-1/2 z-[45] -translate-y-1/2 font-sans">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        aria-label="Accessibility options"
        onClick={() => setIsOpen((open) => !open)}
        className="grid h-10 w-10 place-items-center rounded-full border border-white/30 bg-night/80 text-bone backdrop-blur transition-colors hover:bg-night focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="4.5" r="1.7" />
          <path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M8.5 20l3.5-5.5 3.5 5.5" />
        </svg>
      </button>
      <div
        ref={panelRef}
        id="a11y-panel"
        role="group"
        aria-label="Accessibility options"
        hidden={!isOpen}
        className="absolute left-12 top-1/2 w-64 -translate-y-1/2 rounded-2xl border border-white/15 bg-night/95 p-4 text-bone shadow-2xl backdrop-blur"
      >
        <div className="grid grid-cols-2 gap-2">
          <PanelButton label="Increase text" onClick={() => changeText({ delta: 1 })} isDisabled={state.textStep >= MAX_TEXT_STEP} />
          <PanelButton label="Decrease text" onClick={() => changeText({ delta: -1 })} isDisabled={state.textStep <= MIN_TEXT_STEP} />
        </div>
        <div className="mt-2 grid gap-2">
          {TOGGLE_OPTIONS.map(({ key, label }) => (
            <PanelButton key={key} label={label} isPressed={state.toggles[key]} onClick={() => toggle({ key })} />
          ))}
          <PanelButton label="Reset" onClick={() => setState(INITIAL_STATE)} />
        </div>
        <Link href="/accessibility" className="mt-4 block text-center text-[11px] font-light tracking-[0.15em] underline underline-offset-4">
          Accessibility statement
        </Link>
      </div>
    </div>
  )
}

interface PanelButtonProps {
  label: string
  onClick: () => void
  isPressed?: boolean
  isDisabled?: boolean
}

function PanelButton({ label, onClick, isPressed, isDisabled = false }: PanelButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isPressed}
      className={`rounded-lg border px-3 py-2 text-left text-[12px] font-light tracking-[0.08em] transition-colors disabled:opacity-40 ${isPressed ? 'border-bone bg-bone text-night' : 'border-white/20 hover:border-white/50'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white`}
    >
      {label}
    </button>
  )
}
