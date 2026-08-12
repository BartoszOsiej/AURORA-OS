/**
 * AppRegistry — declarative application catalogue.
 *
 * Applications register a factory that produces a window body. The kernel,
 * start menu, taskbar, and `open` command all resolve apps through here.
 */

import type { FileSystem } from '../fs/FileSystem';
import type { WindowManager } from './WindowManager';
import type { ProcessManager } from './ProcessManager';

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  singleInstance?: boolean;
  category: 'System' | 'Tools' | 'Games' | 'Media';
  create: (ctx: AppContext) => HTMLElement;
}

export interface AppContext {
  fs: FileSystem;
  windows: WindowManager;
  processes: ProcessManager;
  registry: AppRegistry;
  app: AppDefinition;
  pid: number;
  /** Terminal for the built-in `open` command when launched from shell. */
  shell?: (cmd: string) => void;
  /** Arguments passed at launch (e.g. `open editor /path/file.txt`). */
  args?: string[];
}

export class AppRegistry {
  private apps = new Map<string, AppDefinition>();

  register(def: AppDefinition): void {
    this.apps.set(def.id, def);
  }

  get(id: string): AppDefinition | undefined {
    return this.apps.get(id);
  }

  list(): AppDefinition[] {
    return [...this.apps.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  launch(id: string, ctx: Pick<AppContext, 'fs' | 'windows' | 'processes'> & { shell?: AppContext['shell']; args?: string[] }): number | null {
    const app = this.apps.get(id);
    if (!app) return null;
    if (app.singleInstance) {
      const existing = ctx.windows.find(id);
      if (existing) {
        ctx.windows.restore(existing.id);
        ctx.windows.focus(existing.id);
        return existing.pid;
      }
    }
    const pid = ctx.processes.spawn(app.id, app.name, app.icon);
    const body = app.create({ fs: ctx.fs, windows: ctx.windows, processes: ctx.processes, registry: this, app, pid, shell: ctx.shell, args: ctx.args });
    const win = ctx.windows.open({
      title: app.name,
      icon: app.icon,
      appId: app.id,
      pid,
      width: app.width,
      height: app.height,
      resizable: app.resizable ?? true,
      body,
    });
    // Auto-close process when the window closes.
    const onClose = () => {
      ctx.windows.close(win.id);
      ctx.processes.exit(pid);
    };
    body.addEventListener('app-exit', onClose);
    return pid;
  }
}
