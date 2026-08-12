/**
 * EditorApp — a lightweight file editor with save and open.
 */

import { bus, EV } from '../core/EventBus';
import type { AppContext } from '../core/AppRegistry';

export function createEditorApp(ctx: AppContext): HTMLElement {
  const body = document.createElement('div');
  body.className = 'app app-editor';
  let current = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-toolbar';

  const openBtn = document.createElement('button');
  openBtn.className = 'fbtn';
  openBtn.textContent = 'Open';
  const saveBtn = document.createElement('button');
  saveBtn.className = 'fbtn primary';
  saveBtn.textContent = 'Save';
  const status = document.createElement('span');
  status.className = 'editor-status';
  status.textContent = 'new file';

  toolbar.append(openBtn, saveBtn, status);

  const textarea = document.createElement('textarea');
  textarea.className = 'editor-area';
  textarea.placeholder = 'Start typing…';

  body.append(toolbar, textarea);

  // If launched with a path argument, open it
  if (ctx.args && ctx.args[0]) {
    openPath(ctx.args[0]);
  }

  function openPath(path: string): void {
    const p = ctx.fs.resolve(path, '/home/user');
    if (!ctx.fs.exists(p)) {
      status.textContent = `not found: ${path}`;
      return;
    }
    current = p;
    textarea.value = ctx.fs.readFile(p);
    status.textContent = p;
  }

  openBtn.addEventListener('click', () => {
    const path = prompt('Open path:');
    if (path) openPath(path);
  });

  saveBtn.addEventListener('click', () => {
    if (!current) {
      const path = prompt('Save as path:');
      if (!path) return;
      current = ctx.fs.resolve(path, '/home/user');
    }
    ctx.fs.writeFile(current, textarea.value);
    status.textContent = `saved ${current}`;
    bus.emit(EV.FS_CHANGED, {});
  });

  // Ctrl+S to save
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      saveBtn.click();
    }
  });

  return body;
}
