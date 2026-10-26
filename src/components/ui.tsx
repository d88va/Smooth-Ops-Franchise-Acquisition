import type { Outcome } from '../engine';

/** Okabe-Ito hues. Colour is never the only cue: every outcome also has its own shape and glyph. */
export const OUTCOME_COLOR: Record<Outcome, string> = {
  Approved: '#009E73',
  Hold: '#E69F00',
  Waitlist: '#0072B2',
  Redirect: '#CC79A7',
  Decline: '#D55E00',
};
const GLYPH: Record<Outcome, string> = { Approved: '#fff', Hold: '#17263A', Waitlist: '#fff', Redirect: '#17263A', Decline: '#fff' };
export const SHAPE_NAME: Record<Outcome, string> = { Approved: 'circle with a tick', Hold: 'square with two bars', Waitlist: 'triangle', Redirect: 'diamond with an arrow', Decline: 'octagon with a cross' };
export const PRIORITY_COLOR = { High: '#17263A', Medium: '#3F5F80', Low: '#6B7F93' } as const;

/** Marker drawn in a 20-unit box centred on (0,0). Reused inside the map and inline in text. */
export function MarkShape({ o, x = 0, y = 0, size = 20, outline = '#17263A' }: { o: Outcome; x?: number; y?: number; size?: number; outline?: string }) {
  const c = OUTCOME_COLOR[o];
  const g = GLYPH[o];
  const body =
    o === 'Approved' ? <circle r={9} fill={c} stroke={outline} strokeWidth={1.4} /> :
    o === 'Hold' ? <rect x={-8.5} y={-8.5} width={17} height={17} fill={c} stroke={outline} strokeWidth={1.4} /> :
    o === 'Waitlist' ? <polygon points="0,-10 10,8 -10,8" fill={c} stroke={outline} strokeWidth={1.4} strokeLinejoin="round" /> :
    o === 'Redirect' ? <polygon points="0,-10.5 10.5,0 0,10.5 -10.5,0" fill={c} stroke={outline} strokeWidth={1.4} /> :
    <polygon points="-3.9,-9.4 3.9,-9.4 9.4,-3.9 9.4,3.9 3.9,9.4 -3.9,9.4 -9.4,3.9 -9.4,-3.9" fill={c} stroke={outline} strokeWidth={1.4} />;
  const glyph =
    o === 'Approved' ? <path d="M-4 0.5 L-1 3.5 L4.5 -3" fill="none" stroke={g} strokeWidth={2} /> :
    o === 'Hold' ? <path d="M-2.5 -4 V4 M2.5 -4 V4" stroke={g} strokeWidth={2} /> :
    o === 'Waitlist' ? <path d="M-3.5 5 H3.5 M-2.2 1.6 H2.2" stroke={g} strokeWidth={1.6} /> :
    o === 'Redirect' ? <path d="M-5 0 H4 M0.8 -3.6 L4.4 0 L0.8 3.6" fill="none" stroke={g} strokeWidth={1.8} /> :
    <path d="M-3.4 -3.4 L3.4 3.4 M3.4 -3.4 L-3.4 3.4" stroke={g} strokeWidth={2} />;
  return <g transform={`translate(${x} ${y}) scale(${size / 20})`}>{body}{glyph}</g>;
}

export function Mark({ o, size = 16 }: { o: Outcome; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-11 -11 22 22" aria-hidden="true" className="shrink-0">
      <MarkShape o={o} />
    </svg>
  );
}

/** Calendar date for "N weeks from today" (display only; the engine itself never reads the clock). */
export function weekDate(w: number | undefined): string {
  if (w === undefined) return '';
  const d = new Date();
  d.setDate(d.getDate() + Math.round(w * 7));
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Badge({ o, small }: { o: Outcome; small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-medium ${small ? 'text-xs' : 'text-sm'}`}>
      <Mark o={o} size={small ? 14 : 18} />
      {o}
    </span>
  );
}

/** A ruled block: a hairline on top and a plain heading. No card, no shadow. */
export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`border-t border-ink pt-3 ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h3 className="text-lg font-semibold leading-tight">{children}</h3>
      {right}
    </div>
  );
}

export const btn = 'border border-ink px-3 py-1.5 text-sm font-medium hover:bg-ink hover:text-paper disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink';
export const btnPrimary = 'border border-ink bg-ink px-3 py-1.5 text-sm font-medium text-paper hover:bg-contour disabled:opacity-40';
export const field = 'border border-ink bg-sheet px-2 py-1.5 text-sm';
