import { CITIES, matchCity } from '../data/cityGeo';
import type { AppPatch, Dataset, Outcome } from '../engine/types';
import { toFloor } from '../engine/parse';

export type Intent =
  | { kind: 'explain'; id: string }
  | { kind: 'counterfactual'; id: string }
  | { kind: 'update'; id: string; patch: AppPatch; summary: string }
  | { kind: 'territory'; id: string; slots?: number; delta?: number; close?: boolean; summary: string }
  | { kind: 'list'; outcome?: Outcome; city?: string; territory?: string }
  | { kind: 'compare' }
  | { kind: 'reset' }
  | { kind: 'undo' }
  | { kind: 'clarify'; message: string; id?: string }
  | { kind: 'unknown' };

export const EXAMPLES = [
  'Why is APP-007 on hold?',
  'APP-012 found a ground-floor space',
  'What would it take for APP-005 to be approved?',
  'Who is on the waitlist in Mysuru?',
  'TER-04 now has 1 more slot',
  'APP-005 now has ₹42 lakh',
];

/** "app 7", "APP-7", "app007" → APP-007 (matched against real ids when possible). */
export function resolveAppId(text: string, ds: Dataset): string | null {
  const m = text.match(/\b(?:app(?:lication)?|applicant)[\s\-_#:]*0*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const hit = ds.applications.find((a) => {
    const mm = a.id.match(/(\d+)/);
    return mm && parseInt(mm[1], 10) === n;
  });
  return hit?.id ?? `APP-${String(n).padStart(3, '0')}`;
}
export function resolveTerId(text: string, ds: Dataset): string | null {
  const m = text.match(/\b(?:ter(?:ritory)?)[\s\-_#:]*0*(\d+)\b/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const hit = ds.territories.find((t) => {
    const mm = t.id.match(/(\d+)/);
    return mm && parseInt(mm[1], 10) === n;
  });
  return hit?.id ?? `TER-${String(n).padStart(2, '0')}`;
}

export function extractPatch(text: string): { patch: AppPatch; bits: string[]; needsSize: boolean } {
  const t = text.toLowerCase();
  const patch: AppPatch = {};
  const bits: string[] = [];
  let needsSize = false;

  // space status
  const found = /(found|identified|secured|got|has|have|signed|finalis|finaliz|now has|now have|owns?|rented|renting|leased|bought|purchased)/.test(t);
  const spaceWord = /(space|shop|store|unit|property|premises|showroom|outlet|building|stall|place)/.test(t);
  if (/\bowns?\b|\bowned\b|own (a|the)|bought|purchased/.test(t) && spaceWord) {
    patch.space = 'Owned';
    bits.push('space Owned');
  } else if (/rent(ed|ing|s)?\b|lease|leased/.test(t) || (found && spaceWord && !/not yet|no space|lost|fell through|cancel/.test(t))) {
    if (!/not yet|no space|lost|fell through|cancel/.test(t)) {
      patch.space = 'Rented';
      bits.push('space Rented');
    }
  }
  if (/lost (the )?(space|shop)|space fell through|no space|not yet identified|cancel(l)?ed (the )?(lease|space)/.test(t)) {
    patch.space = 'Not yet identified';
    bits.push('space Not yet identified');
  }

  // floor
  const fl = t.match(/ground[\s-]*floor|\bgf\b|\bground\b|mall(?: unit| shop)?|upper[\s-]*floor|\bupper\b|first[\s-]*floor|1st[\s-]*floor|second[\s-]*floor/);
  if (fl) {
    const f = toFloor(fl[0].replace(/-/g, ' '));
    if (f) {
      patch.floor = f;
      bits.push(`${f} floor`);
    }
  }

  // size
  const sz = t.match(/(\d[\d,]*)\s*(?:sq\.?\s*ft|sqft|sq\.? feet|square (?:feet|foot)|sft)/);
  if (sz) {
    patch.size = parseInt(sz[1].replace(/,/g, ''), 10);
    bits.push(`${patch.size} sq ft`);
  }

  // investment
  const inv = t.match(/(?:₹|rs\.?\s*|inr\s*)\s*(\d+(?:\.\d+)?)\s*(?:l\b|lakhs?|lacs?|lac|cr|crores?)?|(\d+(?:\.\d+)?)\s*(lakhs?|lacs?|\blac\b|l\b|crores?|cr\b)/);
  if (inv) {
    const raw = inv[1] ?? inv[2];
    let v = parseFloat(raw);
    if (/cr/.test(inv[0])) v *= 100;
    patch.investment = v;
    bits.push(`investment ₹${v} lakh`);
  }

  // launch
  const ln = t.match(/(?:launch|open|start)[^\d]{0,25}(\d+)\s*(?:months?|mos?\b)|(\d+)\s*months?\s*(?:to\s+)?(?:launch|open)/);
  if (ln) {
    patch.launchMonths = parseInt(ln[1] ?? ln[2], 10);
    bits.push(`launch in ${patch.launchMonths} months`);
  }

  // pin
  const pm = t.match(/\bpin(?:\s*code)?\s*(\d{6})\b|(?:moved|moving|shift\w*|relocat\w*)\s+to\s+(\d{6})\b/);
  if (pm) {
    patch.pin = pm[1] ?? pm[2];
    bits.push(`pin ${patch.pin}`);
    const c = matchCity(t);
    if (c) {
      patch.city = c.name;
      bits.push(`city ${c.name}`);
    }
  }

  // experience / language
  const ex = t.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:retail\s*)?experience|experience\s*(?:of|is)?\s*(\d+)/);
  if (ex) {
    patch.experience = parseInt(ex[1] ?? ex[2], 10);
    bits.push(`${patch.experience} yrs experience`);
  }
  const lg = t.match(/\b(kannada|hindi|english)\b/);
  if (lg && /prefer|speaks?|language|wants? (it )?in|switch/.test(t)) {
    patch.language = (lg[1][0].toUpperCase() + lg[1].slice(1)) as AppPatch['language'];
    bits.push(`language ${patch.language}`);
  }

  // "found a ground-floor space" with size missing is handled by the caller (needs existing size)
  if (patch.space && patch.space !== 'Not yet identified' && patch.size === undefined) needsSize = true;
  return { patch, bits, needsSize };
}

const OUTCOME_WORDS: [RegExp, Outcome][] = [
  [/approved|approve\b|accepted/, 'Approved'],
  [/\bhold\b|on hold|held/, 'Hold'],
  [/waitlist|wait list|waiting/, 'Waitlist'],
  [/redirect/, 'Redirect'],
  [/declin|reject/, 'Decline'],
];

export function parseQuery(raw: string, ds: Dataset): Intent {
  const text = raw.trim();
  const t = text.toLowerCase();
  if (!t) return { kind: 'unknown' };
  if (/^(undo|revert|go back|step back)\b|undo (that|last)/.test(t)) return { kind: 'undo' };
  if (/\b(reset|start over|clear (all|scenario)|back to (baseline|original))\b/.test(t)) return { kind: 'reset' };
  if (/\bcompare\b|before and after|before\/after|before vs after|what changed/.test(t) && !resolveAppId(t, ds)) return { kind: 'compare' };

  const id = resolveAppId(text, ds);
  const ter = resolveTerId(text, ds);

  if (id && /what would it take|what (do|does|will) .* take|how (can|could|do|would)|what (is|are) (needed|required)|flip|what if .* approved|to be approved|get approved|make .* approved/.test(t) && !extractPatchHasChange(t)) {
    return { kind: 'counterfactual', id };
  }

  // territory edits
  if (ter && !id) {
    if (/\bclose(d)?\b|no more slots|shut|freeze/.test(t)) return { kind: 'territory', id: ter, slots: 0, close: true, summary: `${ter} closed (0 slots)` };
    const more = t.match(/(\d+)\s*(?:more|extra|additional)\s*slots?|(?:add|open)\s*(\d+)?\s*(?:more\s*)?slots?/);
    if (more) {
      const n = parseInt(more[1] ?? more[2] ?? '1', 10);
      return { kind: 'territory', id: ter, delta: n, summary: `${ter} +${n} slot${n > 1 ? 's' : ''}` };
    }
    const less = t.match(/(\d+)\s*(?:fewer|less)\s*slots?|remove\s*(\d+)?\s*slots?/);
    if (less) {
      const n = parseInt(less[1] ?? less[2] ?? '1', 10);
      return { kind: 'territory', id: ter, delta: -n, summary: `${ter} −${n} slot${n > 1 ? 's' : ''}` };
    }
    const abs = t.match(/(?:has|have|now|to|set to|=)\s*(\d+)\s*slots?|(\d+)\s*slots?\s*(?:open|now|left)/);
    if (abs) {
      const n = parseInt(abs[1] ?? abs[2], 10);
      return { kind: 'territory', id: ter, slots: n, summary: `${ter} set to ${n} slot${n === 1 ? '' : 's'}` };
    }
    if (/reopen/.test(t)) return { kind: 'territory', id: ter, delta: 1, summary: `${ter} reopened (+1 slot)` };
    return { kind: 'list', territory: ter };
  }

  // application updates
  if (id) {
    const { patch, bits, needsSize } = extractPatch(text);
    const asksWhy = /\bwhy\b|explain|reason|what('s| is) (happening|going on|the status)|status of|tell me about/.test(t);
    if (!asksWhy && bits.length) {
      if (needsSize) {
        const a = ds.applications.find((x) => x.id === id);
        const have = patch.size ?? a?.size ?? null;
        if (have === null) {
          return { kind: 'clarify', id, message: `Got it: ${id} has found a space${patch.floor ? ` (${patch.floor} floor)` : ''}. What is the size in sq ft${patch.space ? '' : ', and is it owned or rented'}? For example: "${id} found a ${patch.floor === 'Ground' ? 'ground-floor' : 'rented'} space of 300 sq ft".` };
        }
        if (patch.size === undefined) {
          // reuse the size already on the form
          patch.size = have;
        }
      }
      if (patch.space && patch.space !== 'Not yet identified' && patch.floor === undefined) {
        const a = ds.applications.find((x) => x.id === id);
        if (!a?.floor || a.floor === 'Not known') {
          /* floor unknown stays unknown: engine will add a "confirm floor" condition */
        }
      }
      return { kind: 'update', id, patch, summary: `${id}: ${bits.join(', ')}` };
    }
    if (/what would it take|how (can|could)|to be approved/.test(t)) return { kind: 'counterfactual', id };
    return { kind: 'explain', id };
  }

  // list / filter
  const outcome = OUTCOME_WORDS.find(([re]) => re.test(t))?.[1];
  const city = matchCity(t)?.name ?? CITIES.find((c) => t.includes(c.name.toLowerCase()))?.name;
  if (/\b(who|which|show|list|find|how many|filter|all)\b/.test(t) && (outcome || city || ter)) {
    return { kind: 'list', outcome, city, territory: ter ?? undefined };
  }
  if (outcome || city) return { kind: 'list', outcome, city };
  return { kind: 'unknown' };
}

function extractPatchHasChange(t: string): boolean {
  return /found|now has|₹|lakh|sq ?ft|moved to|launch in|rented|owns/.test(t) && !/what would it take|how (can|could)/.test(t);
}
