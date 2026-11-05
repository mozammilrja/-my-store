import React from 'react';
import { cn } from '../../lib/utils';

/**
 * BrandMark
 * The AVELIQ artwork is drawn with `fill="currentColor"`, which an <img> tag
 * cannot resolve: the wordmark rendered black and disappeared in dark mode.
 * Painting it as a mask lets it inherit the theme's text colour instead.
 */
export function BrandMark({ src, label, align = 'center', className, style, ...props }) {
  // The mask URL comes from a prop, so it has to be set at runtime; the
  // alignment rides along with it rather than being retyped at each call site.
  const position = align === 'left' ? 'left center' : 'center';
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: position,
        maskPosition: position,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
      {...props}
    />
  );
}
