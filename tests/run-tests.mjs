#!/usr/bin/env node
/**
 * AURORA OS — core logic test harness (no DOM required).
 *
 * Bundles the pure modules with esbuild (npm run build:test) and runs
 * assertions against the EventBus, FileSystem and shell interpreter.
 */

import { EventBus } from '../dist-test/EventBus.js';
import { FileSystem } from '../dist-test/FileSystem.js';
import { tokenize, runCommand } from '../dist-test/commands.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(cond, name, detail = '') {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? ' — ' + detail : ''}`);
  }
}

function test(name, fn) {
  try {
    fn();
  } catch (e) {
    failed++;
    failures.push(`${name} — threw: ${e.message}`);
  }
}

/* ---------------------------------------------------------------- EventBus */

test('EventBus: emit + on', () => {
  const bus = new EventBus();
  let got = 0;
  bus.on('x', () => got++);
  bus.emit('x');
  bus.emit('x');
  assert(got === 2, 'two emissions delivered');
});

test('EventBus: once', () => {
  const bus = new EventBus();
  let got = 0;
  bus.once('x', () => got++);
  bus.emit('x');
  bus.emit('x');
  assert(got === 1, 'once fires exactly once');
});

test('EventBus: unsubscribe', () => {
  const bus = new EventBus();
  let got = 0;
  const off = bus.on('x', () => got++);
  off();
  bus.emit('x');
  assert(got === 0, 'handler removed');
});

test('EventBus: listenerCount', () => {
  const bus = new EventBus();
  bus.on('a', () => {});
  bus.on('a', () => {});
  assert(bus.listenerCount('a') === 2, 'counts subscriptions');
});

test('EventBus: handler errors do not break the bus', () => {
  const bus = new EventBus();
  let got = 0;
  bus.on('x', () => {
    throw new Error('boom');
  });
  bus.on('x', () => got++);
  bus.emit('x');
  assert(got === 1, 'second handler still runs');
});

/* -------------------------------------------------------------- FileSystem */

function freshFS() {
  return new FileSystem(false);
}

test('FS: seed layout', () => {
  const fs = freshFS();
  assert(fs.isDir('/home/user'), 'home is a directory');
  assert(fs.exists('/home/user/Desktop/welcome.txt'), 'welcome.txt seeded');
  assert(
    fs.readDir('/home/user').some((e) => e.name === 'Documents'),
    'Documents listed',
  );
});

test('FS: write / read / append', () => {
  const fs = freshFS();
  fs.writeFile('/tmp/a.txt', 'hello');
  assert(fs.readFile('/tmp/a.txt') === 'hello', 'write + read roundtrip');
  fs.appendFile('/tmp/a.txt', ' world');
  assert(fs.readFile('/tmp/a.txt') === 'hello world', 'append works');
});

test('FS: mkdir + error codes', () => {
  const fs = freshFS();
  fs.mkdir('/tmp/sub');
  assert(fs.isDir('/tmp/sub'), 'mkdir creates dir');
  let threw = '';
  try {
    fs.mkdir('/tmp/sub');
  } catch (e) {
    threw = e.code;
  }
  assert(threw === 'EEXIST', 'duplicate dir raises EEXIST');
  threw = '';
  try {
    fs.readFile('/tmp/does-not-exist');
  } catch (e) {
    threw = e.code;
  }
  assert(threw === 'ENOENT', 'missing file raises ENOENT');
  threw = '';
  try {
    fs.readFile('/home/user');
  } catch (e) {
    threw = e.code;
  }
  assert(threw === 'EISDIR', 'reading a dir raises EISDIR');
});

test('FS: path resolution with ..', () => {
  const fs = freshFS();
  assert(fs.resolve('..', '/home/user') === '/home', 'dotdot above cwd');
  assert(
    fs.resolve('Documents/notes.txt', '/home/user') === '/home/user/Documents/notes.txt',
    'relative path joins cwd',
  );
  assert(fs.resolve('/etc/motd', '/home/user') === '/etc/motd', 'absolute path wins');
});

test('FS: copy / move / remove', () => {
  const fs = freshFS();
  fs.writeFile('/tmp/s.txt', 'data');
  fs.copy('/tmp/s.txt', '/tmp/d.txt');
  assert(fs.readFile('/tmp/d.txt') === 'data', 'copy duplicates content');
  fs.move('/tmp/s.txt', '/tmp/m.txt');
  assert(!fs.exists('/tmp/s.txt') && fs.exists('/tmp/m.txt'), 'move relocates');
  fs.remove('/tmp/d.txt');
  assert(!fs.exists('/tmp/d.txt'), 'remove deletes');
});

test('FS: recursive remove', () => {
  const fs = freshFS();
  fs.mkdirp('/tmp/deep/a/b');
  fs.writeFile('/tmp/deep/a/b/f.txt', 'x');
  fs.removeRecursive('/tmp/deep');
  assert(!fs.exists('/tmp/deep'), 'recursive remove clears subtree');
});

test('FS: tree walks the hierarchy', () => {
  const fs = freshFS();
  const items = fs.tree('/home/user', 2);
  assert(items.some((i) => i.path.includes('welcome.txt')), 'tree finds nested files');
});

/* ------------------------------------------------------------------- shell */

function mkShell() {
  const lines = [];
  const shell = {
    cwd: '/home/user',
    print: (t = '') => lines.push(String(t)),
    printTable: () => {},
    setCwd: (p) => {
      shell.cwd = p;
    },
  };
  const ctx = {
    list: () => [],
    kill: () => false,
    apps: [],
    launch: () => true,
    history: [],
    reboot: () => {},
  };
  return { shell, lines, ctx };
}

test('shell: echo', () => {
  const { shell, lines, ctx } = mkShell();
  runCommand('echo hello world', shell, freshFS(), ctx);
  assert(lines.some((l) => l === 'hello world'), 'echo prints args');
});

test('shell: tokenize honors quotes', () => {
  const t = tokenize('echo "hello world" ok');
  assert(JSON.stringify(t) === JSON.stringify(['echo', 'hello world', 'ok']), 'quoted token kept whole');
});

test('shell: cd + pwd', () => {
  const { shell, lines, ctx } = mkShell();
  runCommand('cd Documents', shell, freshFS(), ctx);
  assert(shell.cwd === '/home/user/Documents', 'cd changes cwd');
  runCommand('pwd', shell, freshFS(), ctx);
  assert(lines.some((l) => l === '/home/user/Documents'), 'pwd prints cwd');
});

test('shell: ls lists the working directory', () => {
  const { shell, lines, ctx } = mkShell();
  runCommand('ls', shell, freshFS(), ctx);
  assert(lines.some((l) => l.includes('Desktop')), 'ls shows Desktop');
});

test('shell: redirection > and >>', () => {
  const { shell, lines, ctx } = mkShell();
  const fs = freshFS();
  runCommand('echo hello > /tmp/out.txt', shell, fs, ctx);
  assert(fs.readFile('/tmp/out.txt').includes('hello'), '> writes a file');
  runCommand('echo again >> /tmp/out.txt', shell, fs, ctx);
  assert(fs.readFile('/tmp/out.txt').includes('again'), '>> appends');
});

test('shell: unknown command reports an error', () => {
  const { shell, lines, ctx } = mkShell();
  runCommand('totally-not-a-command', shell, freshFS(), ctx);
  assert(lines.some((l) => l.includes('command not found')), 'error message printed');
});

test('shell: cat reads files', () => {
  const { shell, lines, ctx } = mkShell();
  const fs = freshFS();
  fs.writeFile('/home/user/x.txt', 'file content');
  runCommand('cat x.txt', shell, fs, ctx);
  assert(lines.some((l) => l === 'file content'), 'cat output');
});

test('shell: mkdir via command', () => {
  const { shell, lines, ctx } = mkShell();
  const fs = freshFS();
  runCommand('mkdir fresh-dir', shell, fs, ctx);
  assert(fs.isDir('/home/user/fresh-dir'), 'mkdir creates directory');
});

test('shell: touch + wc', () => {
  const { shell, lines, ctx } = mkShell();
  const fs = freshFS();
  runCommand('touch t.txt', shell, fs, ctx);
  assert(fs.exists('/home/user/t.txt'), 'touch creates file');
  fs.writeFile('/home/user/t.txt', 'one two three');
  runCommand('wc t.txt', shell, fs, ctx);
  assert(lines.some((l) => l.includes('words')), 'wc reports word count');
});

/* --------------------------------------------------------------- summary */

console.log(`\nAURORA OS core tests: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}
console.log('All green ✓');
