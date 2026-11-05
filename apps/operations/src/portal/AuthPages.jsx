import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button, Icon, Input } from '../components/ui';
import { BrandMark } from '../components/layout/BrandMark';
import { portalJson } from './client';

/** The narrow centred frame the password screens share with the sign-in form. */
export function AuthShell({ title, intro, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-canvas px-6 py-space-xl text-primary antialiased">
      <div className="flex w-full max-w-sm flex-col gap-space-xl">
        <div className="flex items-center gap-2.5">
          <BrandMark src="/brand/aveliq-monogram-mark.svg" label="AVELIQ" className="h-9 w-9" />
          <BrandMark src="/brand/aveliq-wordmark-mark.svg" label="" aria-hidden="true" align="left" className="h-5 w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-display text-primary">{title}</h1>
          {intro && <p className="text-body-lg text-muted">{intro}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}

export function Notice({ tone = 'info', title, children }) {
  const styles = {
    info: ['border-status-info/25 bg-status-info-bg', 'info', 'text-info'],
    ok: ['border-status-success/25 bg-status-success-bg', 'check_circle', 'text-success'],
    bad: ['border-status-danger/25 bg-status-danger-bg', 'error', 'text-danger'],
  }[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border p-3.5 ${styles[0]}`}>
      <Icon name={styles[1]} aria-hidden="true" className={`material-symbols-outlined mt-0.5 text-icon-md ${styles[2]}`} />
      <div className="flex flex-col gap-0.5">
        <span className="text-label-lg text-primary">{title}</span>
        {children && <span className="text-meta leading-relaxed text-muted">{children}</span>}
      </div>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, sent: false, error: null });

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return setState({ busy: false, sent: false, error: 'Enter your work email.' });
    setState({ busy: true, sent: false, error: null });
    try {
      await portalJson('/ops/auth/password/forgot', { body: { email: email.trim() } });
      setState({ busy: false, sent: true, error: null });
    } catch (err) {
      setState({ busy: false, sent: false, error: err.status === 429 ? 'Too many requests for this email. Try again in an hour.' : err.message });
    }
  };

  return (
    <AuthShell title="Reset your password" intro="Enter the email you sign in with. If it has an account, we'll email a link that works for 30 minutes.">
      {state.sent ? (
        <Notice tone="ok" title="Check your email">
          If {email.trim()} has an Everwear operations account, a reset link is on its way. It works once, for 30 minutes.
        </Notice>
      ) : (
        <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
          {state.error && <Notice tone="bad" title={state.error} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forgot-email" className="text-label-lg text-primary">
              Email
            </label>
            <Input id="forgot-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 px-3.5 text-body-lg" />
          </div>
          <Button type="submit" variant="primary" size="lg" className="h-11 w-full text-body-lg" disabled={state.busy}>
            {state.busy ? 'Sending' : 'Email me a reset link'}
          </Button>
        </form>
      )}
      <Link to="/login" className="text-meta font-medium text-accent hover:underline">
        Back to sign in
      </Link>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState({ busy: false, done: false, error: null });

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 12) return setState({ ...state, error: 'Use at least 12 characters.' });
    if (password !== confirm) return setState({ ...state, error: "The two passwords don't match." });
    setState({ busy: true, done: false, error: null });
    try {
      await portalJson('/ops/auth/password/reset', { body: { token, password } });
      setState({ busy: false, done: true, error: null });
    } catch (err) {
      setState({ busy: false, done: false, error: err.message });
    }
  };

  if (!token) {
    return (
      <AuthShell title="Reset your password">
        <Notice tone="bad" title="This link is incomplete">Open the link from the email again, or ask for a new one.</Notice>
        <Link to="/forgot-password" className="text-meta font-medium text-accent hover:underline">
          Ask for a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" intro="It applies to every Everwear operations account on your email. You'll be signed out everywhere else.">
      {state.done ? (
        <>
          <Notice tone="ok" title="Password changed">Sign in with your new password.</Notice>
          <Link to="/login" className="text-meta font-medium text-accent hover:underline">
            Go to sign in
          </Link>
        </>
      ) : (
        <form className="flex flex-col gap-space-md" onSubmit={submit} noValidate>
          {state.error && <Notice tone="bad" title={state.error} />}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-password" className="text-label-lg text-primary">
              New password
            </label>
            <Input id="reset-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 px-3.5 text-body-lg" />
            <span className="text-meta text-muted">At least 12 characters.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reset-confirm" className="text-label-lg text-primary">
              Type it again
            </label>
            <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11 px-3.5 text-body-lg" />
          </div>
          <Button type="submit" variant="primary" size="lg" className="h-11 w-full text-body-lg" disabled={state.busy}>
            {state.busy ? 'Saving' : 'Set new password'}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
