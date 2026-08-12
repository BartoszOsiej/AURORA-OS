# ◈ AURORA OS

**A complete operating system running in your browser.**

AURORA OS is a from-scratch desktop environment — window manager, virtual
file system, shell, and eight applications — written entirely in TypeScript
with **zero runtime dependencies**. No frameworks, no bundler at runtime,
no server: the kernel boots, renders, and persists entirely in the browser.

> *"Your browser is now your computer."*

---

## ✨ Features

| Layer | What you get |
|---|---|
| 🧠 **Kernel** | Animated boot sequence, typed EventBus, process table (PID lifecycle, `ps`/`kill`), settings subsystem, localStorage persistence |
| 🪟 **Window manager** | Drag, resize (8 handles), minimize / maximize / focus, cascading placement, glassmorphism chrome, open/close animations |
| 📂 **Virtual filesystem** | POSIX-inspired in-memory tree with `ls` / `cd` / `cat` / `mkdir -p` / `cp` / `mv` / `rm -r` / `grep` / `tree`, proper error codes (`ENOENT`, `EISDIR`, `EEXIST`, `EPERM`), persistence to localStorage |
| ⌨️ **Terminal** | Interactive shell with 35+ commands, command history (↑/↓), Tab path completion, output redirection (`>` and `>>`), ANSI color rendering, `neofetch`, `fortune`, `sudo` (you are root) |
| 📱 **Apps** | Files, Terminal, Editor (Ctrl+S), Calculator, Paint (save PNG), System Monitor (live graphs), Settings, About |
| 🎨 **Theming** | 5 themes (Aurora, Midnight, Ember, Forest, Daylight) + 5 animated wallpapers |
| 🔊 **Audio** | Fully procedural WebAudio sound design — boot chime, UI clicks, window swooshes, error buzzes. No audio files. |

## 🚀 Quick start

```bash
npm install          # installs esbuild (dev-only build tool)
npm run build        # bundles to dist/ (main.js + style.css)
npm run serve        # http://localhost:8080
```

Open http://localhost:8080 and boot the system.

| Command | What it does |
|---|---|
| `npm run build` | esbuild bundle → `dist/main.js`, copy CSS |
| `npm run typecheck` | strict `tsc` type checking |
| `npm test` | runs the core-logic test harness (EventBus, FS, shell) |
| `npm run serve` | static server for `index.html` |

## 🖱️ First steps inside the OS

1. Double-click **Terminal** on the desktop (or use the Start menu ◈).
2. Type `help` to list all 35+ commands.
3. `neofetch` for the system banner, `fortune` for wisdom.
4. Create files: `echo hello > hello.txt`, then `cat hello.txt`.
5. `open editor hello.txt` to edit graphically.
6. Right-click the desktop: new folder, new file, wallpaper, lock screen.
7. `ps` + `kill <pid>` to manage processes.
8. Press **Ctrl+Alt+L** to lock the system.

## 🗂️ Project structure

```
aurora-os/
├── index.html              # Boot screen + desktop shell DOM
├── src/
│   ├── main.ts             # Kernel entry: boot, desktop, taskbar, start menu, lock screen
│   ├── style.css           # Complete OS stylesheet (glass UI, wallpapers, animations)
│   ├── core/
│   │   ├── EventBus.ts     # Typed pub/sub backbone
│   │   ├── ProcessManager.ts # PID allocation, process table, telemetry
│   │   ├── WindowManager.ts  # Window lifecycle, drag/resize/focus/z-order
│   │   └── AppRegistry.ts  # Declarative app catalogue + launcher
│   ├── fs/
│   │   └── FileSystem.ts   # Virtual file system (paths, CRUD, persistence)
│   ├── term/
│   │   ├── commands.ts     # The 35+ command interpreter (pure, testable)
│   │   └── Terminal.ts     # Interactive shell UI (history, completion)
│   ├── apps/               # Terminal, Files, Editor, Calculator, Paint,
│   │                       # Monitor, Settings, About
│   └── sound/
│       └── SoundSystem.ts  # Procedural WebAudio sound effects
├── tests/
│   └── run-tests.mjs       # Core-logic test harness (no DOM)
└── scripts/
    └── copy-assets.mjs     # Copies CSS next to the bundle
```

## 🧠 Architecture

```
┌─────────────────────────── Browser ───────────────────────────┐
│  boot() ──► boot screen ──► desktop shell                      │
│                                                               │
│  ┌────────────┐   ┌─────────────┐   ┌───────────────────┐     │
│  │ WindowMgr  │   │ ProcessMgr  │   │    AppRegistry    │     │
│  │ drag/resize│   │ pid/ps/kill │   │ 8 apps registered │     │
│  └─────┬──────┘   └──────┬──────┘   └────────┬──────────┘     │
│        └─────────────────┼───────────────────┘                 │
│                     ┌────▼─────┐                         ┌─────▼─────┐
│                     │ EventBus │◄── every module talks   │ FileSystem│
│                     └────┬─────┘    only through events  │ +persist  │
│                          │                               └───────────┘
│                    ┌─────▼──────┐
│                    │   shell    │  Terminal ⇄ commands.ts ⇄ FileSystem
│                    └────────────┘
└───────────────────────────────────────────────────────────────────┘
```

**Design rules**

- **No direct imports between subsystems** — everything communicates over the
  typed `EventBus`, so each module is independently testable.
- **Pure core, thin UI** — the shell interpreter, filesystem and event bus run
  without a DOM; the browser only renders.
- **Zero runtime dependencies** — no React, no Redux, no bundler in the output.
  `esbuild` is a dev-only build tool.

## 🧪 Testing

The core logic is DOM-free and unit-tested:

```bash
npm test
```

Covers the EventBus (emit/once/unsubscribe/error isolation), the FileSystem
(path resolution, CRUD, error codes, recursive ops) and the shell interpreter
(echo, cd/pwd, ls, redirection, cat, mkdir, touch, wc, unknown commands).

## 📜 License

MIT — do whatever you want with it.
