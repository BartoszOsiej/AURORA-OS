/**
 * CalculatorApp — a scientific-ish calculator with expression evaluation.
 */

import type { AppContext } from '../core/AppRegistry';

export function createCalculatorApp(_ctx: AppContext): HTMLElement {
  const body = document.createElement('div');
  body.className = 'app app-calc';

  const display = document.createElement('div');
  display.className = 'calc-display';
  display.textContent = '0';

  const grid = document.createElement('div');
  grid.className = 'calc-grid';

  const keys = [
    ['C', 'clear'], ['(', 'fn'], [')', 'fn'], ['÷', 'op'],
    ['7', 'num'], ['8', 'num'], ['9', 'num'], ['×', 'op'],
    ['4', 'num'], ['5', 'num'], ['6', 'num'], ['−', 'op'],
    ['1', 'num'], ['2', 'num'], ['3', 'num'], ['+', 'op'],
    ['0', 'num'], ['.', 'num'], ['⌫', 'back'], ['=', 'eq'],
  ];

  let expr = '';
  const MAX = 30;

  const update = () => {
    display.textContent = expr || '0';
    if (expr.length > MAX) display.classList.add('overflow');
    else display.classList.remove('overflow');
  };

  const append = (ch: string) => {
    if (expr.length >= MAX) return;
    expr += ch;
    update();
  };

  const evaluate = (): void => {
    try {
      // Convert display symbols to JS operators
      const js = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/−/g, '-');
      // Only allow digits, operators, parens, dots
      if (!/^[0-9+\-*/().\s]+$/.test(js)) throw new Error('bad');
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${js})`)() as number;
      if (typeof result !== 'number' || !isFinite(result)) throw new Error('inf');
      expr = String(Math.round(result * 1e10) / 1e10);
      update();
    } catch {
      expr = '';
      display.textContent = 'Error';
      setTimeout(update, 700);
    }
  };

  for (const [label, kind] of keys) {
    const btn = document.createElement('button');
    btn.className = `calc-key ${kind}`;
    btn.textContent = label;
    btn.addEventListener('click', () => {
      switch (kind) {
        case 'num': append(label); break;
        case 'fn': append(label); break;
        case 'op': append(label); break;
        case 'clear': expr = ''; update(); break;
        case 'back': expr = expr.slice(0, -1); update(); break;
        case 'eq': evaluate(); break;
      }
    });
    grid.appendChild(btn);
  }

  body.append(display, grid);
  return body;
}
