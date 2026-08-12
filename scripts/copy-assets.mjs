#!/usr/bin/env node
// Copies static assets (CSS) next to the esbuild bundle in dist/.
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });
copyFileSync('src/style.css', 'dist/style.css');
console.log('assets → dist/style.css');
