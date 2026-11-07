'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'

interface ContactFormProps {
  email: string
}

type FormStatus = 'idle' | 'sent'

/**
 * Same fields as the original site's form (name, phone, email). There is no mail backend, so submitting composes
 * a pre-filled message in the visitor's own mail app and nothing is stored or sent by this site.
 */
export function ContactForm({ email }: ContactFormProps) {
  const [status, setStatus] = useState<FormStatus>('idle')

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const field = (name: string) => String(data.get(name) ?? '').trim()
    const body = [`Name: ${field('name')}`, `Phone: ${field('phone')}`, `Email: ${field('email')}`, '', field('message')].join('\n')
    const subject = `Website inquiry from ${field('name')}`
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setStatus('sent')
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-8" aria-label="Contact form">
      <FormField name="name" label="Name" autoComplete="name" required />
      <FormField name="phone" label="Phone number" type="tel" autoComplete="tel" required />
      <FormField name="email" label="Email" type="email" autoComplete="email" required />
      <FormField name="message" label="Message (optional)" isMultiline />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        <button
          type="submit"
          className="border border-ink px-10 py-4 text-[11px] font-light uppercase tracking-[0.4em] transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper"
        >
          Send
        </button>
        <p className="text-[11px] font-light tracking-[0.1em] text-mist">
          By sending you agree to the{' '}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
      <p role="status" className="min-h-5 text-[12px] font-light tracking-[0.1em] text-ink/70">
        {status === 'sent' ? 'Opening your email app with the message ready to send.' : ''}
      </p>
    </form>
  )
}

interface FormFieldProps {
  name: string
  label: string
  type?: string
  autoComplete?: string
  required?: boolean
  isMultiline?: boolean
}

const FIELD_CLASS =
  'peer w-full border-b border-ink/30 bg-transparent pb-3 pt-6 text-base font-light tracking-[0.04em] text-ink outline-none transition-colors placeholder:text-transparent focus:border-ink'

function FormField({ name, label, type = 'text', autoComplete, required = false, isMultiline = false }: FormFieldProps) {
  return (
    <div className="relative">
      {isMultiline ? (
        <textarea id={`contact-${name}`} name={name} rows={3} placeholder={label} className={`${FIELD_CLASS} resize-none`} />
      ) : (
        <input id={`contact-${name}`} name={name} type={type} autoComplete={autoComplete} required={required} placeholder={label} className={FIELD_CLASS} />
      )}
      <label
        htmlFor={`contact-${name}`}
        className="pointer-events-none absolute left-0 top-0 text-[10px] font-light uppercase tracking-[0.35em] text-mist transition-colors peer-focus:text-ink"
      >
        {label}
        {required && <span aria-hidden> *</span>}
      </label>
    </div>
  )
}
