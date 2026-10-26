import { useState } from 'react';
import { EXAMPLES } from '../query/parse';
import { ask, getState, select, setCompare, useStore } from '../state/store';
import { btnPrimary } from './ui';

export function QueryBar() {
  const [q, setQ] = useState('');
  const submit = (text: string) => {
    if (!text.trim()) return;
    const logBefore = getState().log.length;
    ask(text);
    const s = getState();
    // A new fact that moved at least one decision opens the before/after view straight away.
    if (s.log.length > logBefore && s.diff && s.diff.changes.length > 0 && s.log[s.log.length - 1].kind !== 'undo') setCompare(true);
    setQ('');
  };
  return (
    <div>
      <form onSubmit={(e) => { e.preventDefault(); submit(q); }}>
        <label htmlFor="ask" className="block text-lg font-semibold">Ask a question or add a new fact</label>
        <div className="mt-1 flex gap-2">
          <input
            id="ask"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Why is APP-007 on hold?"
            className="min-w-0 flex-1 border border-ink bg-sheet px-3 py-2 text-base placeholder:text-soft"
            autoComplete="off"
          />
          <button className={btnPrimary + ' px-5 text-base'}>Ask</button>
        </div>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-soft">Try:</span>
        {EXAMPLES.map((e) => (
          <button key={e} onClick={() => submit(e)} className="underline underline-offset-2 hover:bg-ink hover:text-paper">{e}</button>
        ))}
        <span className="text-soft">or</span>
        <button onClick={() => submit('undo')} className="underline underline-offset-2 hover:bg-ink hover:text-paper">undo the last change</button>
        <button onClick={() => submit('reset')} className="underline underline-offset-2 hover:bg-ink hover:text-paper">go back to the uploaded file</button>
      </div>
    </div>
  );
}

export function QueryAnswer() {
  const answer = useStore((s) => s.answer);
  if (!answer) return null;
  return (
        <div role="status" className="border border-ink border-l-8 bg-sheet p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold leading-snug">{answer.title}</p>
            {answer.focusId && <button onClick={() => select(answer.focusId as string)} className="shrink-0 text-sm underline underline-offset-2">Show {answer.focusId}</button>}
          </div>
          <div className="mt-1 max-w-[75ch] space-y-1">
            {answer.lines.map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
  );
}
