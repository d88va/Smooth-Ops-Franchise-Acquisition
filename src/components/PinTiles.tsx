import type { Dataset, EngineResult } from '../engine';
import { Mark } from './ui';

const STATUS: Record<string, { label: string; short: string; box: string }> = {
  blocked: { label: 'Blocked by an existing store', short: 'Store here', box: 'border-ink bg-rule/60' },
  taken: { label: 'Taken by an approved partner', short: 'Taken', box: 'border-ink bg-ink text-paper' },
  contested: { label: 'Wanted by two or more applicants', short: 'Contested', box: 'border-ink border-dashed bg-sheet' },
  available: { label: 'Available', short: 'Available', box: 'border-rule bg-sheet' },
};

/** The same pins as the map, laid out as a grid. Useful when many pins sit on top of each other. */
export function PinTiles({ ds, result, selected, onSelect, focus }: { ds: Dataset; result: EngineResult; selected: string | null; onSelect: (id: string) => void; focus: string }) {
  const cities = [...new Set(result.pins.map((p) => p.city))].filter((c) => focus === 'state' || c === focus);
  return (
    <div className="h-full overflow-auto bg-sheet p-4">
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {Object.entries(STATUS).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-3.5 w-3.5 border ${v.box}`} />{v.label}</span>
        ))}
        <span className="text-soft">One approved store per pin code, never on a pin that has a store.</span>
      </div>
      <div className="space-y-5">
        {cities.map((city) => {
          const pins = result.pins.filter((p) => p.city === city).sort((a, b) => a.pin.localeCompare(b.pin));
          return (
            <section key={city}>
              <h4 className="mb-2 text-lg font-semibold">{city}</h4>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">
                {pins.map((p) => {
                  const s = STATUS[p.status];
                  return (
                    <div key={p.pin} className={`border p-2 ${s.box}`}>
                      <div className="font-mono text-sm">{p.pin}</div>
                      <div className="text-xs">{s.short}{p.holder ? `: ${p.holder}` : ''}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.applicants.map((id) => {
                          const d = result.decisions[id];
                          return (
                            <button key={id} onClick={() => onSelect(id)} title={`${id}: ${d.outcome}`} aria-label={`${id}, ${d.outcome}`}
                              className={`inline-flex items-center gap-1 border border-ink bg-sheet px-1 font-mono text-xs text-ink ${selected === id ? 'outline outline-2 outline-ink' : ''}`}>
                              <Mark o={d.outcome} size={12} />{id.replace('APP-', '')}
                            </button>
                          );
                        })}
                      </div>
                      {p.territoryId && <div className="mt-1 text-xs opacity-80">{p.territoryId}</div>}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {ds.applications.some((a) => !a.pin || !result.pins.some((p) => p.pin === a.pin)) && (
          <section>
            <h4 className="mb-2 text-lg font-semibold">Pins outside every territory</h4>
            <div className="flex flex-wrap gap-2">
              {ds.applications.filter((a) => !a.pin || !result.pins.some((p) => p.pin === a.pin)).map((a) => (
                <button key={a.id} onClick={() => onSelect(a.id)} className="inline-flex items-center gap-1.5 border border-ink bg-sheet px-2 py-1 font-mono text-sm">
                  <Mark o={result.decisions[a.id].outcome} size={14} />{a.id}, {a.pinRaw || 'no pin'}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
