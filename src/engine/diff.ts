import type { Dataset, EngineResult, Outcome } from './types';

export interface Change {
  id: string;
  from: Outcome;
  to: Outcome;
  primary: string;
  knockOn: string | null;
  subject: boolean;
  scoreFrom: number;
  scoreTo: number;
}
export interface Diff {
  changes: Change[];
  unchanged: number;
}

/** Compare two engine results. `subjects` are the ids the user directly changed. */
export function diffResults(before: EngineResult, after: EngineResult, dsAfter: Dataset, subjects: string[] = [], note = ''): Diff {
  const changes: Change[] = [];
  const holderAfter = new Map<string, string>();
  for (const id of after.order) {
    const d = after.decisions[id];
    if (d.outcome === 'Approved' && d.assignedPin) holderAfter.set(d.assignedPin, id);
  }
  for (const id of after.order) {
    const b = before.decisions[id];
    const a = after.decisions[id];
    if (!b || !a) continue;
    const moved = b.outcome !== a.outcome || b.assignedPin !== a.assignedPin || b.redirect?.pin !== a.redirect?.pin;
    if (!moved) continue;
    const subject = subjects.includes(id);
    let primary = '';
    let knock: string | null = null;
    if (subject) {
      primary = `${note ? note + '. ' : ''}${a.headline}. ${a.reasons[0] ?? ''}`.trim();
    } else {
      primary = a.reasons[0] ?? a.headline;
    }
    // knock-on explanation
    if (b.outcome === 'Approved' && a.outcome !== 'Approved') {
      const rival = b.assignedPin ? holderAfter.get(b.assignedPin) : undefined;
      if (rival && rival !== id) {
        knock = `${rival} now outranks ${id} for pin ${b.assignedPin} (score ${after.decisions[rival].score} vs ${a.score}), so ${id} moves from Approved to ${a.outcome}${a.redirect ? ` with a suggested pin ${a.redirect.pin}` : a.waitlistPos ? ` at position #${a.waitlistPos}` : ''}.`;
      } else {
        knock = `${id} lost its seat in ${b.territoryId}${a.lostTo ? ` to ${a.lostTo.id}` : ''}.`;
      }
    } else if (a.outcome === 'Approved' && b.outcome !== 'Approved') {
      const freed = before.order.filter((o) => before.decisions[o].outcome === 'Approved' && after.decisions[o].outcome !== 'Approved' && before.decisions[o].territoryId === a.territoryId);
      if (subject) knock = freed.length ? `Takes the seat that ${freed.join(', ')} held in ${a.territoryId}.` : `Gets a seat in ${a.territoryId} (pin ${a.assignedPin}).`;
      else knock = freed.length ? `${freed.join(', ')} left ${a.territoryId}, which frees a slot, so ${id} moves up from ${b.outcome} to Approved.` : `Pin ${a.assignedPin} / a slot in ${a.territoryId} became available, so ${id} moves up.`;
    } else if (!subject) {
      knock = `Ripple from changes in ${a.territoryId ?? 'its territory'}: ${before.order.filter((o) => before.decisions[o].outcome !== after.decisions[o].outcome && o !== id).slice(0, 3).join(', ') || 'another applicant'} shifted.`;
    }
    changes.push({ id, from: b.outcome, to: a.outcome, primary, knockOn: knock, subject, scoreFrom: b.score, scoreTo: a.score });
  }
  void dsAfter;
  changes.sort((x, y) => Number(y.subject) - Number(x.subject) || x.id.localeCompare(y.id, undefined, { numeric: true }));
  return { changes, unchanged: after.order.length - changes.length };
}
