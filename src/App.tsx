import { useEffect, useMemo } from 'react';
import { loadShared } from './state/persist';
import { ApplicantPanel } from './components/ApplicantPanel';
import { ChangesPanel, ScenarioLog } from './components/ChangesPanel';
import { GeoMap } from './components/GeoMap';
import { LayerCard, StatsCard } from './components/MapOverlays';
import { RulesPanel } from './components/RulesPanel';
import { PinTiles } from './components/PinTiles';
import { QueryBar } from './components/QueryBar';
import { ApplicantTable, DataQuality, Kpis, TerritoryCards } from './components/Tables';
import { UploadScreen } from './components/UploadScreen';
import { Legend } from './components/ui';
import { exportDecisions } from './components/exportXlsx';
import { CITIES } from './data/cityGeo';
import { backToUpload, loadDataset, select, setError, setFocus, setSave, setTab, setView, useStore, type Tab } from './state/store';

const TABS: { k: Tab; label: string }[] = [
  { k: 'detail', label: 'Applicant' },
  { k: 'changes', label: 'What changed' },
  { k: 'territories', label: 'Territories' },
  { k: 'quality', label: 'Data quality' },
  { k: 'log', label: 'Log' },
  { k: 'rules', label: 'Rules' },
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
      } else setError('That shared link could not be loaded (it may have been removed, or storage is offline). You can upload the file again.');
    });
  }, []);
  return phase === 'upload' ? <UploadScreen /> : <Dashboard />;
}

function Dashboard() {
  const ds = useStore((s) => s.ds);
  const result = useStore((s) => s.result);
  const overrides = useStore((s) => s.overrides);
  const selected = useStore((s) => s.selected);
  const changed = useStore((s) => s.changed);
  const filter = useStore((s) => s.filter);
  const tab = useStore((s) => s.tab);
  const view = useStore((s) => s.view);
  const focus = useStore((s) => s.focus);
  const layers = useStore((s) => s.layers);
  const fileName = useStore((s) => s.fileName);
  const logN = useStore((s) => s.log.length);
  const save = useStore((s) => s.save);

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
    <div className="mx-auto max-w-[1500px] px-3 pb-10 pt-3 sm:px-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 ring-1 ring-ink-500"><span className="h-3.5 w-3.5 rounded-full border-[3px] border-amber-brand" /></div>
          <div>
            <div className="font-display text-base font-semibold leading-tight text-white">Franchise Partner Engine</div>
            <div className="text-[11px] text-slate-500">{fileName} · {ds.applications.length} applications · {ds.territories.length} territories · {ds.stores.length} existing stores</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {save.status !== 'idle' && (
            <button disabled={!save.id} onClick={() => save.id && void navigator.clipboard?.writeText(location.origin + location.pathname + '?u=' + save.id)} title={save.id ? 'Copy a link that reopens this upload' : undefined} className="rounded-lg border border-ink-600 px-2.5 py-1.5 text-[11px] text-slate-400">
              {save.status === 'saving' ? 'Saving to cloud...' : save.status === 'saved' ? 'Saved to cloud . copy link' : 'Working offline (not saved)'}
            </button>
          )}
          <button onClick={() => exportDecisions(ds, result, overrides)} className="rounded-lg bg-amber-brand px-3 py-1.5 text-xs font-semibold text-ink-950 hover:brightness-110">⬇ Export decisions (.xlsx)</button>
          <button onClick={backToUpload} className="rounded-lg border border-ink-500 px-3 py-1.5 text-xs text-slate-300 hover:text-white">Upload another file</button>
        </div>
      </header>

      <Kpis />

      {result.invariantViolations.length > 0 && (
        <div role="alert" className="mt-2 rounded-lg border border-o-decline/50 bg-o-decline/10 p-2 text-xs text-red-200">Invariant violation: {result.invariantViolations.join('; ')}</div>
      )}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.9fr)]">
        <div className="space-y-3">
          <QueryBar />
          <div className="overflow-hidden rounded-xl border border-ink-600/70 bg-ink-900">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-700 px-3 py-2">
              <div className="inline-flex overflow-hidden rounded-lg border border-ink-500 text-xs">
                {(['map', 'tiles'] as const).map((v) => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-1 ${view === v ? 'bg-ink-600 text-white' : 'text-slate-400 hover:text-white'}`}>{v === 'map' ? 'Bubble map' : 'Pin tiles'}</button>
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                Zoom
                <select value={focus} onChange={(e) => setFocus(e.target.value)} className="rounded-lg border border-ink-500 bg-ink-800 px-2 py-1 text-xs text-slate-200">
                  <option value="state">Karnataka</option>
                  {CITIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            </div>
            <div className="relative aspect-square max-h-[720px] w-full sm:aspect-[5/4]">
              {view === 'map' ? (
                <>
                  <GeoMap ds={ds} result={result} focus={focus} selected={selected} changed={changed} visible={visible} layers={layers} onSelect={select} onFocus={setFocus} />
                  <LayerCard layers={layers} focus={focus} />
                  <StatsCard ds={ds} result={result} />
                  {focus === 'state' && (
                    <div className="absolute bottom-3 left-3 z-10 h-[34%] w-[34%] min-w-[150px] overflow-hidden rounded-xl border border-white/15 bg-ink-950 shadow-2xl">
                      <div className="absolute left-2 top-1 z-10 font-display text-[10px] uppercase tracking-widest text-amber-brand">Bengaluru inset</div>
                      <GeoMap ds={ds} result={result} focus="Bengaluru" selected={selected} changed={changed} visible={visible} layers={layers} onSelect={select} inset />
                    </div>
                  )}
                </>
              ) : (
                <PinTiles ds={ds} result={result} selected={selected} onSelect={select} focus={focus} />
              )}
            </div>
            <div className="border-t border-ink-700 px-3 py-2"><Legend /></div>
          </div>
          <ApplicantTable />
        </div>

        <aside className="lg:sticky lg:top-3 lg:max-h-[calc(100vh-24px)] lg:self-start lg:overflow-auto lg:pr-1">
          <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border border-ink-600/70 bg-ink-850/80 p-1" role="tablist">
            {TABS.map((t) => (
              <button key={t.k} role="tab" aria-selected={tab === t.k} onClick={() => setTab(t.k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${tab === t.k ? 'bg-ink-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {t.label}{t.k === 'log' && logN ? ` (${logN})` : ''}{t.k === 'changes' && changed.length ? ` · ${changed.length}` : ''}
              </button>
            ))}
          </div>
          {tab === 'detail' && <ApplicantPanel />}
          {tab === 'changes' && <ChangesPanel />}
          {tab === 'territories' && <TerritoryCards />}
          {tab === 'quality' && <DataQuality />}
          {tab === 'log' && <ScenarioLog />}
          {tab === 'rules' && <RulesPanel />}
        </aside>
      </div>
    </div>
  );
}
