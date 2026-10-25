import { select, setCompare, undo, reset, useStore } from '../state/store';
import { GeoMap } from './GeoMap';
import { Badge, Card, SectionTitle } from './ui';

export function ChangesPanel() {
  const diff = useStore((s) => s.diff);
  const log = useStore((s) => s.log);
  const compare = useStore((s) => s.compare);
  const prev = useStore((s) => s.prev);
  const result = useStore((s) => s.result);
  const baseResult = useStore((s) => s.baseResult);
  const ds = useStore((s) => s.ds);
  const baseDS = useStore((s) => s.baseDS);
  const canUndo = useStore((s) => s.history.length > 0);
  const last = log[log.length - 1];
  const layers = { territories: true, stores: true, applicants: true, rings: false, arcs: false, heat: false };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={undo} disabled={!canUndo} className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40">↶ Undo</button>
        <button onClick={reset} disabled={!log.length} className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40">Reset to baseline</button>
        <button onClick={() => setCompare(!compare)} disabled={!prev && !baseResult} className="rounded-lg border border-amber-brand/50 px-3 py-1.5 text-xs text-amber-brand disabled:opacity-40">{compare ? 'Hide' : 'Show'} before / after</button>
      </div>

      {!diff || !last ? (
        <Card className="p-4 text-sm text-slate-400">No changes yet. Try “APP-012 found a ground-floor space” in the query bar. Every applicant whose outcome moves will be listed here with the cause and knock-on effects.</Card>
      ) : (
        <Card className="fade-in p-4">
          <SectionTitle right={<span className="text-[11px] text-slate-500">{diff.changes.length} changed · {diff.unchanged} unchanged</span>}>What changed and why</SectionTitle>
          <div className="mb-2 text-xs text-slate-400">Last update: <span className="text-slate-200">{last.text}</span></div>
          {diff.changes.length === 0 && <p className="text-sm text-slate-300">No decision changed. This update did not affect any outcome or pin.</p>}
          <ul className="space-y-3">
            {diff.changes.map((c) => (
              <li key={c.id} className="rounded-lg border border-ink-600 bg-ink-800/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => select(c.id)} className="font-mono text-sm font-semibold text-white underline decoration-ink-500 hover:decoration-amber-brand">{c.id}</button>
                  <Badge o={c.from} small /> <span className="text-slate-500">→</span> <Badge o={c.to} small />
                  <span className="ml-auto font-mono text-[10px] text-slate-500">score {c.scoreFrom} → {c.scoreTo}</span>
                </div>
                <p className="mt-1.5 text-[13px] text-slate-300">{c.primary}</p>
                {c.knockOn && <p className="mt-1 text-[12px] text-amber-200/90"><b>Knock-on:</b> {c.knockOn}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {compare && baseResult && baseDS && (
        <Card className="fade-in p-3">
          <SectionTitle>Before / after</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ title: prev ? 'Before last update' : 'Baseline', r: prev ?? baseResult, d: prev ? (ds === baseDS ? baseDS : ds) : baseDS }, { title: 'Now', r: result, d: ds }].map((x) => (
              <div key={x.title}>
                <div className="mb-1 flex justify-between text-[11px] text-slate-400"><span className="font-display uppercase tracking-wider">{x.title}</span><span>{x.r.counts.Approved} approved · {x.r.counts.Hold} hold · {x.r.counts.Waitlist} wait · {x.r.counts.Redirect} redir · {x.r.counts.Decline} decl</span></div>
                <div className="aspect-square overflow-hidden rounded-lg border border-ink-600">
                  <GeoMap ds={x.d} result={x.r} focus="state" selected={null} changed={x.title === 'Now' ? diff?.changes.map((c) => c.id) ?? [] : []} visible={null} layers={layers} compact />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-500">Pulsing dots on the right are the applicants whose outcome changed.</p>
        </Card>
      )}
    </div>
  );
}

export function ScenarioLog() {
  const log = useStore((s) => s.log);
  const overrides = useStore((s) => s.overrides);
  return (
    <div className="space-y-3">
      <Card className="p-4">
        <SectionTitle>Scenario log (cumulative)</SectionTitle>
        {!log.length ? <p className="text-sm text-slate-400">Nothing applied yet. The map shows the uploaded baseline.</p> : (
          <ol className="space-y-2 text-[13px]">
            {log.map((l) => (
              <li key={l.n} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-700 font-mono text-[10px] text-slate-300">{l.n}</span>
                <div className="flex-1"><span className="text-slate-200">{l.text}</span> <span className="text-[11px] text-slate-500">· {l.changed} decision{l.changed === 1 ? '' : 's'} changed · {l.kind}</span></div>
              </li>
            ))}
          </ol>
        )}
      </Card>
      <Card className="p-4">
        <SectionTitle>Override log</SectionTitle>
        {!Object.keys(overrides).length ? <p className="text-sm text-slate-400">No overrides. Overrides are how the expansion team corrects the engine; the rate of overrides is the tool's trust metric.</p> : (
          <ul className="space-y-1.5 text-[13px] text-slate-300">
            {Object.entries(overrides).map(([id, o]) => (
              <li key={id}><button onClick={() => select(id)} className="font-mono text-white underline">{id}</button> → {o.outcome}: {o.reason}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
