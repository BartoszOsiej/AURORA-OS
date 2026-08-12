/**
 * Terminal — the interactive shell UI.
 *
 * A DOM terminal with:
 *   - prompt rendering with cwd
 *   - command history (↑/↓)
 *   - Tab path completion
 *   - click-to-focus, clipboard paste support
 *   - ANSI-aware output (via ansiToHtml)
 */

import { FileSystem } from '../fs/FileSystem';
import { buildCommands, runCommand, ansiToHtml, type Shell } from './commands';
import type { CommandContext } from './commands';

export class Terminal {
  private el: HTMLElement;
  private fs: FileSystem;
  private ctx: CommandContext;
  private cwd = '/home/user';
  private history: string[] = [];
  private histIdx = -1;
  private inputLine = '';

  constructor(container: HTMLElement, fs: FileSystem, ctx: CommandContext) {
    this.el = container;
    this.fs = fs;
    this.ctx = ctx;
    container.classList.add('term');
    container.innerHTML = `
      <div class="term-out"></div>
      <div class="term-in">
        <span class="term-prompt"></span>
        <span class="term-caret"></span>
      </div>
    `;
    this.renderPrompt();
    this.print('');
    this.print('AURORA OS Terminal — type <b>help</b> to get started.');
    this.print('');
    void buildCommands;
  }

  private get out(): HTMLElement {
    return this.el.querySelector('.term-out') as HTMLElement;
  }

  private get promptEl(): HTMLElement {
    return this.el.querySelector('.term-prompt') as HTMLElement;
  }

  private shell(): Shell {
    return {
      cwd: this.cwd,
      print: (t = '') => this.print(t),
      printTable: (headers, rows) => this.printTable(headers, rows),
      setCwd: (p) => { this.cwd = p; this.renderPrompt(); },
    };
  }

  print(text = ''): void {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = ansiToHtml(text) || '&nbsp;';
    this.out.appendChild(line);
    this.out.scrollTop = this.out.scrollHeight;
  }

  printTable(headers: string[], rows: string[][]): void {
    const line = document.createElement('div');
    line.className = 'term-line';
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? '').length)));
    const fmt = (cells: string[]) => cells.map((c, i) => (c ?? '').padEnd(widths[i] + 2)).join('');
    line.innerHTML = fmt(headers) + '<br>' + rows.map((r) => fmt(r)).join('<br>');
    this.out.appendChild(line);
    this.out.scrollTop = this.out.scrollHeight;
  }

  private renderPrompt(): void {
    this.promptEl.innerHTML = `<span class="t-user">user@aurora</span>:<span class="t-path">${this.cwd}</span>$`;
  }

  private input(): string {
    return this.inputLine;
  }

  private setInput(v: string): void {
    this.inputLine = v;
    const caret = this.el.querySelector('.term-caret') as HTMLElement;
    caret.textContent = v;
  }

  private submit(): void {
    const line = this.input();
    this.setInput('');
    this.renderPrompt();
    // Print the echoed command before the prompt line
    this.print(`<span class="t-cmd">${line.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`);
    if (line.trim()) this.history.push(line);
    this.histIdx = this.history.length;
    if (line.trim() === 'clear') {
      this.out.innerHTML = '';
      return;
    }
    if (line.trim() === 'exit') {
      this.el.dispatchEvent(new CustomEvent('term-exit'));
      return;
    }
    runCommand(line, this.shell(), this.fs, {
      list: this.ctx.list,
      kill: this.ctx.kill,
      apps: this.ctx.apps,
      launch: this.ctx.launch,
      history: this.history,
      reboot: this.ctx.reboot,
    });
    this.out.scrollTop = this.out.scrollHeight;
  }

  private tabComplete(): void {
    const cur = this.input();
    const parts = cur.split(' ');
    const last = parts[parts.length - 1] ?? '';
    if (!last) return;
    const path = last.startsWith('/') ? last : `${this.cwd === '/' ? '' : this.cwd}/${last}`;
    const dir = path.slice(0, path.lastIndexOf('/') + 1) || '/';
    const prefix = path.slice(path.lastIndexOf('/') + 1);
    let matches: string[] = [];
    try {
      matches = this.fs.readDir(dir).map((e) => e.name + (e.kind === 'dir' ? '/' : '')).filter((n) => n.startsWith(prefix));
    } catch {
      return;
    }
    if (matches.length === 1) {
      const full = (dir === '/' ? '' : dir) + matches[0];
      parts[parts.length - 1] = last.startsWith('/') ? full : full.slice(this.cwd.length + 1);
      this.setInput(parts.join(' '));
    } else if (matches.length > 1) {
      this.print('');
      this.print(matches.join('   '));
    }
  }

  /** Attach input handling; call once. */
  attach(): void {
    this.el.tabIndex = 0;
    this.el.addEventListener('keydown', (e: KeyboardEvent) => {
      const k = e.key;
      if (k === 'Enter') {
        e.preventDefault();
        this.submit();
      } else if (k === 'Backspace') {
        e.preventDefault();
        this.setInput(this.input().slice(0, -1));
      } else if (k === 'ArrowUp') {
        e.preventDefault();
        if (this.histIdx > 0) {
          this.histIdx--;
          this.setInput(this.history[this.histIdx] ?? '');
        }
      } else if (k === 'ArrowDown') {
        e.preventDefault();
        if (this.histIdx < this.history.length - 1) {
          this.histIdx++;
          this.setInput(this.history[this.histIdx] ?? '');
        } else {
          this.histIdx = this.history.length;
          this.setInput('');
        }
      } else if (k === 'Tab') {
        e.preventDefault();
        this.tabComplete();
      } else if (k === 'c' && e.ctrlKey) {
        e.preventDefault();
        this.setInput('');
        this.print('^C');
      } else if (k === 'l' && e.ctrlKey) {
        e.preventDefault();
        this.out.innerHTML = '';
      } else if (k.length === 1) {
        e.preventDefault();
        this.setInput(this.input() + k);
      }
    });
    this.el.addEventListener('paste', (e: ClipboardEvent) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text') ?? '';
      this.setInput(this.input() + text.replace(/\n/g, ' '));
    });
  }

  focus(): void {
    this.el.focus();
  }
}
