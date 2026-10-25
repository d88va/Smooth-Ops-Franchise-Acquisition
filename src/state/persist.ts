import type { Dataset } from '../engine';

/** Best-effort cloud copy of an upload. The app never depends on it: every failure resolves to null. */
async function timed(input: string, init: RequestInit | undefined, ms: number): Promise<Response | null> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function saveUpload(dataset: Dataset, fileName: string): Promise<string | null> {
  const r = await timed('/api/uploads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName, dataset }) }, 15000);
  if (!r || !r.ok) return null;
  try {
    const j = (await r.json()) as { id?: string };
    return j.id ?? null;
  } catch {
    return null;
  }
}

export async function loadShared(id: string): Promise<{ dataset: Dataset; fileName: string } | null> {
  const r = await timed(`/api/uploads?id=${encodeURIComponent(id)}`, undefined, 15000);
  if (!r || !r.ok) return null;
  try {
    return (await r.json()) as { dataset: Dataset; fileName: string };
  } catch {
    return null;
  }
}
