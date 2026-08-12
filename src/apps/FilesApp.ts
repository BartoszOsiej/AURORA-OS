/**
 * FilesApp — a graphical file manager with breadcrumbs and actions.
 */

import { bus, EV } from '../core/EventBus';
import type { AppContext } from '../core/AppRegistry';

export function createFilesApp(ctx: AppContext): HTMLElement {
  const body = document.createElement('div');
  body.className = 'app app-files';
  let cwd = '/home/user';

  const toolbar = document.createElement('div');
  toolbar.className = 'files-toolbar';

  const backBtn = document.createElement('button');
  backBtn.className = 'fbtn';
  backBtn.textContent = '←';
  backBtn.title = 'Up';

  const pathInput = document.createElement('input');
  pathInput.className = 'files-path';
  pathInput.value = cwd;

  const newFileBtn = document.createElement('button');
  newFileBtn.className = 'fbtn';
  newFileBtn.textContent = '+ File';

  const newDirBtn = document.createElement('button');
  newDirBtn.className = 'fbtn';
  newDirBtn.textContent = '+ Dir';

  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'fbtn';
  refreshBtn.textContent = '⟳';

  toolbar.append(backBtn, pathInput, newFileBtn, newDirBtn, refreshBtn);

  const grid = document.createElement('div');
  grid.className = 'files-grid';

  body.append(toolbar, grid);

  const render = () => {
    grid.innerHTML = '';
    let entries;
    try {
      entries = ctx.fs.readDir(cwd);
    } catch {
      cwd = '/home/user';
      entries = ctx.fs.readDir(cwd);
    }
    if (cwd !== '/') {
      const up = document.createElement('div');
      up.className = 'file-item';
      up.innerHTML = `<div class="file-ico">📂</div><div class="file-name">..</div>`;
      up.addEventListener('dblclick', () => {
        cwd = ctx.fs.resolve('..', cwd);
        pathInput.value = cwd;
        render();
      });
      grid.appendChild(up);
    }
    for (const e of entries) {
      const item = document.createElement('div');
      item.className = 'file-item';
      const icon = e.kind === 'dir' ? '📁' : '📄';
      const size = e.kind === 'dir' ? '' : ` · ${e.size} B`;
      item.innerHTML = `<div class="file-ico">${icon}</div><div class="file-name">${e.name}</div><div class="file-size">${size}</div>`;
      item.addEventListener('dblclick', () => {
        if (e.kind === 'dir') {
          cwd = `${cwd === '/' ? '' : cwd}/${e.name}`;
          pathInput.value = cwd;
          render();
        } else {
          // Open in Editor
          ctx.registry.launch('editor', {
            fs: ctx.fs, windows: ctx.windows, processes: ctx.processes,
            args: [`${cwd === '/' ? '' : cwd}/${e.name}`],
          });
        }
      });
      grid.appendChild(item);
    }
  };

  backBtn.addEventListener('click', () => {
    cwd = ctx.fs.resolve('..', cwd);
    pathInput.value = cwd;
    render();
  });

  pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const p = ctx.fs.resolve(pathInput.value, '/');
      if (ctx.fs.isDir(p)) {
        cwd = p;
        render();
      } else {
        pathInput.value = cwd;
      }
    }
  });

  newFileBtn.addEventListener('click', () => {
    const name = prompt('New file name:');
    if (name) {
      ctx.fs.writeFile(`${cwd === '/' ? '' : cwd}/${name}`, '');
      render();
    }
  });

  newDirBtn.addEventListener('click', () => {
    const name = prompt('New folder name:');
    if (name) {
      ctx.fs.mkdir(`${cwd === '/' ? '' : cwd}/${name}`);
      render();
    }
  });

  refreshBtn.addEventListener('click', render);

  const unsub = bus.on(EV.FS_CHANGED, render);
  body.addEventListener('app-exit', unsub);

  render();
  return body;
}
