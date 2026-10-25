import type { Outcome } from '../engine';

export const OUTCOME_COLOR: Record<Outcome, string> = {
  Approved: '#3ddc97',
  Hold: '#f5b942',
  Waitlist: '#5aa9ff',
  Redirect: '#b583ff',
  Decline: '#ff5d6c',
};
export const PRIORITY_COLOR = { High: '#ff8a4c', Medium: '#e8c547', Low: '#6c8cae' } as const;

/** Calendar date for "N weeks from today" (display only; the engine itself never reads the clock). */
export function weekDate(w: number | undefined): string {
  if (w === undefined) return '';
  const d = new Date();
  d.setDate(d.getDate() + Math.round(w * 7));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Badge({ o, small }: { o: Outcome; small?: boolean }) {
  const c = OUTCOME_COLOR[o];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}`}
      style={{ color: c, borderColor: c + '55', background: c + '14' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
      {o}
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-ink-600/70 bg-ink-850/80 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</h3>
      {right}
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
      {(Object.keys(OUTCOME_COLOR) as Outcome[]).map((o) => (
        <span key={o} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: OUTCOME_COLOR[o] }} />
          {o}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border-2 border-slate-300/70" />Store catchment</span>
      <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: '#e8c54733', border: '1px solid #e8c547' }} />Territory (size = open slots)</span>
    </div>
  );
}
