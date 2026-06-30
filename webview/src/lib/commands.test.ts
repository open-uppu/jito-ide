/**
 * jito-ide v0.2.0 — Slash command filter tests (Phase 4.2)
 * File: webview/src/lib/commands.test.ts
 *
 * Quick sanity check that all 9 commands are present and that
 * filterCommands ranks them correctly.
 */

import { describe, it, expect } from 'vitest';
import { commands, filterCommands, CATEGORY_ORDER } from './commands';

describe('commands.ts', () => {
  it('exports exactly 9 built-in commands', () => {
    expect(commands).toHaveLength(9);
  });

  it('each command has valid metadata', () => {
    for (const cmd of commands) {
      expect(cmd.id).toMatch(/^[a-z]+$/);
      expect(cmd.label.startsWith('/')).toBe(true);
      expect(['Code', 'Review', 'Doc', 'Git', 'Custom']).toContain(cmd.category);
      expect(cmd.description.length).toBeGreaterThan(10);
      expect(cmd.icon.length).toBeGreaterThan(0);
      expect(cmd.example.length).toBeGreaterThan(0);
    }
  });

  it('command ids are unique', () => {
    const ids = commands.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('command labels are unique', () => {
    const labels = commands.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('all 4 built-in categories are reachable (Custom is reserved)', () => {
    const cats = new Set(commands.map((c) => c.category));
    for (const required of ['Code', 'Review', 'Doc', 'Git']) {
      expect(cats.has(required as never)).toBe(true);
    }
  });

  it('CATEGORY_ORDER covers every category exactly once', () => {
    expect(CATEGORY_ORDER).toEqual(['Code', 'Review', 'Doc', 'Git', 'Custom']);
  });
});

describe('filterCommands()', () => {
  it('empty query returns all 9 commands in original order', () => {
    expect(filterCommands('').map((c) => c.id)).toEqual(commands.map((c) => c.id));
    expect(filterCommands('   ').length).toBe(9);
  });

  it('label-prefix match ranks first', () => {
    const r = filterCommands('/rev');
    expect(r[0].id).toBe('review');
  });

  it('substring on label matches', () => {
    const r = filterCommands('test');
    expect(r[0].id).toBe('test');
  });

  it('substring on description matches', () => {
    const r = filterCommands('OWASP');
    expect(r.some((c) => c.id === 'security')).toBe(true);
  });

  it('case insensitive', () => {
    expect(filterCommands('REVIEW')[0].id).toBe('review');
  });

  it('leading "/" in query is stripped', () => {
    expect(filterCommands('/commit')[0].id).toBe('commit');
  });

  it('no match returns empty array', () => {
    expect(filterCommands('xyzqwerty')).toEqual([]);
  });

  it('description match ranks below label match', () => {
    const r = filterCommands('refactor');
    // refactor itself has /refactor label -> tier 0
    expect(r[0].id).toBe('refactor');
  });
});