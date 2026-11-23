import React, { useId, useLayoutEffect, useRef, useState } from 'react'
import { ArrowRight, Compass, LoaderCircle, X } from 'lucide-react'
import './auth-dialog.css'

export default function AuthDialog({ initialMode, onClose, onAuthenticate }) {
  const [mode, setMode] = useState(initialMode)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const pending = useRef(false)
  const dialogRef = useRef(null)
  const usernameRef = useRef(null)
  const id = useId()
  const registering = mode === 'register'
  const fields = error?.fields ?? {}
  const hasFieldError = Boolean(fields.username || fields.password || (registering && fields.email))

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    dialog.showModal()
    usernameRef.current.focus()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected && document.activeElement === document.body) {
        opener.focus()
      }
    }
  }, [])

  function dismiss() {
    if (!pending.current) onClose()
  }

  function switchMode() {
    setError(null)
    setMode(registering ? 'login' : 'register')
    usernameRef.current.focus()
  }

  async function submit(event) {
    event.preventDefault()
    if (pending.current) return
    const values = new FormData(event.currentTarget)
    const credentials = { username: values.get('username').trim(), password: values.get('password') }
    if (registering) credentials.email = values.get('email').trim()

    pending.current = true
    setSubmitting(true)
    setError(null)
    try {
      await onAuthenticate(mode, credentials)
    } catch (failure) {
      setError(failure instanceof Error ? failure : new Error('Please try again.'))
    } finally {
      pending.current = false
      setSubmitting(false)
    }
  }

  return <dialog
    ref={dialogRef}
    aria-labelledby={id + '-title'}
    aria-describedby={id + '-intro'}
    className="auth-dialog"
    onCancel={event => { event.preventDefault(); dismiss() }}
    onClick={event => { if (event.target === event.currentTarget) dismiss() }}
  >
    <div className="auth-dialog-content">
      <button type="button" className="icon-button auth-dialog-close" onClick={dismiss} aria-label="Close sign-in dialog" disabled={submitting}>
        <X size={21} aria-hidden="true" />
      </button>
      <span className="auth-dialog-mark" aria-hidden="true"><Compass size={27} strokeWidth={2.1} /></span>
      <h2 id={id + '-title'}>{registering ? 'Create your account' : 'Sign in to Thinkplore'}</h2>
      <p id={id + '-intro'} className="auth-dialog-intro">Save activities you want to try and build a learning plan for the week.</p>

      <form className="auth-dialog-form" onSubmit={submit} aria-busy={submitting}>
        {error && !hasFieldError && <p className="auth-dialog-error auth-dialog-form-error" role="alert">{error.message}</p>}
        <div className="auth-dialog-field">
          <label htmlFor={id + '-username'}>Username</label>
          <input
            ref={usernameRef}
            id={id + '-username'}
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={150}
            required
            aria-invalid={Boolean(fields.username)}
            aria-describedby={fields.username ? id + '-username-error' : undefined}
          />
          {fields.username && <p className="auth-dialog-error" id={id + '-username-error'} role="alert">{fields.username}</p>}
        </div>
        {registering && <div className="auth-dialog-field">
          <label htmlFor={id + '-email'}>Email address</label>
          <input
            id={id + '-email'}
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? id + '-email-error' : undefined}
          />
          {fields.email && <p className="auth-dialog-error" id={id + '-email-error'} role="alert">{fields.email}</p>}
        </div>}
        <div className="auth-dialog-field">
          <label htmlFor={id + '-password'}>Password</label>
          <input
            key={mode}
            id={id + '-password'}
            name="password"
            type="password"
            autoComplete={registering ? 'new-password' : 'current-password'}
            minLength={registering ? 8 : undefined}
            required
            aria-invalid={Boolean(fields.password)}
            aria-describedby={fields.password ? id + '-password-error' : registering ? id + '-password-hint' : undefined}
          />
          {fields.password
            ? <p className="auth-dialog-error" id={id + '-password-error'} role="alert">{fields.password}</p>
            : registering && <p className="auth-dialog-hint" id={id + '-password-hint'}>Use at least 8 characters.</p>}
        </div>
        <button type="submit" className="button primary auth-dialog-submit" disabled={submitting}>
          {submitting
            ? <><LoaderCircle className="auth-dialog-spinner" size={17} aria-hidden="true" /> {registering ? 'Creating account…' : 'Signing in…'}</>
            : <>{registering ? 'Create account' : 'Sign in'} <ArrowRight size={17} aria-hidden="true" /></>}
        </button>
      </form>

      <p className="auth-dialog-switch">
        {registering ? 'Already have an account?' : 'New to Thinkplore?'}{' '}
        <button type="button" className="plain-link" onClick={switchMode} disabled={submitting}>
          {registering ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </div>
  </dialog>
}
