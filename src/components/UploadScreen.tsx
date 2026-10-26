import { useRef, useState } from 'react';
import { sampleDataset } from '../data/sample';
import { parseWorkbook, type Outcome } from '../engine';
import { saveUpload } from '../state/persist';
import { loadDataset, setError, setSave, useStore } from '../state/store';
import { btn, btnPrimary, Mark } from './ui';

const MEANING: [Outcome, string][] = [
  ['Approved', 'Gets a store in the territory. Next steps and a training plan follow.'],
  ['Hold', 'Close, but one thing is missing, such as space or funds. The applicant can fix it.'],
  ['Waitlist', 'Qualified, but another applicant won the pin. First in line if it frees up.'],
  ['Redirect', 'Not this pin, but another open pin fits. The app names it.'],
  ['Decline', 'Cannot be fixed soon, for example the pin already has a store.'],
];

export function UploadScreen() {
  const error = useStore((s) => s.error);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const handle = async (file: File | undefined | null) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
        setError(`"${file.name}" is not an Excel file. Save it as .xlsx and drop it here again, or use the sample data.`);
        return;
      }
      const buf = await file.arrayBuffer();
      const res = parseWorkbook(buf);
      if (!res.dataset) setError(res.error ?? 'The file could not be read.');
      else {
        loadDataset(res.dataset, file.name);
        setSave({ status: 'saving', id: null });
        void saveUpload(res.dataset, file.name).then((id) => {
          setSave(id ? { status: 'saved', id } : { status: 'offline', id: null });
          if (id) history.replaceState(null, '', `?u=${id}`);
        });
      }
    } catch (e) {
      setError(`Could not read this file (${(e as Error).message}). Check that it opens in Excel, then try again.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div>
        <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] sm:text-5xl">Franchise partner decisions</h1>
        <p className="mt-4 max-w-[58ch] text-lg">
          Upload an Excel file of applicants and territories. The app decides every applicant, explains why, and plots them on a map of Karnataka. Then type a question or a new fact and watch the map change.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files?.[0]); }}
          className={`relative mt-8 border border-ink p-6 ${drag ? 'bg-sheet outline outline-2 outline-offset-2 outline-ink' : 'bg-sheet/60'}`}
        >
          {/* registration marks, as on a survey sheet */}
          {['left-0 top-0', 'right-0 top-0', 'left-0 bottom-0', 'right-0 bottom-0'].map((p) => (
            <span key={p} aria-hidden="true" className={`absolute ${p} h-3 w-3 -translate-x-0 bg-ink`} style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)', transform: p.includes('right') ? (p.includes('bottom') ? 'rotate(180deg)' : 'rotate(90deg)') : p.includes('bottom') ? 'rotate(270deg)' : undefined }} />
          ))}
          <p className="text-xl font-semibold">{drag ? 'Release to read the file' : 'Drop an Excel file here'}</p>
          <p className="mt-1 max-w-[55ch] text-soft">Sheet 1 lists applications and sheet 2 lists territories. Existing stores are already built in.</p>
          <input ref={input} type="file" accept=".xlsx,.xlsm,.xls" className="sr-only" aria-label="Choose an Excel file" onChange={(e) => { void handle(e.target.files?.[0]); e.target.value = ''; }} />
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={() => input.current?.click()} disabled={busy} className={btn + ' px-4 py-2'}>{busy ? 'Reading the file' : 'Choose a file from this computer'}</button>
            <button onClick={() => loadDataset(sampleDataset(), 'Sample data')} className={btnPrimary + ' px-4 py-2'}>Use the sample data</button>
          </div>
          <a href="./sample-applications.xlsx" download className="mt-4 inline-block text-sm underline underline-offset-2">Download the Excel template</a>
        </div>

        {error && (
          <div role="alert" className="mt-4 border border-o-decline border-l-8 bg-sheet p-4">
            <p className="font-semibold">That file didn’t load.</p>
            <p>{error}</p>
            <p className="mt-1 text-sm text-soft">Try again with another file, or use the sample data.</p>
          </div>
        )}
        <p className="mt-6 max-w-[62ch] text-sm text-soft">
          Your file is read in this browser. If cloud storage is available, a copy is also saved so you can share a link to it. Decisions come from fixed rules, not from an AI model.
        </p>
      </div>

      <aside aria-labelledby="meaning">
        <h2 id="meaning" className="border-b border-ink pb-2 text-xl font-semibold">What the five outcomes mean</h2>
        <ul>
          {MEANING.map(([o, text]) => (
            <li key={o} className="flex gap-3 border-b border-rule py-3">
              <Mark o={o} size={28} />
              <div>
                <p className="font-semibold">{o}</p>
                <p className="max-w-[44ch] text-soft">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
