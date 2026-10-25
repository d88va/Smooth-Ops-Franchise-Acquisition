import { describe, expect, it } from 'vitest';
import { sampleDataset } from '../data/sample';
import { buildDataset, counterfactuals, diffResults, patchApp, patchTerritory, runEngine, type Dataset, type Outcome } from '../engine';
import { EXISTING_STORES } from '../data/existingStores';

function check(ds: Dataset, ov = {}) {
  const r = runEngine(ds, ov);
  const approved = ds.applications.filter((a) => r.decisions[a.id].outcome === 'Approved');
  const pins = approved.map((a) => r.decisions[a.id].assignedPin);
  expect(new Set(pins).size).toBe(pins.length);
  for (const p of pins) expect(EXISTING_STORES.some((s) => s.pin === p)).toBe(false);
  for (const t of ds.territories) expect(approved.filter((a) => r.decisions[a.id].territoryId === t.id).length).toBeLessThanOrEqual(t.slots);
  for (const a of ds.applications) {
    const d = r.decisions[a.id];
    expect(d).toBeTruthy();
    expect(['Approved', 'Hold', 'Waitlist', 'Redirect', 'Decline']).toContain(d.outcome);
    expect(d.reasons.length).toBeGreaterThan(0);
    expect(d.nextSteps.length).toBeGreaterThan(0);
  }
  expect(r.invariantViolations).toEqual([]);
  return r;
}

describe('engine invariants on sample data', () => {
  const ds = sampleDataset();
  const r = check(ds);
  const o = (id: string): Outcome => r.decisions[id].outcome;

  it('covers every path', () => {
    const seen = new Set(ds.applications.map((a) => o(a.id)));
    for (const x of ['Approved', 'Hold', 'Waitlist', 'Redirect', 'Decline']) expect(seen.has(x as Outcome)).toBe(true);
    console.table(ds.applications.map((a) => ({ id: a.id, outcome: o(a.id), score: r.decisions[a.id].score, why: r.decisions[a.id].headline })));
  });

  it('demo storyline: APP-007 hold, APP-012 displaces APP-009', () => {
    expect(o('APP-007')).toBe('Hold');
    expect(o('APP-009')).toBe('Approved');
    expect(o('APP-012')).toBe('Hold');
    const ds2 = patchApp(ds, 'APP-012', { space: 'Rented', floor: 'Ground' });
    const r2 = check(ds2);
    expect(r2.decisions['APP-012'].outcome).toBe('Approved');
    expect(r2.decisions['APP-009'].outcome).toBe('Waitlist');
    const diff = diffResults(r, r2, ds2, ['APP-012']);
    expect(diff.changes.map((c) => c.id).sort()).toEqual(['APP-009', 'APP-012']);
    expect(diff.changes.find((c) => c.id === 'APP-009')?.knockOn).toMatch(/outranks/);
  });

  it('is deterministic and a no-op update gives an empty diff', () => {
    const again = runEngine(sampleDataset());
    expect(JSON.stringify(again)).toBe(JSON.stringify(r));
    const same = runEngine(patchApp(ds, 'APP-001', {}));
    expect(diffResults(r, same, ds).changes).toEqual([]);
  });

  it('counterfactuals flip APP-007 and APP-012', () => {
    for (const id of ['APP-007', 'APP-012', 'APP-005', 'APP-004', 'APP-022']) {
      const cf = counterfactuals(ds, {}, id);
      expect(cf.length).toBeGreaterThan(0);
      const first = cf.find((c) => c.patch);
      expect(first, `${id} has a patch`).toBeTruthy();
      expect(runEngine(patchApp(ds, id, first!.patch!)).decisions[id].outcome).toBe('Approved');
    }
  });

  it('APP-007 still gets an actionable flip once APP-012 has taken the Mysuru slot', () => {
    const ds2 = patchApp(ds, 'APP-012', { space: 'Rented', floor: 'Ground' });
    const cf = counterfactuals(ds2, {}, 'APP-007');
    expect(cf[0].text).toMatch(/slot/);
    expect(cf[0].text).toMatch(/space/i);
  });

  it('notes that contradict the form cause a Hold with "confirm X"', () => {
    expect(o('APP-021')).toBe('Hold');
    expect(r.decisions['APP-021'].reasons.join(' ')).toMatch(/Confirm the real years/);
    const fixed = runEngine(patchApp(ds, 'APP-021', { experience: 5 }));
    expect(fixed.decisions['APP-021'].outcome).not.toBe('Hold');
  });

  it('approve bar depends on territory priority and slots are never force-filled', () => {
    const big = patchTerritory(ds, 'TER-08', { slots: 10 });
    const rb = check(big);
    // 10 slots in TER-08 but only the qualified applicant is approved; the Decline stays Declined
    expect(rb.decisions['APP-015'].outcome).toBe('Decline');
    expect(rb.territories.find((t) => t.territory.id === 'TER-08')!.filled).toBe(1);
    expect(r.decisions['APP-014'].breakdown.some((b) => b.key === 'priority')).toBe(true);
  });

  it('flags same name on different pins and applies a data-quality penalty', () => {
    const d2 = JSON.parse(JSON.stringify(ds)) as Dataset;
    d2.applications.find((a) => a.id === 'APP-024')!.pin = '575006';
    const r2 = check(d2);
    expect(r2.decisions['APP-006'].flags.some((f) => f.code === 'duplicate-name')).toBe(true);
    expect(r.decisions['APP-025'].breakdown.some((b) => b.key === 'quality')).toBe(true);
  });

  it('approved plans are dated back from launch, localised, and re-dated when too short', () => {
    const p = r.decisions['APP-006'].plan!;
    expect(p.language).toBe('Kannada');
    expect(p.modules.length).toBeGreaterThanOrEqual(6);
    expect(p.modules[0]).toMatch(/Brand standards/);
    expect(p.milestones.every((m) => m.dueWeek >= 0)).toBe(true);
    const rushed = runEngine(patchApp(ds, 'APP-001', { launchMonths: 1 })).decisions['APP-001'].plan!;
    expect(rushed.redated).toBe(true);
    expect(rushed.openWeek).toBe(rushed.totalWeeks);
    expect(r.decisions['APP-001'].nextSteps.map((s) => s.text).join(' ')).toMatch(/PAN and GST[\s\S]*proof of funds[\s\S]*Site inspection/i);
  });

  it('overrides respect the one-pin rule', () => {
    // forcing APP-002 onto pin 560008 takes the pin first; APP-001 can no longer hold it
    const rr = check(ds, { 'APP-002': { outcome: 'Approved', reason: 'test', at: 0 } });
    expect(rr.decisions['APP-002'].outcome).toBe('Approved');
    expect(rr.decisions['APP-001'].outcome).not.toBe('Approved');
    // forcing both onto the same pin: second override is rejected
    const r2 = check(ds, { 'APP-001': { outcome: 'Approved', reason: 'a', at: 0 }, 'APP-002': { outcome: 'Approved', reason: 'b', at: 1 } });
    expect(r2.decisions['APP-001'].outcome).toBe('Approved');
    expect(r2.decisions['APP-002'].outcome).not.toBe('Approved');
    expect(r2.decisions['APP-002'].overridden?.applied).toBe(false);
    // override a hold to decline is applied
    const r3 = check(ds, { 'APP-007': { outcome: 'Decline', reason: 'bad references', at: 0 } });
    expect(r3.decisions['APP-007'].outcome).toBe('Decline');
    // overriding APP-009 away frees the Mysuru seat for nobody else (APP-012 still on hold) but must stay valid
    check(ds, { 'APP-009': { outcome: 'Hold', reason: 'x', at: 0 } });
  });
});

describe('never throws on malformed input', () => {
  it('survives fuzz', () => {
    const rnd = mulberry(7);
    const base = sampleDataset();
    for (let n = 0; n < 150; n++) {
      const ds: Dataset = JSON.parse(JSON.stringify(base));
      for (const a of ds.applications) {
        if (rnd() < 0.3) a.investment = pick(rnd, [null, 0, -5, 1e9, 20, 45]) as number | null;
        if (rnd() < 0.3) a.pin = pick(rnd, [null, '560008', '560001', '570023', '123456', '560034', '580021']) as string | null;
        if (rnd() < 0.2) a.city = pick(rnd, [null, 'Bengaluru', 'Mysuru', 'Atlantis']) as string | null;
        if (rnd() < 0.2) a.space = pick(rnd, [null, 'Owned', 'Rented', 'Not yet identified']) as never;
        if (rnd() < 0.2) a.size = pick(rnd, [null, 0, 100, 900]) as number | null;
        if (rnd() < 0.2) a.launchMonths = pick(rnd, [null, 0, 1, 12]) as number | null;
        if (rnd() < 0.1) a.name = '';
      }
      for (const t of ds.territories) if (rnd() < 0.3) t.slots = pick(rnd, [0, 1, 5]) as number;
      if (rnd() < 0.2) ds.territories = ds.territories.slice(0, 3);
      check(ds);
    }
  });
  it('parser handles messy rows', () => {
    const res = buildDataset(
      [
        ['Application ID', 'Applicant name', 'City · State · Pin code', 'Investment capacity (₹ lakh)', 'Retail experience (years)', 'Current / past business', 'Space available', 'Space size (sq ft)', 'Floor', 'Target launch (months)', 'Preferred language', 'Notes from applicant'],
        ['APP-001', 'A', 'Bengaluru · Karnataka · 560008', '₹25L', '2.0', 'shoes', 'RENTED ', '300 sq ft', 'ground', '3 months', 'kannada', null],
        ['APP-001', 'B', 'Mysore, Karnataka, 570001', 'abc', null, null, 'Not yet identified', null, null, null, 'Tulu', null],
        [null, null, null, null, null, null, null, null, null, null, null, null],
        [null, 'C', null, null],
      ],
      [
        ['Territory ID', 'City · State', 'Pin codes covered', 'City tier', 'Open slots', 'Priority'],
        ['TER-01', 'Bengaluru · Karnataka', '560008, 560025', 'Tier 1', 2, 'high'],
      ],
    );
    expect(res.dataset).toBeTruthy();
    const ds = res.dataset!;
    expect(ds.applications.length).toBe(3);
    expect(ds.applications[0].investment).toBe(25);
    expect(ds.applications[0].space).toBe('Rented');
    expect(ds.applications[0].floor).toBe('Ground');
    expect(ds.applications[1].id).toBe('APP-001#2');
    expect(ds.applications[1].city).toBe('Mysuru');
    expect(ds.territories[0].priority).toBe('High');
    check(ds);
  });
});

function mulberry(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rnd: () => number, xs: T[]): T {
  return xs[Math.floor(rnd() * xs.length)];
}
