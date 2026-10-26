import { useEffect, useMemo, useState } from 'react';
import { loadShared } from './state/persist';
import { ApplicantPanel } from './components/ApplicantPanel';
import { BeforeAfter, ChangesPanel, ScenarioLog } from './components/ChangesPanel';
import { GeoMap } from './components/GeoMap';
import { LayerToggles } from './components/MapOverlays';
import { RulesPanel } from './components/RulesPanel';
import { PinTiles } from './components/PinTiles';
import { QueryAnswer, QueryBar } from './components/QueryBar';
import { ApplicantTable, DataQuality, OutcomeKey, TerritoryCards } from './components/Tables';
import { UploadScreen } from './components/UploadScreen';
import { btn, btnPrimary, field, Mark, MarkShape } from './components/ui';
import { exportDecisions } from './components/exportXlsx';
import { CONFIG } from './engine';
import { CITIES } from './data/cityGeo';
import { backToUpload, loadDataset, select, setError, setFocus, setSave, setView, useStore } from './state/store';

type Ledger = 'rules' | 'territories' | 'quality' | 'log';
const LEDGER: { k: Ledger; label: string }[] = [
  { k: 'rules', label: 'Rules' },
  { k: 'territories', label: 'Territories' },
  { k: 'quality', label: 'Data problems' },
  { k: 'log', label: 'Change log' },
];

export default function App() {
  const phase = useStore((s) => s.phase);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('u');
    if (!id) return;
    void loadShared(id).then((r) => {
      if (r?.dataset) {
        loadDataset(r.dataset, r.fileName);
        setSave({ status: 'saved', id });
      } else setError('That shared link could not be loaded. It may have been removed, or cloud storage is offline. Upload the file again to continue.');
    });
  }, []);
  return phase === 'upload' ? <UploadScreen /> : <Dashboard />;
}

function Dashboard() {
  const ds = useStore((s) => s.ds);
  const result = useStore((s) => s.result);
  const prev = useStore((s) => s.prev);
  const overrides = useStore((s) => s.overrides);
  const selected = useStore((s) => s.selected);
  const changed = useStore((s) => s.changed);
  const filter = useStore((s) => s.filter);
  const view = useStore((s) => s.view);
  const focus = useStore((s) => s.focus);
  const layers = useStore((s) => s.layers);
  const fileName = useStore((s) => s.fileName);
  const logN = useStore((s) => s.log.length);
  const save = useStore((s) => s.save);
  const error = useStore((s) => s.error);
  const [ledger, setLedger] = useState<Ledger>('rules');

  const visible = useMemo(() => {
    if (!filter.outcome && !filter.city && !filter.territory) return null;
    return new Set(
      ds.applications
        .filter((a) => {
          const d = result.decisions[a.id];
          return (!filter.outcome || d.outcome === filter.outcome) && (!filter.city || a.city === filter.city) && (!filter.territory || d.territoryId === filter.territory || d.redirect?.territoryId === filter.territory);
        })
        .map((a) => a.id),
    );
  }, [ds, result, filter]);

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-12 pt-4 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-ink pb-3">
        <div>
          <h1 className="text-3xl font-semibold leading-none">Franchise partner decisions</h1>
          <p className="mt-1 text-soft">{fileName}: {ds.applications.length} applications, {ds.territories.length} territories, {ds.stores.length} existing stores</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {save.status !== 'idle' && (
            <button disabled={!save.id} onClick={() => save.id && void navigator.clipboard?.writeText(location.origin + location.pathname + '?u=' + save.id)} title={save.id ? 'Copy a link that reopens this upload' : undefined} className={btn}>
              {save.status === 'saving' ? 'Saving a copy' : save.status === 'saved' ? 'Copy link to this file' : 'Not saved online'}
            </button>
          )}
          <button onClick={() => exportDecisions(ds, result, overrides)} className={btnPrimary}>Download decisions (.xlsx)</button>
          <button onClick={backToUpload} className={btn}>Upload another file</button>
        </div>
      </header>

      {result.invariantViolations.length > 0 && (
        <div role="alert" className="mb-3 border border-o-decline border-l-8 bg-sheet p-3">The engine broke one of its own rules: {result.invariantViolations.join('; ')}. Treat these results with care.</div>
      )}
      {error && <div role="alert" className="mb-3 border border-o-decline border-l-8 bg-sheet p-3">{error}</div>}

      <div className="mb-5"><QueryBar /></div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="space-y-5">

          <section aria-label="Map of Karnataka">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
              <div className="relative aspect-[17/20] w-full self-start border border-ink bg-sheet" style={{ maxWidth: 'max(420px, calc((100vh - 210px) * 0.85))' }}>
                {view === 'map' ? (
                  <>
                    <GeoMap ds={ds} result={result} prev={prev} focus={focus} selected={selected} changed={changed} visible={visible} layers={layers} onSelect={select} onFocus={setFocus} />
                    {focus === 'state' && (
                      <figure className="absolute bottom-[4%] right-[4%] z-10 aspect-square w-[34%] min-w-[110px] border border-ink bg-sheet">
                        <GeoMap ds={ds} result={result} prev={prev} focus="Bengaluru" selected={selected} changed={changed} visible={visible} layers={layers} onSelect={select} inset />
                        <figcaption className="absolute left-0 top-0 bg-sheet px-1.5 text-xs font-medium">Bengaluru, enlarged</figcaption>
                      </figure>
                    )}
                  </>
                ) : (
                  <PinTiles ds={ds} result={result} selected={selected} onSelect={select} focus={focus} />
                )}
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="mb-1 text-base font-semibold">Outcomes</p>
                  <OutcomeKey vertical />
                  <p className="mt-1 text-soft">Click an outcome to show only those applicants.</p>
                </div>
                <LayerToggles layers={layers} />
                <div className="inline-flex border border-ink" role="group" aria-label="How to show pins">
                  {(['map', 'tiles'] as const).map((v) => (
                    <button key={v} onClick={() => setView(v)} aria-pressed={view === v} className={`px-3 py-1 ${view === v ? 'bg-ink text-paper' : 'hover:bg-sheet'}`}>{v === 'map' ? 'Map' : 'Pin grid'}</button>
                  ))}
                </div>
                <label className="block">
                  Zoom to
                  <select value={focus} onChange={(e) => setFocus(e.target.value)} className={field + ' mt-0.5 w-full'}>
                    <option value="state">All of Karnataka</option>
                    {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </label>
                <div>
                  <p className="font-semibold">Slots</p>
                  <p>{result.slotsFilled} of {result.slotsTotal} filled</p>
                  <p className="mt-1 font-semibold">Problems in the data</p>
                  <p>{result.flagCount} found. <button onClick={() => { setLedger('quality'); location.hash = 'rules'; }} className="underline underline-offset-2">See them</button></p>
                </div>
              </div>
            </div>

            {/* title block, as at the foot of a survey sheet */}
            <div className="mt-3 grid border border-ink bg-sheet text-sm sm:grid-cols-2">
              <div className="border-b border-ink p-2 sm:border-r">
                <p className="font-semibold">How to read the map</p>
                <ul className="mt-1 space-y-0.5">
                  <li className="flex items-center gap-2"><Mark o="Approved" size={14} />A filled shape is an applicant. The faint circle around it is the area it would serve.</li>
                  <li className="flex items-center gap-2"><svg width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true" className="shrink-0"><circle r="7" fill="none" stroke="#17263A" /><path d="M-4 3V-1M4 3V-1M-4.5 -1L-3.5 -4.5H3.5L4.5 -1Z M-4 3H4" stroke="#17263A" fill="#17263A" strokeWidth="1" /></svg>An existing store and the area it covers.</li>
                  <li className="flex items-center gap-2"><svg width="14" height="14" viewBox="-8 -8 16 16" aria-hidden="true" className="shrink-0"><circle r="7" fill="#3F5F801a" stroke="#3F5F80" /></svg>A territory. The bigger the circle, the more slots are open.</li>
                  <li className="flex items-center gap-2"><svg width="22" height="14" viewBox="-12 -8 24 16" aria-hidden="true" className="shrink-0"><MarkShape o="Approved" size={10} /><circle r="8" fill="none" stroke="#009E73" strokeWidth="1.6" strokeDasharray="3 2" /></svg>A scalloped outline marks a pin whose outcome just changed.</li>
                </ul>
              </div>
              <div className="border-b border-ink p-2">
                <p className="font-semibold">Map positions are approximate</p>
                <p>Pins sit near each city centre. They are not surveyed locations.</p>
              </div>
              <div className="p-2 sm:col-span-2">
                <p><span className="font-semibold">Rules at a glance.</span> Approved at a score of {CONFIG.approveByPriority.High}, {CONFIG.approveByPriority.Medium} or {CONFIG.approveByPriority.Low} (High, Medium or Low priority territory). Minimum investment ₹{CONFIG.tierMinInvestment[1]}L, ₹{CONFIG.tierMinInvestment[2]}L or ₹{CONFIG.tierMinInvestment[3]}L (tier 1, 2 or 3). Minimum shop {CONFIG.tierMinSize[1]}, {CONFIG.tierMinSize[2]} or {CONFIG.tierMinSize[3]} sq ft. One store per pin. <a href="#rules" onClick={() => setLedger('rules')} className="underline underline-offset-2">Read all the rules</a></p>
              </div>
            </div>
          </section>

          <BeforeAfter />

          <section id="rules" aria-label="Rules, territories and data problems" className="scroll-mt-4">
            <div role="tablist" className="flex flex-wrap border-b border-ink">
              {LEDGER.map((t) => (
                <button key={t.k} role="tab" aria-selected={ledger === t.k} onClick={() => setLedger(t.k)} className={`-mb-px border border-b-0 px-4 py-2 text-base font-medium ${ledger === t.k ? 'border-ink bg-sheet' : 'border-transparent text-soft hover:text-ink'}`}>
                  {t.label}{t.k === 'log' && logN ? ` (${logN})` : ''}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="border border-t-0 border-ink bg-sheet/60 p-4">
              {ledger === 'rules' && <RulesPanel />}
              {ledger === 'territories' && <TerritoryCards />}
              {ledger === 'quality' && <DataQuality />}
              {ledger === 'log' && <ScenarioLog />}
            </div>
          </section>

          <ApplicantTable />
        </div>

        <aside aria-label="Decisions" className="space-y-6 lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] lg:self-start lg:overflow-auto lg:pr-2">
          <QueryAnswer />
          <ChangesPanel />
          <ApplicantPanel />
        </aside>
      </div>
    </div>
  );
}
