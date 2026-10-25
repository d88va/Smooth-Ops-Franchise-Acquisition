import { useState } from 'react';
import { EXAMPLES } from '../query/parse';
import { ask, select, useStore } from '../state/store';

export function QueryBar() {
  const [q, setQ] = useState('');
  const answer = useStore((s) => s.answer);
  const submit = (text: string) => {
    if (!text.trim()) return;
    ask(text);
    setQ('');
  };
  const tone = answer?.tone === 'ok' ? '#3ddc97' : answer?.tone === 'warn' ? '#f5b942' : '#5aa9ff';
  return (
    <div className="space-y-2">
      <form onSubmit={(e) => { e.preventDefault(); submit(q); }} className="flex items-center gap-2 rounded-xl border border-ink-500 bg-ink-850 px-3 py-2 shadow-lg focus-within:border-amber-brand/70">
        <span className="font-display text-amber-brand">›</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Ask or update in plain language: "Why is APP-007 on hold?"  ·  "APP-012 found a ground-floor space"'
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
          aria-label="Ask a question or enter new information about an applicant"
        />
        <button className="rounded-lg bg-amber-brand px-3 py-1.5 text-xs font-semibold text-ink-950 hover:brightness-110">Run</button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => submit(e)} className="rounded-full border border-ink-600 bg-ink-800/70 px-2.5 py-1 text-[11px] text-slate-300 hover:border-amber-brand/60 hover:text-white">
            {e}
          </button>
        ))}
        <button onClick={() => submit('undo')} className="rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white">undo</button>
        <button onClick={() => submit('reset')} className="rounded-full border border-ink-600 px-2.5 py-1 text-[11px] text-slate-400 hover:text-white">reset</button>
      </div>
      {answer && (
        <div className="fade-in rounded-xl border bg-ink-850/90 p-3 text-sm" style={{ borderColor: tone + '66' }}>
          <div className="mb-1 flex items-start justify-between gap-2">
            <div className="font-display text-[13px] font-semibold" style={{ color: tone }}>{answer.title}</div>
            {answer.focusId && <button onClick={() => select(answer.focusId as string)} className="shrink-0 text-[11px] text-slate-400 underline hover:text-white">open {answer.focusId}</button>}
          </div>
          <div className="space-y-1 text-[13px] leading-snug text-slate-300">
            {answer.lines.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      )}
    </div>
  );
}
