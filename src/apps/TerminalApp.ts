/**
 * TerminalApp — the Terminal as an application window.
 */

import type { AppContext } from '../core/AppRegistry';
import { Terminal } from '../term/Terminal';
import type { CommandContext } from '../term/commands';

export function createTerminalApp(ctx: AppContext): HTMLElement {
  const body = document.createElement('div');
  body.className = 'app app-terminal';

  const cmdCtx: CommandContext = {
    list: () =>
      ctx.processes.list().map((p) => ({
        pid: p.pid, icon: p.icon, name: p.name, state: p.state, cpu: p.cpu, mem: p.mem,
      })),
    kill: (pid) => ctx.processes.kill(pid),
    apps: ctx.registry.list().map((a) => ({ id: a.id, name: a.name, icon: a.icon, category: a.category })),
    launch: (appId, args) => {
      const pid = ctx.registry.launch(appId, { fs: ctx.fs, windows: ctx.windows, processes: ctx.processes, args, shell: (c) => { void c; } });
      return pid !== null;
    },
    history: [],
    reboot: () => window.location.reload(),
  };

  const term = new Terminal(body, ctx.fs, cmdCtx);
  term.attach();
  body.addEventListener('term-exit', () => body.dispatchEvent(new CustomEvent('app-exit')));
  body.addEventListener('click', () => term.focus());
  setTimeout(() => term.focus(), 60);
  return body;
}
