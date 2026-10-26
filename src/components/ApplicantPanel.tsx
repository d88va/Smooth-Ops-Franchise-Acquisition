import { useMemo, useState } from 'react';
import { counterfactuals, OUTCOMES, type Outcome } from '../engine';
import { select, setOverride, useStore } from '../state/store';
import { btnPrimary, btn, field, Mark, OUTCOME_COLOR, Panel, SectionTitle, weekDate } from './ui';

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
    <div>
      <label htmlFor="app-pick" className="block text-lg font-semibold">Applicant</label>
      <select id="app-pick" value={selected ?? ''} onChange={(e) => select(e.target.value || null)} className={field + ' mt-1 w-full'}>
        <option value="">Choose an applicant</option>
        {ds.applications.map((x) => (
          <option key={x.id} value={x.id}>{x.id}, {x.name}, {result.decisions[x.id].outcome}</option>
        ))}
      </select>

      {!a || !d ? (
        <p className="mt-4 max-w-[48ch] text-soft">Choose an applicant above, click a marker on the map, or ask a question. You will see the decision, the reasons, what the applicant must do next, and their training plan.</p>
      ) : (
        <div className="mt-4">
          {/* verdict */}
          <div className="border border-ink bg-sheet p-4" style={{ borderTopWidth: 6, borderTopColor: OUTCOME_COLOR[d.outcome] }}>
            <div className="flex items-center gap-3">
              <Mark o={d.outcome} size={40} />
              <div>
                <p className="text-3xl font-semibold leading-none">{d.outcome}</p>
                <p className="mt-1 font-mono text-sm text-soft">{a.id}, {a.name}</p>
              </div>
              <p className="ml-auto text-right font-mono text-sm text-soft">score<br /><span className="text-xl text-ink">{d.score}</span>/100</p>
            </div>
            <p className="mt-3 max-w-[60ch] text-lg font-medium leading-snug">{d.headline}</p>
            <p className="mt-1 text-sm text-soft">{a.city ?? 'City unknown'}, pin {a.pinRaw || 'not given'}, {d.territoryId ?? 'no territory'}, prefers {a.language}</p>
          </div>

          <Panel className="mt-4">
            <SectionTitle>Why</SectionTitle>
            <ul className="max-w-[68ch] list-disc space-y-1 pl-5">
              {d.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p className="mt-2 text-sm text-soft">Decided by: {d.decidedBy}</p>
            {d.conditions.length > 0 && <p className="mt-2 border-l-4 border-ink bg-sheet px-3 py-1.5"><b className="font-semibold">Conditions.</b> {d.conditions.join('; ')}</p>}
            {d.overridden && (
              <p className="mt-2 border-l-4 border-ink bg-sheet px-3 py-1.5"><b className="font-semibold">Manual override {d.overridden.applied ? 'applied' : 'not applied'}.</b> {d.overridden.outcome}: “{d.overridden.reason}”. {d.overridden.note}</p>
            )}
          </Panel>

          {d.outcome !== 'Approved' && (
            <Panel className="mt-4">
              <SectionTitle>This applicant would be approved if</SectionTitle>
              <ul className="max-w-[68ch] list-disc space-y-1 pl-5">
                {cfs.map((c, i) => <li key={i}>{c.text}</li>)}
              </ul>
              <p className="mt-1 text-sm text-soft">Each option was tested by running the engine again on a changed copy of the data.</p>
            </Panel>
          )}

          <Panel className="mt-4">
            <SectionTitle>What the applicant must do next</SectionTitle>
            <ol>
              {d.nextSteps.map((s, i) => (
                <li key={i} className="flex gap-3 border-t border-rule py-2">
                  <span className="w-5 shrink-0 font-mono text-sm text-soft">{i + 1}</span>
                  <span className="flex-1">{s.text}</span>
                  <span className="shrink-0 text-right text-sm text-soft">{s.when}{s.dueWeek !== undefined && <span className="block font-medium text-ink">by {weekDate(s.dueWeek)}</span>}</span>
                </li>
              ))}
            </ol>
          </Panel>

          {d.plan && (
            <Panel className="mt-4">
              <SectionTitle>Training plan</SectionTitle>
              <p className="font-medium">{d.plan.track}</p>
              <p className="text-sm text-soft">Taught in {d.plan.language}. Store opens {weekDate(d.plan.openWeek)}{d.plan.redated ? ' (date moved)' : ''}.</p>
              <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {d.plan.modules.map((m) => <li key={m} className="flex gap-2"><span aria-hidden="true">•</span>{m}</li>)}
              </ul>
              <div className="mt-3">
                {d.plan.milestones.map((m) => (
                  <div key={m.name} className="flex items-baseline gap-3 border-t border-rule py-1.5">
                    <span className="w-28 shrink-0 font-mono text-sm">{weekDate(m.dueWeek)}</span>
                    <span>{m.name}{m.note ? <span className="text-soft"> ({m.note})</span> : null}</span>
                  </div>
                ))}
              </div>
              <p className={`mt-3 px-3 py-1.5 ${d.plan.redated ? 'border-l-4 border-ink bg-sheet' : 'text-soft'}`}>{d.plan.feasibility}</p>
            </Panel>
          )}

          {d.breakdown.length > 0 && (
            <Panel className="mt-4">
              <SectionTitle>How the score adds up</SectionTitle>
              <div className="space-y-2">
                {d.breakdown.map((b) => (
                  <div key={b.key}>
                    <div className="flex justify-between text-sm"><span>{b.label}</span><span className="font-mono">{b.max > 0 ? `${b.score} of ${b.max}` : b.score}</span></div>
                    {b.max > 0 && <div className="mt-0.5 h-2 border border-ink bg-sheet"><div className="h-full bg-ink" style={{ width: `${(b.score / b.max) * 100}%` }} /></div>}
                    <div className="text-sm text-soft">{b.note}</div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {d.flags.length > 0 && (
            <Panel className="mt-4">
              <SectionTitle>Problems found in the data</SectionTitle>
              <ul className="space-y-1">
                {d.flags.map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="w-14 shrink-0 text-sm font-medium">{f.severity === 'error' ? 'Error' : f.severity === 'warn' ? 'Warning' : 'Note'}</span>{f.message}</li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel className="mt-4">
            <SectionTitle>Override this decision</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <select value={ov} onChange={(e) => setOv(e.target.value as Outcome)} className={field} aria-label="Outcome to set">
                {OUTCOMES.map((o) => <option key={o}>{o}</option>)}
              </select>
              <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Reason, kept in the log" aria-label="Reason for the override" className={field + ' min-w-0 flex-1'} />
              <button disabled={!why.trim()} onClick={() => { setOverride(a.id, ov, why.trim()); setWhy(''); }} className={btnPrimary}>Apply override</button>
              {overrides[a.id] && <button onClick={() => setOverride(a.id, null, '')} className={btn}>Remove override</button>}
            </div>
            <p className="mt-2 text-sm text-soft">The engine still allows only one store per pin and respects territory slot limits. An override that breaks either is refused.</p>
          </Panel>
        </div>
      )}
    </div>
  );
}
