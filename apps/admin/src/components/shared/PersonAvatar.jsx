import React from 'react';
import { cn } from '../../lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '../ui';

/**
 * initialsFor
 * Two letters from a person's name: first letter of the first and last word.
 * Falls back to the local part of an email, then to a dash, so a row never
 * renders an empty disc the way the hand-rolled fallbacks used to.
 */
export function initialsFor(name, email) {
  const clean = (name || '').trim();
  if (clean) {
    const words = clean.split(/\s+/).filter(Boolean);
    const letters =
      words.length === 1
        ? words[0].slice(0, 2)
        : `${words[0][0]}${words[words.length - 1][0]}`;
    return letters.toUpperCase();
  }
  const local = (email || '').split('@')[0];
  if (local) return local.slice(0, 2).toUpperCase();
  return '--';
}

// A fixed palette, picked by a hash of the name, so the same person keeps the
// same colour across every screen and two neighbouring rows rarely match.
const TONES = [
  'bg-primary-fixed text-on-primary-fixed',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-status-info-bg text-info',
  'bg-status-success-bg text-success',
  'bg-status-warning-bg text-warning',
  'bg-surface-container-high text-primary',
];

export function toneFor(seed) {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

/**
 * PersonAvatar
 * One avatar for every person shown in the admin: the photo when there is one,
 * otherwise their initials on a colour derived from their name. `tone` and
 * `initials` can be passed when a module already decided them.
 */
export function PersonAvatar({
  name,
  email,
  src,
  initials,
  tone,
  className,
  fallbackClassName,
  title,
  ...props
}) {
  const text = initials || initialsFor(name, email);
  const colour = tone || toneFor(name || email || text);
  return (
    <Avatar className={cn('ring-0', className)} title={title ?? name ?? undefined} {...props}>
      <AvatarImage src={src || undefined} alt={name ? `${name}` : ''} />
      <AvatarFallback className={cn('font-semibold', colour, fallbackClassName)}>
        {text}
      </AvatarFallback>
    </Avatar>
  );
}
