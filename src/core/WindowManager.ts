/**
 * WindowManager — window lifecycle, dragging, resizing, focus, z-order.
 *
 * Windows are DOM elements managed by this module. The manager owns the
 * stacking order, drag/resize behavior, maximize/minimize state, and
 * taskbar integration. Applications never touch the DOM window chrome
 * directly — they call `windows.open()` and render inside the body.
 */

import { bus, EV } from './EventBus';

export interface WindowOptions {
  title: string;
  icon?: string;
  appId: string;
  pid: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  body: HTMLElement;
}

export interface WinState {
  id: string;
  appId: string;
  pid: number;
  title: string;
  icon: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
}

export class WindowManager {
  private layer: HTMLElement;
  private wins = new Map<string, { el: HTMLElement; state: WinState; content: HTMLElement }>();
  private zCounter = 10;
  private cascade = 0;

  constructor(layer: HTMLElement) {
    this.layer = layer;
  }

  get windows(): WinState[] {
    return [...this.wins.values()].map((w) => w.state);
  }

  get count(): number {
    return this.wins.size;
  }

  find(appId: string): WinState | undefined {
    return [...this.wins.values()].find((w) => w.state.appId === appId)?.state;
  }

  open(opts: WindowOptions): WinState {
    const id = `win-${opts.pid}-${Math.random().toString(36).slice(2, 7)}`;
    const z = ++this.zCounter;
    const state: WinState = {
      id,
      appId: opts.appId,
      pid: opts.pid,
      title: opts.title,
      icon: opts.icon ?? '◈',
      minimized: false,
      maximized: false,
      z,
    };

    const width = Math.min(opts.width ?? 720, window.innerWidth - 40);
    const height = Math.min(opts.height ?? 480, window.innerHeight - 80);
    const x = opts.x ?? 80 + (this.cascade % 8) * 28;
    const y = opts.y ?? 60 + (this.cascade % 8) * 24;
    this.cascade++;

    const el = document.createElement('div');
    el.className = 'win';
    el.style.zIndex = String(z);
    el.style.width = `${width}px`;
    el.style.height = `${height}px`;
    el.style.left = `${Math.max(8, Math.min(x, window.innerWidth - width - 8))}px`;
    el.style.top = `${Math.max(8, Math.min(y, window.innerHeight - height - 48))}px`;
    el.innerHTML = `
      <div class="win-titlebar">
        <span class="win-icon"></span>
        <span class="win-title"></span>
        <div class="win-controls">
          <button class="wc wc-min" title="Minimize">─</button>
          <button class="wc wc-max" title="Maximize">□</button>
          <button class="wc wc-close" title="Close">✕</button>
        </div>
      </div>
      <div class="win-body"></div>
      <div class="win-resize r-nw"></div><div class="win-resize r-n"></div><div class="win-resize r-ne"></div>
      <div class="win-resize r-e"></div><div class="win-resize r-w"></div>
      <div class="win-resize r-sw"></div><div class="win-resize r-s"></div><div class="win-resize r-se"></div>
    `;
    el.querySelector('.win-icon')!.textContent = state.icon;
    el.querySelector('.win-title')!.textContent = opts.title;
    const body = el.querySelector('.win-body') as HTMLElement;
    body.appendChild(opts.body);

    this.layer.appendChild(el);
    this.wins.set(id, { el, state, content: opts.body });

    this.wire(el, state, opts.resizable !== false);
    this.focus(id);
    bus.emit(EV.WINDOW_OPEN, state);
    return state;
  }

  close(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    win.el.classList.add('win-closing');
    setTimeout(() => {
      win.el.remove();
      this.wins.delete(id);
      bus.emit(EV.WINDOW_CLOSE, win.state);
      this.focusTop();
    }, 140);
  }

  closeAllForApp(appId: string): void {
    for (const [id, win] of this.wins) {
      if (win.state.appId === appId) this.close(id);
    }
  }

  focus(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    win.state.z = ++this.zCounter;
    win.el.style.zIndex = String(win.state.z);
    for (const w of this.wins.values()) w.el.classList.remove('focused');
    win.el.classList.add('focused');
    bus.emit(EV.WINDOW_FOCUS, win.state);
  }

  focusTop(): void {
    let top: string | null = null;
    let topZ = -1;
    for (const [id, win] of this.wins) {
      if (!win.state.minimized && win.state.z > topZ) {
        topZ = win.state.z;
        top = id;
      }
    }
    if (top) this.focus(top);
  }

  minimize(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    win.state.minimized = true;
    win.el.classList.add('minimized');
    this.focusTop();
  }

  restore(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    win.state.minimized = false;
    win.el.classList.remove('minimized');
    this.focus(id);
  }

  toggle(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    if (win.state.minimized) this.restore(id);
    else this.minimize(id);
  }

  maximize(id: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    const was = win.state.maximized;
    win.state.maximized = !was;
    win.el.classList.toggle('maximized', !was);
    this.focus(id);
  }

  setTitle(id: string, title: string): void {
    const win = this.wins.get(id);
    if (!win) return;
    win.state.title = title;
    win.el.querySelector('.win-title')!.textContent = title;
  }

  /* ------------------------------------------------------------------ */

  private wire(el: HTMLElement, state: WinState, resizable: boolean): void {
    const tb = el.querySelector('.win-titlebar') as HTMLElement;

    el.addEventListener('mousedown', () => this.focus(state.id));

    // Drag
    let drag = false;
    let dx = 0, dy = 0;
    tb.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('.wc')) return;
      if (state.maximized) return;
      drag = true;
      dx = e.clientX - el.offsetLeft;
      dy = e.clientY - el.offsetTop;
      el.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      el.style.left = `${e.clientX - dx}px`;
      el.style.top = `${e.clientY - dy}px`;
    });
    window.addEventListener('mouseup', () => {
      drag = false;
      el.classList.remove('dragging');
    });

    // Controls
    el.querySelector('.wc-min')!.addEventListener('click', () => this.minimize(state.id));
    el.querySelector('.wc-max')!.addEventListener('click', () => this.maximize(state.id));
    el.querySelector('.wc-close')!.addEventListener('click', () => this.close(state.id));

    if (!resizable) return;
    // Resize handles
    const handle = (dir: string) => {
      const h = el.querySelector(`.r-${dir}`) as HTMLElement;
      if (!h) return;
      h.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const sw = el.offsetWidth;
        const sh = el.offsetHeight;
        const sl = el.offsetLeft;
        const st = el.offsetTop;
        const move = (ev: MouseEvent) => {
          const mw = ev.clientX - startX;
          const mh = ev.clientY - startY;
          if (dir.includes('e')) el.style.width = `${Math.max(320, sw + mw)}px`;
          if (dir.includes('s')) el.style.height = `${Math.max(220, sh + mh)}px`;
          if (dir.includes('w')) {
            const w = Math.max(320, sw - mw);
            el.style.width = `${w}px`;
            el.style.left = `${sl + (sw - w)}px`;
          }
          if (dir.includes('n')) {
            const h = Math.max(220, sh - mh);
            el.style.height = `${h}px`;
            el.style.top = `${st + (sh - h)}px`;
          }
        };
        const up = () => {
          window.removeEventListener('mousemove', move);
          window.removeEventListener('mouseup', up);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
      });
    };
    for (const dir of ['nw', 'n', 'ne', 'e', 'w', 'sw', 's', 'se']) handle(dir);
  }
}
