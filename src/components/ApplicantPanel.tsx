import { useMemo, useState } from 'react';
import { counterfactuals, OUTCOMES, type Outcome } from '../engine';
import { select, setOverride, useStore } from '../state/store';
import { Badge, Card, OUTCOME_COLOR, SectionTitle, weekDate } from './ui';

export function ApplicantPanel() {
  const selected = useStore((s) => s.selected);
  const ds = useStore((s) => s.ds);
  const result = useStore((s) => s.result);
  const overrides = useStore((s) => s.overrides);
  const [ov, setOv] = useState<Outcome>('Approved');
  const [why, setWhy] = useState('');
  const a = ds.applications.find((x) => x.id === selected);
  const d = a ? result.decisions[a.id] : null;
  const cfs = useMemo(() => (a && d && d.outcome !== 'Approved' ? counterfactuals(ds, overrides, a.id) : []), [ds, overrides, a?.id, d?.outcome]);

  return (
    <div className="space-y-3">
      <div>
        <label className="sr-only" htmlFor="app-pick">Choose applicant</label>
        <select id="app-pick" value={selected ?? ''} onChange={(e) => select(e.target.value || null)} className="w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-slate-100">
          <option value="">Select an applicant…</option>
          {ds.applications.map((x) => (
            <option key={x.id} value={x.id}>{x.id} · {x.name} · {result.decisions[x.id].outcome}</option>
          ))}
        </select>
      </div>
      {!a || !d ? (
        <Card className="p-4 text-sm text-slate-400">Click a dot on the map, a row in the table, or pick an applicant above to see the decision, reasons, next steps and training plan.</Card>
      ) : (
        <div className="fade-in space-y-3">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-lg font-semibold text-white">{a.id} · {a.name}</div>
                <div className="text-xs text-slate-400">{a.city ?? '—'} · pin {a.pinRaw || '—'} · {d.territoryId ?? 'no territory'} · prefers {a.language}</div>
              </div>
              <Badge o={d.outcome} />
            </div>
            <p className="mt-3 text-[15px] font-medium leading-snug text-slate-100">{d.headline}</p>
            <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-slate-300">
              {d.reasons.map((r, i) => <li key={i} className="flex gap-2"><span style={{ color: OUTCOME_COLOR[d.outcome] }}>•</span><span>{r}</span></li>)}
            </ul>
            <div className="mt-2 text-[11px] text-slate-500">Decided by: <span className="text-slate-300">{d.decidedBy}</span></div>
            {d.conditions.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-brand/30 bg-amber-brand/5 p-2 text-xs text-amber-200">
                <b>Conditions:</b> {d.conditions.join('; ')}
              </div>
            )}
            {d.overridden && (
              <div className="mt-2 rounded-lg border border-o-redirect/40 bg-o-redirect/5 p-2 text-xs text-purple-200">
                <b>Override {d.overridden.applied ? 'applied' : 'NOT applied'}:</b> {d.overridden.outcome}: “{d.overridden.reason}”. {d.overridden.note}
              </div>
            )}
          </Card>

          {d.breakdown.length > 0 && (
            <Card className="p-4">
              <SectionTitle right={<span className="font-mono text-sm text-white">{d.score}<span className="text-slate-500">/100</span></span>}>Score breakdown</SectionTitle>
              <div className="space-y-2">
                {d.breakdown.map((b) => (
                  <div key={b.key}>
                    <div className="flex justify-between text-[11px] text-slate-300"><span>{b.label}</span><span className="font-mono">{b.max > 0 ? `${b.score}/${b.max}` : b.score}</span></div>
                    {b.max > 0 && <div className="mt-0.5 h-1.5 rounded bg-ink-700"><div className="h-1.5 rounded bg-amber-brand/80" style={{ width: `${(b.score / b.max) * 100}%`, transition: 'width 500ms' }} /></div>}
                    <div className="mt-0.5 text-[10px] text-slate-500">{b.note}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {d.outcome !== 'Approved' && (
            <Card className="p-4">
              <SectionTitle>Flips to Approved if…</SectionTitle>
              <ul className="space-y-1 text-[13px] text-slate-200">
                {cfs.map((c, i) => <li key={i} className="flex gap-2"><span className="text-o-approved">→</span>{c.text}</li>)}
              </ul>
              <p className="mt-2 text-[10px] text-slate-500">Each option was checked by re-running the engine on a modified copy.</p>
            </Card>
          )}

          <Card className="p-4">
            <SectionTitle>Next steps</SectionTitle>
            <ol className="space-y-1.5 text-[13px]">
              {d.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-500 text-[9px] text-slate-400">{i + 1}</span>
                  <span className="flex-1 text-slate-200">{s.text}</span>
                  <span className="shrink-0 whitespace-nowrap rounded bg-ink-700 px-1.5 py-0.5 text-right text-[10px] text-slate-400">{s.when}{s.dueWeek !== undefined && <span className="block text-amber-brand">by {weekDate(s.dueWeek)}</span>}</span>
                </li>
              ))}
            </ol>
          </Card>

          {d.plan && (
            <Card className="p-4">
              <SectionTitle>Readiness & training plan</SectionTitle>
              <div className="text-[13px] font-medium text-white">{d.plan.track}</div>
              <div className="text-[11px] text-slate-400">Delivered in <b className="text-slate-200">{d.plan.language}</b> · opens {weekDate(d.plan.openWeek)}{d.plan.redated ? ' (re-dated)' : ''}</div>
              <ul className="mt-2 grid gap-1 text-[12px] text-slate-300 sm:grid-cols-2">
                {d.plan.modules.map((m) => <li key={m} className="flex gap-1.5"><span className="text-o-approved">✓</span>{m}</li>)}
              </ul>
              <div className="mt-3 space-y-1">
                {d.plan.milestones.map((m) => (
                  <div key={m.name} className="flex items-center gap-2 text-[12px]">
                    <span className="w-24 shrink-0 font-mono text-[10px] text-amber-brand">{weekDate(m.dueWeek)}</span>
                    <span className="h-px flex-1 bg-ink-600" />
                    <span className="text-right text-slate-300">{m.name}{m.note ? <span className="text-slate-500"> ({m.note})</span> : null}</span>
                  </div>
                ))}
              </div>
              <p className={`mt-3 rounded-lg p-2 text-xs ${d.plan.redated ? 'border border-amber-brand/30 bg-amber-brand/5 text-amber-200' : 'bg-ink-800 text-slate-300'}`}>{d.plan.feasibility}</p>
            </Card>
          )}

          {d.flags.length > 0 && (
            <Card className="p-4">
              <SectionTitle>Data-quality flags</SectionTitle>
              <ul className="space-y-1 text-xs">
                {d.flags.map((f, i) => (
                  <li key={i} className="flex gap-2 text-slate-300"><span className={f.severity === 'error' ? 'text-o-decline' : f.severity === 'warn' ? 'text-o-hold' : 'text-slate-500'}>▲</span>{f.message}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            <SectionTitle>Expansion-team override</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <select value={ov} onChange={(e) => setOv(e.target.value as Outcome)} className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-xs text-slate-100" aria-label="Override outcome">
                {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
              </select>
              <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason (required for the log)" className="min-w-0 flex-1 rounded-lg border border-ink-500 bg-ink-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500" />
              <button disabled={!why.trim()} onClick={() => { setOverride(a.id, ov, why.trim()); setWhy(''); }} className="rounded-lg bg-amber-brand px-3 py-1.5 text-xs font-semibold text-ink-950 disabled:opacity-40">Apply</button>
              {overrides[a.id] && <button onClick={() => setOverride(a.id, null, '')} className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-slate-300">Remove</button>}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Logged. The engine still enforces one store per pin and the territory slot limit; an override that would break either is refused.</p>
          </Card>
        </div>
      )}
    </div>
  );
}


