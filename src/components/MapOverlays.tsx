import { OUTCOMES, type Dataset, type EngineResult } from '../engine';
import { toggleLayer, type Layers } from '../state/store';
import { OUTCOME_COLOR } from './ui';

const LAYER_LABELS: [keyof Layers, string][] = [
  ['territories', 'Territory hotspots'],
  ['stores', 'Existing stores'],
  ['applicants', 'Applicants'],
  ['rings', 'Cannibalisation rings'],
  ['arcs', 'Flow arcs'],
  ['heat', 'Heat density'],
];

/** Floating glass cards over the map: layer switches (top-left) and outcome mix (bottom-right). */
export function LayerCard({ layers, focus }: { layers: Layers; focus: string }) {
  return (
    <div className="absolute left-3 top-3 z-10 w-[190px] rounded-xl border border-white/10 bg-ink-900/70 p-3 shadow-2xl backdrop-blur-md">
      <div className="font-display text-lg font-semibold leading-tight text-white">{focus === 'state' ? 'Karnataka' : focus}</div>
      <div className="mb-2 text-[10px] uppercase tracking-[0.14em] text-slate-500">Franchise coverage</div>
      <ul className="space-y-1">
        {LAYER_LABELS.map(([k, label]) => (
          <li key={k}>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-300">
              <input type="checkbox" checked={layers[k]} onChange={() => toggleLayer(k)} className="h-3 w-3 accent-amber-500" />
              {label}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatsCard({ ds, result }: { ds: Dataset; result: EngineResult }) {
  const n = Math.max(1, ds.applications.length);
  return (
    <div className="absolute bottom-3 right-3 z-10 hidden w-[250px] rounded-xl border border-white/10 bg-ink-900/70 p-3 shadow-2xl backdrop-blur-md sm:block">
      <div className="space-y-2.5">
        {OUTCOMES.map((o) => {
          const pct = Math.round((result.counts[o] / n) * 100);
          return (
            <div key={o}>
              <div className="flex items-baseline gap-2 text-[12px]">
                <span className="font-display font-semibold text-white">{pct}%</span>
                <span className="text-slate-300">{o}</span>
                <span className="ml-auto font-mono text-[10px] text-slate-500">{result.counts[o]}</span>
              </div>
              <div className="mt-0.5 h-[3px] rounded bg-white/10">
                <div className="h-[3px] rounded" style={{ width: `${pct}%`, background: OUTCOME_COLOR[o], boxShadow: `0 0 6px ${OUTCOME_COLOR[o]}`, transition: 'width 600ms' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[10px] text-slate-500">Based on {ds.applications.length} applications · {result.slotsFilled}/{result.slotsTotal} slots filled</div>
    </div>
  );
}
