/**
 * AboutApp — the system information window of AURORA OS.
 *
 * Shows the logo, version, live session uptime, subsystem statistics
 * (processes / windows / files) and a feature grid.
 */

import type { AppContext } from '../core/AppRegistry';

const SESSION_START = Date.now();

export function createAboutApp(ctx: AppContext): HTMLElement {
  const body = document.createElement('div');
  body.className = 'app app-about';

  const statEl = document.createElement('div');
  statEl.className = 'about-stats';

  const upEl = document.createElement('div');
  upEl.className = 'about-uptime';

  const fmtUptime = (): string => {
    const s = Math.max(0, Math.floor((Date.now() - SESSION_START) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  };

  const refreshStats = (): void => {
    const files = ctx.fs.tree('/').length;
    statEl.textContent = `${ctx.processes.count()} processes · ${ctx.windows.count} windows · ${files} files`;
  };

  body.innerHTML = `
    <div class="about-hero">
      <div class="about-logo">
        <svg viewBox="0 0 120 120" width="84" height="84" aria-hidden="true">
          <defs>
            <linearGradient id="aboutg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="var(--acc)" />
              <stop offset="1" stop-color="var(--acc2)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="52" fill="none" stroke="url(#aboutg)" stroke-width="5" />
          <path d="M38 74 L60 34 L82 74 Z" fill="url(#aboutg)" />
        </svg>
      </div>
      <h2>AURORA OS</h2>
      <div class="about-ver">Version 1.0.0 “Nebula”</div>
      <p class="about-tag">A complete operating system in your browser —<br>window manager, virtual filesystem, shell and apps.</p>
    </div>
  `;

  const feats = document.createElement('div');
  feats.className = 'about-feats';
  const FEATS: Array<[string, string]> = [
    ['🧠', 'TypeScript kernel'],
    ['🪟', 'Window manager'],
    ['📂', 'Virtual filesystem'],
    ['⌨️', '35+ shell commands'],
    ['🎨', '5 themes + wallpapers'],
    ['🔊', 'Procedural audio'],
  ];
  for (const [ico, label] of FEATS) {
    const f = document.createElement('div');
    f.className = 'about-feat';
    f.innerHTML = `<span>${ico}</span>${label}`;
    feats.appendChild(f);
  }

  body.append(statEl, upEl, feats);

  refreshStats();
  upEl.textContent = `Session uptime: ${fmtUptime()}`;
  const iv = setInterval(() => {
    upEl.textContent = `Session uptime: ${fmtUptime()}`;
  }, 1000);
  body.addEventListener('app-exit', () => clearInterval(iv));

  return body;
}
