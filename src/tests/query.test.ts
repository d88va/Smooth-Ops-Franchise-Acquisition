import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { parseWorkbook, runEngine } from '../engine';
import { parseQuery, resolveAppId } from '../query/parse';

const ds = sampleDataset();

describe('query parser', () => {
  it('resolves fuzzy ids', () => {
    for (const t of ['app 7', 'APP-7', 'app007', 'Application 007']) expect(resolveAppId(t, ds)).toBe('APP-007');
  });
  it('explain', () => {
    expect(parseQuery('Why is APP-007 on hold?', ds)).toMatchObject({ kind: 'explain', id: 'APP-007' });
    expect(parseQuery('explain app 10', ds)).toMatchObject({ kind: 'explain', id: 'APP-010' });
    expect(parseQuery('why was APP-003 declined', ds)).toMatchObject({ kind: 'explain' });
  });
  it('update', () => {
    const i = parseQuery('APP-012 found a ground-floor space', ds);
    expect(i).toMatchObject({ kind: 'update', id: 'APP-012', patch: { space: 'Rented', floor: 'Ground', size: 300 } });
    expect(parseQuery('APP-005 now has ₹42 lakh', ds)).toMatchObject({ kind: 'update', patch: { investment: 42 } });
    expect(parseQuery('APP-009 space is 500 sq ft rented', ds)).toMatchObject({ kind: 'update', patch: { size: 500, space: 'Rented' } });
    expect(parseQuery('APP-002 wants to launch in 6 months', ds)).toMatchObject({ kind: 'update', patch: { launchMonths: 6 } });
    expect(parseQuery('APP-004 moved to pin 570008', ds)).toMatchObject({ kind: 'update', patch: { pin: '570008' } });
    expect(parseQuery('APP-007 owns a shop on the ground floor of 400 sq ft', ds)).toMatchObject({ kind: 'update', patch: { space: 'Owned', floor: 'Ground', size: 400 } });
  });
  it('asks for missing size', () => {
    expect(parseQuery('APP-007 found a ground floor space', ds)).toMatchObject({ kind: 'clarify' });
  });
  it('territory, list, compare, reset, counterfactual, fallback', () => {
    expect(parseQuery('TER-02 now has 1 more slot', ds)).toMatchObject({ kind: 'territory', id: 'TER-02', delta: 1 });
    expect(parseQuery('close TER-03', ds)).toMatchObject({ kind: 'territory', id: 'TER-03', close: true });
    expect(parseQuery('who is on the waitlist in Mysuru?', ds)).toMatchObject({ kind: 'list', outcome: 'Waitlist', city: 'Mysuru' });
    expect(parseQuery('show declined applicants', ds)).toMatchObject({ kind: 'list', outcome: 'Decline' });
    expect(parseQuery('compare before and after', ds)).toMatchObject({ kind: 'compare' });
    expect(parseQuery('undo', ds)).toMatchObject({ kind: 'undo' });
    expect(parseQuery('reset', ds)).toMatchObject({ kind: 'reset' });
    expect(parseQuery('what would it take for APP-007 to be approved?', ds)).toMatchObject({ kind: 'counterfactual', id: 'APP-007' });
    expect(parseQuery('blah blah', ds)).toMatchObject({ kind: 'unknown' });
  });
});

describe('xlsx round trip', () => {
  it('parses the generated sample workbook identically to the built-in sample', () => {
    const buf = readFileSync('public/sample-applications.xlsx');
    const res = parseWorkbook(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
    expect(res.error).toBeNull();
    const a = runEngine(res.dataset!);
    const b = runEngine(ds);
    for (const id of b.order) expect(a.decisions[id]?.outcome, id).toBe(b.decisions[id].outcome);
  });
  it('rejects garbage without throwing', () => {
    const res = parseWorkbook(new TextEncoder().encode('not an excel file').buffer as ArrayBuffer);
    expect(res.dataset === null || res.dataset.applications.length === 0).toBe(true);
  });
});
