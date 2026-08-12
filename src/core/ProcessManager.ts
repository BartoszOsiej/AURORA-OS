/**
 * ProcessManager — PID allocation, lifecycle and process table.
 *
 * Every application window in AURORA OS is backed by a Process record.
 * The `ps` and `kill` commands, the taskbar, and the window manager all
 * query this table.
 */

import { bus, EV } from './EventBus';

export type ProcessState = 'running' | 'suspended' | 'zombie';

export interface Process {
  pid: number;
  name: string;
  icon: string;
  appId: string;
  state: ProcessState;
  startedAt: number;
  cpu: number;   // fake telemetry
  mem: number;   // fake telemetry (KB)
}

export class ProcessManager {
  private processes = new Map<number, Process>();
  private nextPid = 100;

  /** Spawn a process; returns its PID. */
  spawn(appId: string, name: string, icon = '◈'): number {
    const pid = this.nextPid++;
    const proc: Process = {
      pid,
      name,
      icon,
      appId,
      state: 'running',
      startedAt: Date.now(),
      cpu: Math.random() * 8,
      mem: 12_000 + Math.random() * 40_000,
    };
    this.processes.set(pid, proc);
    bus.emit(EV.PROCESS_SPAWN, proc);
    return pid;
  }

  /** Mark a process as exited and remove it from the table. */
  exit(pid: number): void {
    const proc = this.processes.get(pid);
    if (!proc) return;
    proc.state = 'zombie';
    bus.emit(EV.PROCESS_EXIT, proc);
    this.processes.delete(pid);
  }

  kill(pid: number): boolean {
    const proc = this.processes.get(pid);
    if (!proc) return false;
    // exit() emits EV.PROCESS_EXIT; the kernel closes matching windows there.
    this.exit(pid);
    return true;
  }

  get(pid: number): Process | undefined {
    return this.processes.get(pid);
  }

  list(): Process[] {
    return [...this.processes.values()].sort((a, b) => a.pid - b.pid);
  }

  count(): number {
    return this.processes.size;
  }

  /** Random-walk telemetry so the system monitor looks alive. */
  tick(): void {
    for (const proc of this.processes.values()) {
      proc.cpu = Math.max(0, Math.min(100, proc.cpu + (Math.random() - 0.5) * 6));
      proc.mem = Math.max(8_000, proc.mem + (Math.random() - 0.5) * 2_000);
    }
  }
}

export const processes = new ProcessManager();
