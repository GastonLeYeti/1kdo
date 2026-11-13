import { useEffect } from 'react';
import type { Theme } from '../../shared/themes';

/** Puts a theme's colours on the page as CSS variables. */
export function applyTheme(theme: Theme): void {
  const vars: Record<string, string> = {
    '--ink': theme.ink,
    '--bg': theme.bg,
    '--head': theme.head,
    '--head-text': theme.headText,
    '--accent': theme.accent,
    '--cta': theme.cta,
    '--strong': theme.strong,
    '--b1': theme.blocks[0],
    '--b2': theme.blocks[1],
    '--b3': theme.blocks[2],
  };
  for (const [name, value] of Object.entries(vars)) document.documentElement.style.setProperty(name, value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.head);
}

/** Applies a theme while the calling screen is shown. */
export function useTheme(theme: Theme): void {
  useEffect(() => applyTheme(theme), [theme]);
}
