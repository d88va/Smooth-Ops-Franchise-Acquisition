import { select, setCompare, undo, reset, useStore } from '../state/store';
import { GeoMap } from './GeoMap';
import { Badge, btn, Panel, SectionTitle } from './ui';

const LAYERS = { territories: true, stores: true, applicants: true, rings: false, arcs: false, heat: false };

export function ChangesPanel() {
  const diff = useStore((s) => s.diff);
  const log = useStore((s) => s.log);
  const compare = useStore((s) => s.compare);
  const canUndo = useStore((s) => s.history.length > 0);
  const last = log[log.length - 1];
  const hasDiff = !!diff && !!last;

  return (
    <Panel>
      <SectionTitle>What changed and why</SectionTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setCompare(!compare)} disabled={!hasDiff} aria-pressed={compare} className={btn + (compare ? ' bg-ink text-paper' : '')}>
          {compare ? 'Hide before and after' : 'Show before and after'}
        </button>
        <button onClick={undo} disabled={!canUndo} className={btn}>Undo</button>
        <button onClick={reset} disabled={!log.length} className={btn}>Go back to the uploaded file</button>
      </div>

      {!hasDiff ? (
        <p className="max-w-[62ch] text-soft">Nothing has changed yet. Ask “APP-012 found a ground-floor space”. Every pin that moves gets a scalloped outline on the map, and this list says why.</p>
      ) : (
        <div>
          <p className="mb-2 max-w-[75ch]">Last update: <b className="font-medium">{last.text}</b>. {diff.changes.length} changed, {diff.unchanged} did not.</p>
          {diff.changes.length === 0 && <p>No decision changed. This update did not affect any outcome or pin.</p>}
          <ul>
            {diff.changes.map((c) => (
              <li key={c.id} className="border-t border-rule py-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <button onClick={() => select(c.id)} className="font-mono text-base font-medium underline underline-offset-2">{c.id}</button>
                  <span className="text-soft">was</span><Badge o={c.from} small />
                  <span className="text-soft">now</span><Badge o={c.to} small />
                  <span className="ml-auto font-mono text-xs text-soft">score {c.scoreFrom} to {c.scoreTo}</span>
                </div>
                <p className="mt-1 max-w-[75ch]">{c.primary}</p>
                {c.knockOn && (
                  <p className="mt-2 max-w-[75ch] border-l-4 border-ink bg-sheet px-3 py-1.5"><b className="font-semibold">Knock-on effect.</b> {c.knockOn}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

    </Panel>
  );
}

export function BeforeAfter() {
  const diff = useStore((s) => s.diff);
  const compare = useStore((s) => s.compare);
  const prev = useStore((s) => s.prev);
  const result = useStore((s) => s.result);
  const baseResult = useStore((s) => s.baseResult);
  const ds = useStore((s) => s.ds);
  const baseDS = useStore((s) => s.baseDS);
  if (!compare || !baseResult || !baseDS) return null;
  // Zoom both maps to the city where things moved, so the difference is big enough to see.
  const cities = new Set((diff?.changes ?? []).map((c) => ds.applications.find((a) => a.id === c.id)?.city).filter(Boolean));
  const focus = cities.size === 1 ? ([...cities][0] as string) : 'state';
  return (
    <Panel>
      <SectionTitle right={<button onClick={() => setCompare(false)} className="text-sm underline underline-offset-2">Hide</button>}>Before and after</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {[{ title: prev ? 'Before the last update' : 'The uploaded file', r: prev ?? baseResult, d: prev ? ds : baseDS, now: false }, { title: 'Now', r: result, d: ds, now: true }].map((x) => (
          <figure key={x.title}>
            <figcaption className="mb-1 flex flex-wrap justify-between gap-x-3 text-sm">
              <span className="font-semibold">{x.title}</span>
              <span className="text-soft">{x.r.counts.Approved} approved, {x.r.counts.Hold} on hold, {x.r.counts.Waitlist} waitlisted, {x.r.counts.Redirect} redirected, {x.r.counts.Decline} declined</span>
            </figcaption>
            <div className="aspect-[17/20] border border-ink">
              <GeoMap ds={x.d} result={x.r} focus={focus} selected={null} changed={x.now ? diff?.changes.map((c) => c.id) ?? [] : []} visible={null} layers={LAYERS} compact={focus === 'state'} />
            </div>
          </figure>
        ))}
      </div>
      <p className="mt-2 text-sm text-soft">Scalloped outlines on the right mark applicants whose outcome changed.{focus !== 'state' && ` Both maps are zoomed to ${focus}.`}</p>
    </Panel>
  );
}

export function ScenarioLog() {
  const log = useStore((s) => s.log);
  const overrides = useStore((s) => s.overrides);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel>
        <SectionTitle>Changes you have made</SectionTitle>
        {!log.length ? <p className="text-soft">Nothing yet. The map shows the file as uploaded.</p> : (
          <ol className="space-y-2">
            {log.map((l) => (
              <li key={l.n} className="flex gap-3 border-t border-rule pt-2">
                <span className="w-6 shrink-0 font-mono text-sm text-soft">{l.n}</span>
                <p>{l.text} <span className="text-sm text-soft">({l.changed} decision{l.changed === 1 ? '' : 's'} changed)</span></p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
      <Panel>
        <SectionTitle>Manual overrides</SectionTitle>
        {!Object.keys(overrides).length ? <p className="max-w-[60ch] text-soft">None. An override lets the expansion team correct the engine and records why.</p> : (
          <ul className="space-y-2">
            {Object.entries(overrides).map(([id, o]) => (
              <li key={id} className="border-t border-rule pt-2"><button onClick={() => select(id)} className="font-mono underline underline-offset-2">{id}</button> set to {o.outcome}: {o.reason}</li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
