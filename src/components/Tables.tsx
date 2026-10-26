import { useMemo } from 'react';
import { OUTCOMES, type Outcome } from '../engine';
import { select, setFilter, useStore } from '../state/store';
import { Badge, field, Mark, Panel, SectionTitle, SHAPE_NAME } from './ui';
import { CITIES } from '../data/cityGeo';

/** Key to the map and a filter in one: each outcome shows its shape, its count, and filters the map on click. */
export function OutcomeKey({ vertical }: { vertical?: boolean }) {
  const r = useStore((s) => s.result);
  const filter = useStore((s) => s.filter);
  return (
    <ul className={`grid gap-px border border-ink bg-ink ${vertical ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-5'}`}>
      {OUTCOMES.map((o) => {
        const on = filter.outcome === o;
        return (
          <li key={o} className="bg-sheet">
            <button
              onClick={() => setFilter(on ? { ...filter, outcome: undefined } : { ...filter, outcome: o })}
              aria-pressed={on}
              title={`${o}: drawn as a ${SHAPE_NAME[o]}. ${on ? 'Click to show everyone again.' : 'Click to show only these applicants.'}`}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left ${on ? 'bg-ink text-paper' : 'hover:bg-paper'}`}
            >
              <Mark o={o} size={22} />
              <span className="font-cond text-2xl font-semibold leading-none">{r.counts[o]}</span>
              <span className="text-sm">{o}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ApplicantTable() {
  const ds = useStore((s) => s.ds);
  const result = useStore((s) => s.result);
  const filter = useStore((s) => s.filter);
  const selected = useStore((s) => s.selected);
  const changed = useStore((s) => s.changed);
  const rows = useMemo(
    () =>
      ds.applications.filter((a) => {
        const d = result.decisions[a.id];
        return (!filter.outcome || d.outcome === filter.outcome) && (!filter.city || a.city === filter.city) && (!filter.territory || d.territoryId === filter.territory || d.redirect?.territoryId === filter.territory);
      }),
    [ds, result, filter],
  );
  const any = filter.outcome || filter.city || filter.territory;
  return (
    <Panel>
      <SectionTitle right={any ? <button onClick={() => setFilter({})} className="text-sm underline underline-offset-2">Show everyone</button> : undefined}>All applicants ({rows.length})</SectionTitle>
      <div className="mb-2 flex flex-wrap gap-2">
        <select aria-label="Filter by outcome" value={filter.outcome ?? ''} onChange={(e) => setFilter({ ...filter, outcome: (e.target.value || undefined) as Outcome | undefined })} className={field}>
          <option value="">Any outcome</option>{OUTCOMES.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select aria-label="Filter by city" value={filter.city ?? ''} onChange={(e) => setFilter({ ...filter, city: e.target.value || undefined })} className={field}>
          <option value="">Any city</option>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}
        </select>
        <select aria-label="Filter by territory" value={filter.territory ?? ''} onChange={(e) => setFilter({ ...filter, territory: e.target.value || undefined })} className={field}>
          <option value="">Any territory</option>{ds.territories.map((t) => <option key={t.id}>{t.id}</option>)}
        </select>
      </div>
      <div className="max-h-[420px] overflow-auto border border-ink">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-paper">
            <tr className="border-b border-ink"><th className="px-2 py-2 font-medium">ID</th><th className="font-medium">Name</th><th className="font-medium">City and pin</th><th className="font-medium">Outcome</th><th className="text-right font-medium">Score</th><th className="pl-3 font-medium">Reason</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const d = result.decisions[a.id];
              return (
                <tr key={a.id} onClick={() => select(a.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && select(a.id)} className={`cursor-pointer border-t border-rule hover:bg-sheet ${selected === a.id ? 'bg-sheet font-medium' : ''} ${changed.includes(a.id) ? 'row-flash' : ''}`}>
                  <td className="px-2 py-1.5 font-mono">{a.id}</td>
                  <td>{a.name}</td>
                  <td className="font-mono text-xs">{a.city ?? 'unknown'}, {a.pinRaw || 'no pin'}</td>
                  <td><Badge o={d.outcome} small /></td>
                  <td className="text-right font-mono">{d.score}</td>
                  <td className="max-w-[280px] truncate pl-3 text-soft" title={d.headline}>{d.headline}</td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={6} className="px-3 py-6 text-center text-soft">Nobody matches these filters. Choose “Show everyone” to start again.</td></tr>}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export function TerritoryCards() {
  const r = useStore((s) => s.result);
  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      {r.territories.map((t) => (
        <Panel key={t.territory.id}>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-lg font-semibold">{t.territory.id}, {t.territory.city}</h3>
            <span className="text-sm text-soft">{t.territory.priority} priority, tier {t.territory.tier}</span>
          </div>
          <div className="mt-2 flex gap-1" role="img" aria-label={`${t.filled} of ${t.territory.slots} slots filled`}>
            {Array.from({ length: Math.max(t.territory.slots, 0) }).map((_, i) => (
              <span key={i} className="h-3 flex-1 border border-ink" style={{ background: i < t.filled ? '#17263A' : 'transparent' }} />
            ))}
            {t.territory.slots === 0 && <span className="text-sm text-soft">Closed: no open slots</span>}
          </div>
          <p className="mt-1 text-sm text-soft">{t.filled} of {t.territory.slots} slots filled, {t.territory.pins.length} pins</p>
          <p className="mt-1.5 max-w-[60ch]">{t.winnerWhy}</p>
          {t.ranking.length > 0 && (
            <ol className="mt-2 text-sm">
              {t.ranking.map((x, i) => (
                <li key={x.id} className="flex items-center gap-2 border-t border-rule py-1">
                  <span className="w-4 text-soft">{i + 1}</span>
                  <button onClick={() => select(x.id)} className="font-mono underline underline-offset-2">{x.id}</button>
                  <span className="font-mono text-soft">{x.score}</span>
                  <Badge o={x.outcome} small />
                  <span className="truncate text-soft">{x.note}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      ))}
    </div>
  );
}

export function DataQuality() {
  const ds = useStore((s) => s.ds);
  const r = useStore((s) => s.result);
  const rows = ds.applications.map((a) => ({ a, flags: r.decisions[a.id].flags })).filter((x) => x.flags.length);
  return (
    <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
      {ds.warnings.length > 0 && (
        <Panel>
          <SectionTitle>Notes about the whole file</SectionTitle>
          <ul className="list-disc space-y-1 pl-5">{ds.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </Panel>
      )}
      <Panel>
        <SectionTitle>Problems by applicant ({rows.length})</SectionTitle>
        <p className="mb-2 text-soft">Nothing is dropped. Every row with a problem still gets a decision.</p>
        <ul>
          {rows.map(({ a, flags }) => (
            <li key={a.id} className="border-t border-rule py-2">
              <div className="mb-1 flex items-center gap-2"><button onClick={() => select(a.id)} className="font-mono underline underline-offset-2">{a.id}</button><span>{a.name}</span><Badge o={r.decisions[a.id].outcome} small /></div>
              <ul className="space-y-0.5 text-sm">
                {flags.map((f, i) => <li key={i} className="flex gap-2"><span className="w-14 shrink-0 font-medium">{f.severity === 'error' ? 'Error' : f.severity === 'warn' ? 'Warning' : 'Note'}</span>{f.message}</li>)}
              </ul>
            </li>
          ))}
          {!rows.length && <li className="text-soft">No problems found. The file is clean.</li>}
        </ul>
      </Panel>
    </div>
  );
}
